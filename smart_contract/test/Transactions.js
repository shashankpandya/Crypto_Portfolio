const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Transactions Contract", function () {
  let transactions;
  let owner;
  let addr1;
  let addr2;
  const initialSupply = ethers.utils.parseEther("1000");

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    addr1 = signers[1];
    addr2 = signers[2];
    const Transactions = await ethers.getContractFactory("Transactions");
    transactions = await Transactions.deploy(initialSupply);
    await transactions.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right initial supply", async function () {
      expect(await transactions.totalSupply()).to.equal(initialSupply);
    });

    it("Should assign the total supply to the owner", async function () {
      expect(await transactions.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("Should set the initial fee to 1%", async function () {
      expect(await transactions.feePercentage()).to.equal(100);
    });
  });

  describe("Transactions and Fees", function () {
    it("Should transfer tokens, deduct fee, and record transaction with metadata", async function () {
      const amount = ethers.utils.parseEther("100");
      const message = "Fee test";
      const category = "Business";
      const tags = ["test", "fee"];
      
      await transactions.transfer(addr1.address, amount);
      const ownerBalanceAfterFirstTransfer = await transactions.balanceOf(owner.address);
      
      const tx = await transactions.connect(addr1).addToBlockchain(addr2.address, amount, message, category, tags);
      await tx.wait();

      const fee = amount.mul(100).div(10000);
      const amountToSend = amount.sub(fee);

      expect(await transactions.balanceOf(addr1.address)).to.equal(0);
      expect(await transactions.balanceOf(addr2.address)).to.equal(amountToSend);
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceAfterFirstTransfer.add(fee));

      const allTransactions = await transactions.getAllTransactions();
      expect(allTransactions.length).to.equal(1);
      expect(allTransactions[0].amount).to.equal(amount);
      expect(allTransactions[0].category).to.equal(category);
      expect(allTransactions[0].tags).to.deep.equal(tags);
    });

    it("Should perform batch transfers and collect fees", async function () {
      const amount1 = ethers.utils.parseEther("100");
      const amount2 = ethers.utils.parseEther("200");
      const totalAmount = amount1.add(amount2);
      const message = "Batch test";
      const category = "Batch";
      const tags = ["batch", "multi"];

      await transactions.transfer(addr1.address, totalAmount);
      const ownerBalanceBefore = await transactions.balanceOf(owner.address);

      const tx = await transactions.connect(addr1).addToBlockchainBatch(
        [owner.address, addr2.address],
        [amount1, amount2],
        message,
        category,
        tags
      );
      await tx.wait();

      const fee1 = amount1.mul(100).div(10000);
      const fee2 = amount2.mul(100).div(10000);
      const totalFees = fee1.add(fee2);

      // addr1: totalAmount - amount1 - amount2 = 0
      // owner: ownerBalanceBefore + amount1(net) + fee1 + fee2
      // amount1(net) = amount1 - fee1
      // owner: ownerBalanceBefore + amount1 - fee1 + fee1 + fee2 = ownerBalanceBefore + amount1 + fee2
      expect(await transactions.balanceOf(addr1.address)).to.equal(0);
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceBefore.add(amount1).add(fee2));
      expect(await transactions.balanceOf(addr2.address)).to.equal(amount2.sub(fee2));

      const allTransactions = await transactions.getAllTransactions();
      expect(allTransactions.length).to.equal(2);
      expect(allTransactions[0].receiver).to.equal(owner.address);
      expect(allTransactions[1].receiver).to.equal(addr2.address);
    });

    it("Should allow owner to change fee and apply new fee", async function () {
      const newFee = 500; // 5%
      await transactions.setFeePercentage(newFee);
      expect(await transactions.feePercentage()).to.equal(newFee);

      const amount = ethers.utils.parseEther("100");
      await transactions.transfer(addr1.address, amount);
      const ownerBalanceBefore = await transactions.balanceOf(owner.address);

      await transactions.connect(addr1).addToBlockchain(addr2.address, amount, "5% fee", "", []);
      
      const expectedFee = amount.mul(500).div(10000);
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceBefore.add(expectedFee));
    });

    it("Should fail if non-owner tries to change fee", async function () {
      await expect(
        transactions.connect(addr1).setFeePercentage(200)
      ).to.be.reverted;
    });

    it("Should fail if fee exceeds 10%", async function () {
      await expect(
        transactions.setFeePercentage(1001)
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });
  });
});
