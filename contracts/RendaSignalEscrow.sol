// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Signal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Two-stage escrow for requests targeted at an externally verified identity.
/// @dev The identity signer attests that a Polygon wallet controls the requested X user id.
contract RendaSignalEscrow {
    enum Status { None, Funded, Accepted, Submitted, Disputed, Settled, Refunded }
    struct Request {
        address employer;
        address employee;
        address arbitrator;
        uint256 total;
        uint256 attentionFee;
        uint64 acceptBy;
        uint64 deliverBy;
        bytes32 targetIdentity;
        bytes32 termsHash;
        bytes32 evidenceHash;
        Status status;
    }
    IERC20Signal public immutable token;
    address public immutable identitySigner;
    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) public requests;
    mapping(uint256 => address) public cancellationRequester;
    mapping(bytes32 => bool) public usedAuthorizations;
    uint256 private unlocked = 1;

    event RequestFunded(uint256 indexed id, address indexed employer, bytes32 indexed targetIdentity, uint256 total);
    event RequestAccepted(uint256 indexed id, address indexed employee, uint256 attentionFee);
    event EvidenceSubmitted(uint256 indexed id, bytes32 evidenceHash);
    event DisputeOpened(uint256 indexed id);
    event CancellationRequested(uint256 indexed id, address indexed requester);
    event RequestSettled(uint256 indexed id, uint256 employerAmount, uint256 employeeAmount);

    modifier onlyEmployer(uint256 id) { require(msg.sender == requests[id].employer, "not employer"); _; }
    modifier onlyEmployee(uint256 id) { require(msg.sender == requests[id].employee, "not employee"); _; }
    modifier nonReentrant() { require(unlocked == 1, "reentrant"); unlocked = 2; _; unlocked = 1; }

    constructor(address token_, address identitySigner_) {
        require(token_ != address(0) && identitySigner_ != address(0), "zero address");
        token = IERC20Signal(token_);
        identitySigner = identitySigner_;
    }

    function fundRequest(bytes32 targetIdentity, bytes32 termsHash, uint256 total, uint256 attentionFee, uint64 acceptBy, uint64 deliverBy, address arbitrator) external nonReentrant returns (uint256 id) {
        require(targetIdentity != bytes32(0) && termsHash != bytes32(0), "missing terms");
        require(total > 0 && attentionFee <= total, "bad amount");
        require(block.timestamp < acceptBy && acceptBy < deliverBy, "bad deadline");
        require(arbitrator != address(0), "no arbitrator");
        id = nextRequestId++;
        requests[id] = Request(msg.sender, address(0), arbitrator, total, attentionFee, acceptBy, deliverBy, targetIdentity, termsHash, bytes32(0), Status.Funded);
        _safeTransferFrom(msg.sender, address(this), total);
        emit RequestFunded(id, msg.sender, targetIdentity, total);
    }

    function acceptRequest(uint256 id, uint64 authorizationExpiry, bytes32 nonce, bytes calldata signature) external nonReentrant {
        Request storage item = requests[id];
        require(item.status == Status.Funded && block.timestamp <= item.acceptBy, "not open");
        require(block.timestamp <= authorizationExpiry, "authorization expired");
        bytes32 digest = keccak256(abi.encode(address(this), block.chainid, id, item.targetIdentity, msg.sender, authorizationExpiry, nonce));
        require(!usedAuthorizations[digest], "authorization used");
        require(_recover(_ethSigned(digest), signature) == identitySigner, "wrong identity");
        usedAuthorizations[digest] = true;
        item.employee = msg.sender;
        item.status = Status.Accepted;
        if (item.attentionFee > 0) _safeTransfer(msg.sender, item.attentionFee);
        emit RequestAccepted(id, msg.sender, item.attentionFee);
    }

    function submitEvidence(uint256 id, bytes32 evidenceHash) external onlyEmployee(id) {
        Request storage item = requests[id];
        require(item.status == Status.Accepted && evidenceHash != bytes32(0), "cannot submit");
        item.evidenceHash = evidenceHash;
        item.status = Status.Submitted;
        emit EvidenceSubmitted(id, evidenceHash);
    }

    function approve(uint256 id) external onlyEmployer(id) nonReentrant {
        Request storage item = requests[id];
        require(item.status == Status.Submitted, "not submitted");
        uint256 remaining = item.total - item.attentionFee;
        item.status = Status.Settled;
        delete cancellationRequester[id];
        _safeTransfer(item.employee, remaining);
        emit RequestSettled(id, 0, remaining);
    }

    function reclaimUnaccepted(uint256 id) external onlyEmployer(id) nonReentrant {
        Request storage item = requests[id];
        require(item.status == Status.Funded && block.timestamp > item.acceptBy, "not reclaimable");
        item.status = Status.Refunded;
        _safeTransfer(item.employer, item.total);
        emit RequestSettled(id, item.total, 0);
    }

    function openDispute(uint256 id) external {
        Request storage item = requests[id];
        require(msg.sender == item.employer || msg.sender == item.employee, "not a party");
        require(item.status == Status.Accepted || item.status == Status.Submitted, "cannot dispute");
        item.status = Status.Disputed;
        emit DisputeOpened(id);
    }

    /// @notice Ask the other party to cancel. Cancellation always refunds the employer.
    function requestCancellation(uint256 id) external {
        Request storage item = requests[id];
        require(msg.sender == item.employer || msg.sender == item.employee, "not a party");
        require(item.status == Status.Accepted || item.status == Status.Submitted, "closed");
        cancellationRequester[id] = msg.sender;
        emit CancellationRequested(id, msg.sender);
    }

    /// @notice The other party accepts a full refund of the remaining escrow.
    function acceptCancellation(uint256 id) external nonReentrant {
        Request storage item = requests[id];
        require(item.status == Status.Accepted || item.status == Status.Submitted, "request closed");
        address requester = cancellationRequester[id];
        require(requester != address(0) && requester != msg.sender, "bad acceptance");
        require(msg.sender == item.employer || msg.sender == item.employee, "not a party");
        _settle(id, item.total - item.attentionFee, 0);
    }

    function arbitrate(uint256 id, uint256 employerAmount, uint256 employeeAmount) external nonReentrant {
        Request storage item = requests[id];
        require(msg.sender == item.arbitrator && item.status == Status.Disputed, "not arbitrator");
        require(employerAmount + employeeAmount == item.total - item.attentionFee, "bad split");
        _settle(id, employerAmount, employeeAmount);
    }

    function _settle(uint256 id, uint256 employerAmount, uint256 employeeAmount) internal {
        Request storage item = requests[id];
        require(item.status == Status.Accepted || item.status == Status.Submitted || item.status == Status.Disputed, "request closed");
        require(employerAmount + employeeAmount == item.total - item.attentionFee, "bad split");
        item.status = Status.Settled;
        delete cancellationRequester[id];
        if (employerAmount > 0) _safeTransfer(item.employer, employerAmount);
        if (employeeAmount > 0) _safeTransfer(item.employee, employeeAmount);
        emit RequestSettled(id, employerAmount, employeeAmount);
    }

    function _ethSigned(bytes32 digest) private pure returns (bytes32) { return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)); }
    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        require(signature.length == 65, "bad signature");
        bytes32 r; bytes32 s; uint8 v;
        assembly { r := calldataload(signature.offset) s := calldataload(add(signature.offset, 32)) v := byte(0, calldataload(add(signature.offset, 64))) }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "bad v");
        return ecrecover(digest, v, r, s);
    }
    function _safeTransfer(address to, uint256 amount) private { (bool ok, bytes memory data)=address(token).call(abi.encodeWithSelector(token.transfer.selector,to,amount)); require(ok&&(data.length==0||abi.decode(data,(bool))),"token transfer failed"); }
    function _safeTransferFrom(address from,address to,uint256 amount) private { (bool ok, bytes memory data)=address(token).call(abi.encodeWithSelector(token.transferFrom.selector,from,to,amount)); require(ok&&(data.length==0||abi.decode(data,(bool))),"token transferFrom failed"); }
}
