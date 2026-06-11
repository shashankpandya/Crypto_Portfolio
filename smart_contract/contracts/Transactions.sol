// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Transactions is ERC20, Ownable {
    event TransactionAdded(
        address from, 
        address receiver, 
        uint amount, 
        string message, 
        string category,
        string[] tags,
        uint256 timestamp
    );

    struct TransferStruct {
        address sender;
        address receiver;
        uint amount;
        string message;
        string category;
        string[] tags;
        uint256 timestamp;
    }

    TransferStruct[] private transactions;
    uint256 public feePercentage = 100; // 1% = 100 basis points

    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    function setFeePercentage(uint256 _feePercentage) public onlyOwner {
        require(_feePercentage <= 1000, "Fee cannot exceed 10%");
        feePercentage = _feePercentage;
    }

    function _processTransaction(
        address receiver, 
        uint256 amount, 
        string memory message,
        string memory category,
        string[] memory tags
    ) private {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        uint256 fee = (amount * feePercentage) / 10000;
        uint256 amountToSend = amount - fee;

        _transfer(msg.sender, receiver, amountToSend);
        if (fee > 0) {
            _transfer(msg.sender, owner(), fee);
        }

        transactions.push(TransferStruct(msg.sender, receiver, amount, message, category, tags, block.timestamp));
        emit TransactionAdded(msg.sender, receiver, amount, message, category, tags, block.timestamp);
    }

    function addToBlockchain(
        address receiver, 
        uint256 amount, 
        string memory message,
        string memory category,
        string[] memory tags
    ) public {
        _processTransaction(receiver, amount, message, category, tags);
    }

    function addToBlockchainBatch(
        address[] memory receivers,
        uint256[] memory amounts,
        string memory message,
        string memory category,
        string[] memory tags
    ) public {
        require(receivers.length == amounts.length, "Arrays length mismatch");
        for (uint256 i = 0; i < receivers.length; i++) {
            _processTransaction(receivers[i], amounts[i], message, category, tags);
        }
    }

    function getAllTransactions() public view returns (TransferStruct[] memory) {
        return transactions;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }
}
