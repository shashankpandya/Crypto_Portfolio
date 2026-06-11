const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

module.exports = buildModule("TransactionsModule", (m) => {
  // Default initial supply: 1,000,000 tokens with 18 decimals
  const initialSupply = m.getParameter("initialSupply", ethers.utils.parseEther("1000000").toString());

  const transactions = m.contract("Transactions", [initialSupply]);

  return { transactions };
});
