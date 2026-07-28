// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Faucet token for Polygon Amoy demonstrations. It has no monetary value.
contract TestUSDT {
    string public constant name="Renda Test USDT";
    string public constant symbol="tUSDT";
    uint8 public constant decimals=6;
    uint256 public totalSupply;
    mapping(address=>uint256) public balanceOf;
    mapping(address=>mapping(address=>uint256)) public allowance;
    event Transfer(address indexed from,address indexed to,uint256 value);
    event Approval(address indexed owner,address indexed spender,uint256 value);
    constructor(){uint256 initial=10_000*10**decimals;balanceOf[msg.sender]=initial;totalSupply=initial;emit Transfer(address(0),msg.sender,initial);}
    function mint(address to,uint256 amount) external { require(to!=address(0)&&amount<=10_000*10**decimals,"bad mint");balanceOf[to]+=amount;totalSupply+=amount;emit Transfer(address(0),to,amount); }
    function approve(address spender,uint256 amount) external returns(bool){allowance[msg.sender][spender]=amount;emit Approval(msg.sender,spender,amount);return true;}
    function transfer(address to,uint256 amount) external returns(bool){_transfer(msg.sender,to,amount);return true;}
    function transferFrom(address from,address to,uint256 amount) external returns(bool){uint256 allowed=allowance[from][msg.sender];require(allowed>=amount,"allowance");if(allowed!=type(uint256).max)allowance[from][msg.sender]=allowed-amount;_transfer(from,to,amount);return true;}
    function _transfer(address from,address to,uint256 amount) private {require(to!=address(0)&&balanceOf[from]>=amount,"balance");balanceOf[from]-=amount;balanceOf[to]+=amount;emit Transfer(from,to,amount);}
}
