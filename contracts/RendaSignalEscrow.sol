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
    struct Settlement { uint256 employerAmount; uint256 employeeAmount; address proposer; }

    IERC20Signal public immutable token;
    address public immutable identitySigner;
    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) public requests;
    mapping(uint256 => Settlement) public settlements;
    mapping(bytes32 => bool) public usedAuthorizations;

    event RequestFunded(uint256 indexed id, address indexed employer, bytes32 indexed targetIdentity, uint256 total);
    event RequestAccepted(uint256 indexed id, address indexed employee, uint256 attentionFee);
    event EvidenceSubmitted(uint256 indexed id, bytes32 evidenceHash);
    event DisputeOpened(uint256 indexed id);
    event SettlementProposed(uint256 indexed id, address indexed proposer, uint256 employerAmount, uint256 employeeAmount);
    event RequestSettled(uint256 indexed id, uint256 employerAmount, uint256 employeeAmount);

    modifier onlyEmployer(uint256 id) { require(msg.sender == requests[id].employer, "not employer"); _; }
    modifier onlyEmployee(uint256 id) { require(msg.sender == requests[id].employee, "not employee"); _; }

    constructor(address token_, address identitySigner_) {
        require(token_ != address(0) && identitySigner_ != address(0), "zero address");
        token = IERC20Signal(token_);
        identitySigner = identitySigner_;
    }

    function fundRequest(bytes32 targetIdentity, bytes32 termsHash, uint256 total, uint256 attentionFee, uint64 acceptBy, uint64 deliverBy, address arbitrator) external returns (uint256 id) {
        require(targetIdentity != bytes32(0) && termsHash != bytes32(0), "missing terms");
        require(total > 0 && attentionFee <= total, "bad amount");
        require(block.timestamp < acceptBy && acceptBy < deliverBy, "bad deadline");
        require(arbitrator != address(0), "no arbitrator");
        id = nextRequestId++;
        requests[id] = Request(msg.sender, address(0), arbitrator, total, attentionFee, acceptBy, deliverBy, targetIdentity, termsHash, bytes32(0), Status.Funded);
        require(token.transferFrom(msg.sender, address(this), total), "funding failed");
        emit RequestFunded(id, msg.sender, targetIdentity, total);
    }

    function acceptRequest(uint256 id, uint64 authorizationExpiry, bytes32 nonce, bytes calldata signature) external {
        Request storage item = requests[id];
        require(item.status == Status.Funded && block.timestamp <= item.acceptBy, "not open");
        require(block.timestamp <= authorizationExpiry, "authorization expired");
        bytes32 digest = keccak256(abi.encode(address(this), block.chainid, id, item.targetIdentity, msg.sender, authorizationExpiry, nonce));
        require(!usedAuthorizations[digest], "authorization used");
        require(_recover(_ethSigned(digest), signature) == identitySigner, "wrong identity");
        usedAuthorizations[digest] = true;
        item.employee = msg.sender;
        item.status = Status.Accepted;
        if (item.attentionFee > 0) require(token.transfer(msg.sender, item.attentionFee), "attention transfer failed");
        emit RequestAccepted(id, msg.sender, item.attentionFee);
    }

    function submitEvidence(uint256 id, bytes32 evidenceHash) external onlyEmployee(id) {
        Request storage item = requests[id];
        require(item.status == Status.Accepted && evidenceHash != bytes32(0), "cannot submit");
        item.evidenceHash = evidenceHash;
        item.status = Status.Submitted;
        emit EvidenceSubmitted(id, evidenceHash);
    }

    function approve(uint256 id) external onlyEmployer(id) {
        Request storage item = requests[id];
        require(item.status == Status.Submitted, "not submitted");
        uint256 remaining = item.total - item.attentionFee;
        item.status = Status.Settled;
        require(token.transfer(item.employee, remaining), "release failed");
        emit RequestSettled(id, 0, remaining);
    }

    function reclaimUnaccepted(uint256 id) external onlyEmployer(id) {
        Request storage item = requests[id];
        require(item.status == Status.Funded && block.timestamp > item.acceptBy, "not reclaimable");
        item.status = Status.Refunded;
        require(token.transfer(item.employer, item.total), "refund failed");
        emit RequestSettled(id, item.total, 0);
    }

    function openDispute(uint256 id) external {
        Request storage item = requests[id];
        require(msg.sender == item.employer || msg.sender == item.employee, "not a party");
        require(item.status == Status.Accepted || item.status == Status.Submitted, "cannot dispute");
        item.status = Status.Disputed;
        emit DisputeOpened(id);
    }

    function proposeSettlement(uint256 id, uint256 employerAmount, uint256 employeeAmount) external {
        Request storage item = requests[id];
        require(msg.sender == item.employer || msg.sender == item.employee, "not a party");
        require(item.status == Status.Accepted || item.status == Status.Submitted || item.status == Status.Disputed, "closed");
        require(employerAmount + employeeAmount == item.total - item.attentionFee, "bad split");
        settlements[id] = Settlement(employerAmount, employeeAmount, msg.sender);
        emit SettlementProposed(id, msg.sender, employerAmount, employeeAmount);
    }

    function acceptSettlement(uint256 id) external {
        Request storage item = requests[id];
        Settlement memory deal = settlements[id];
        require(deal.proposer != address(0) && deal.proposer != msg.sender, "bad acceptance");
        require(msg.sender == item.employer || msg.sender == item.employee, "not a party");
        _settle(id, deal.employerAmount, deal.employeeAmount);
    }

    function arbitrate(uint256 id, uint256 employerAmount, uint256 employeeAmount) external {
        Request storage item = requests[id];
        require(msg.sender == item.arbitrator && item.status == Status.Disputed, "not arbitrator");
        require(employerAmount + employeeAmount == item.total - item.attentionFee, "bad split");
        _settle(id, employerAmount, employeeAmount);
    }

    function _settle(uint256 id, uint256 employerAmount, uint256 employeeAmount) internal {
        Request storage item = requests[id];
        item.status = Status.Settled;
        delete settlements[id];
        if (employerAmount > 0) require(token.transfer(item.employer, employerAmount), "employer transfer failed");
        if (employeeAmount > 0) require(token.transfer(item.employee, employeeAmount), "employee transfer failed");
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
}
