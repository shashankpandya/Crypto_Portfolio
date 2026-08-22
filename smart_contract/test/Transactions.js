const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Transactions Contract", function () {
  let transactions;
  let owner;
  let addr1;
  let addr2;
  const initialSupply = ethers.parseEther("1000");

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    addr1 = signers[1];
    addr2 = signers[2];
    const Transactions = await ethers.getContractFactory("Transactions");
    transactions = await Transactions.deploy(initialSupply);
    await transactions.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right initial supply", async function () {
      expect(await transactions.totalSupply()).to.equal(initialSupply);
    });

    it("Should assign the total supply to the owner", async function () {
      expect(await transactions.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("Should set the initial fee to 1%", async function () {
      expect(await transactions.feePercentage()).to.equal(100n);
    });
  });

  describe("Transactions and Fees", function () {
    it("Should transfer tokens, deduct fee, and record transaction with metadata", async function () {
      const amount = ethers.parseEther("100");
      const message = "Fee test";
      const category = "Business";
      const tags = ["test", "fee"];
      
      await transactions.transfer(addr1.address, amount);
      const ownerBalanceAfterFirstTransfer = await transactions.balanceOf(owner.address);
      
      const tx = await transactions.connect(addr1).addToBlockchain(addr2.address, amount, message, category, tags);
      await tx.wait();

      const fee = (amount * 100n) / 10000n;
      const amountToSend = amount - fee;

      expect(await transactions.balanceOf(addr1.address)).to.equal(0n);
      expect(await transactions.balanceOf(addr2.address)).to.equal(amountToSend);
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceAfterFirstTransfer + fee);

      const allTransactions = await transactions.getAllTransactions();
      expect(allTransactions.length).to.equal(1);
      expect(allTransactions[0].amount).to.equal(amount);
      expect(allTransactions[0].category).to.equal(category);
      expect(allTransactions[0].tags).to.deep.equal(tags);
    });

    it("Should perform batch transfers and collect fees", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");
      const totalAmount = amount1 + amount2;
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

      const fee1 = (amount1 * 100n) / 10000n;
      const fee2 = (amount2 * 100n) / 10000n;

      // addr1: totalAmount - amount1 - amount2 = 0
      // owner: ownerBalanceBefore + amount1(net) + fee1 + fee2
      // amount1(net) = amount1 - fee1
      // owner: ownerBalanceBefore + amount1 - fee1 + fee1 + fee2 = ownerBalanceBefore + amount1 + fee2
      expect(await transactions.balanceOf(addr1.address)).to.equal(0n);
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceBefore + amount1 + fee2);
      expect(await transactions.balanceOf(addr2.address)).to.equal(amount2 - fee2);

      const allTransactions = await transactions.getAllTransactions();
      expect(allTransactions.length).to.equal(2);
      expect(allTransactions[0].receiver).to.equal(owner.address);
      expect(allTransactions[1].receiver).to.equal(addr2.address);
    });

    it("Should allow owner to change fee and apply new fee", async function () {
      const newFee = 500n; // 5%
      await transactions.setFeePercentage(newFee);
      expect(await transactions.feePercentage()).to.equal(newFee);

      const amount = ethers.parseEther("100");
      await transactions.transfer(addr1.address, amount);
      const ownerBalanceBefore = await transactions.balanceOf(owner.address);

      await transactions.connect(addr1).addToBlockchain(addr2.address, amount, "5% fee", "", []);
      
      const expectedFee = (amount * 500n) / 10000n;
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceBefore + expectedFee);
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

  // ---------------------------------------------------------------------------
  // P6-05 — coverage extension: fee math boundaries/rounding, the 10% cap
  // boundary, onlyOwner on every restricted function, revert paths, event
  // emission shape, and getTransactionCount.
  // ---------------------------------------------------------------------------
  describe("Fee math boundaries and rounding", function () {
    it("charges zero fee and skips the fee transfer when feePercentage is 0", async function () {
      await transactions.setFeePercentage(0);
      const amount = ethers.parseEther("100");
      await transactions.transfer(addr1.address, amount);
      const ownerBalanceBefore = await transactions.balanceOf(owner.address);

      await transactions.connect(addr1).addToBlockchain(addr2.address, amount, "", "", []);

      expect(await transactions.balanceOf(addr2.address)).to.equal(amount);
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceBefore);
    });

    it("rounds the fee down (integer division) for an amount that doesn't divide evenly", async function () {
      // 1% of 99 wei = 0.99 -> floors to 0 fee, full amount forwarded.
      const amount = 99n;
      await transactions.transfer(addr1.address, amount);
      const ownerBalanceBefore = await transactions.balanceOf(owner.address);

      await transactions.connect(addr1).addToBlockchain(addr2.address, amount, "", "", []);

      expect(await transactions.balanceOf(addr2.address)).to.equal(amount);
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceBefore);
    });

    it("accepts exactly the 10% cap boundary (1000 basis points)", async function () {
      await expect(transactions.setFeePercentage(1000)).to.not.be.reverted;
      expect(await transactions.feePercentage()).to.equal(1000n);

      const amount = ethers.parseEther("100");
      await transactions.transfer(addr1.address, amount);
      const ownerBalanceBefore = await transactions.balanceOf(owner.address);

      await transactions.connect(addr1).addToBlockchain(addr2.address, amount, "", "", []);

      const expectedFee = (amount * 1000n) / 10000n;
      expect(await transactions.balanceOf(owner.address)).to.equal(ownerBalanceBefore + expectedFee);
      expect(await transactions.balanceOf(addr2.address)).to.equal(amount - expectedFee);
    });
  });

  describe("Ownership enforcement", function () {
    it("onlyOwner: setFeePercentage reverts for a non-owner caller", async function () {
      await expect(transactions.connect(addr1).setFeePercentage(200)).to.be.reverted;
    });

    it("onlyOwner: setFeePercentage succeeds for the owner", async function () {
      await expect(transactions.setFeePercentage(200)).to.not.be.reverted;
    });
  });

  describe("Revert paths", function () {
    it("reverts addToBlockchain when amount is 0", async function () {
      await expect(
        transactions.addToBlockchain(addr1.address, 0, "", "", [])
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("reverts addToBlockchain when the sender's balance is insufficient", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        transactions.connect(addr1).addToBlockchain(addr2.address, amount, "", "", [])
      ).to.be.revertedWith("Insufficient balance");
    });

    it("reverts addToBlockchainBatch when receivers/amounts array lengths mismatch", async function () {
      await expect(
        transactions.addToBlockchainBatch(
          [addr1.address, addr2.address],
          [ethers.parseEther("1")],
          "",
          "",
          []
        )
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("reverts the whole batch if any single leg has an insufficient balance (no partial application)", async function () {
      const amount = ethers.parseEther("50");
      await transactions.transfer(addr1.address, amount);

      await expect(
        transactions.connect(addr1).addToBlockchainBatch(
          [addr2.address, owner.address],
          [amount, amount], // second leg exceeds addr1's remaining balance
          "",
          "",
          []
        )
      ).to.be.revertedWith("Insufficient balance");

      // First leg must not have applied either — balance unchanged.
      expect(await transactions.balanceOf(addr1.address)).to.equal(amount);
    });
  });

  describe("Event emission shape", function () {
    it("emits TransactionAdded with the correct fields on a single transfer", async function () {
      const amount = ethers.parseEther("10");
      const message = "hi";
      const category = "cat";
      const tags = ["a", "b"];
      await transactions.transfer(addr1.address, amount);

      await expect(
        transactions.connect(addr1).addToBlockchain(addr2.address, amount, message, category, tags)
      )
        .to.emit(transactions, "TransactionAdded")
        .withArgs(
          addr1.address,
          addr2.address,
          amount,
          message,
          category,
          tags,
          anyUint
        );
    });

    it("emits one TransactionAdded event per leg of a batch transfer", async function () {
      const amount1 = ethers.parseEther("5");
      const amount2 = ethers.parseEther("7");
      await transactions.transfer(addr1.address, amount1 + amount2);

      const tx = transactions
        .connect(addr1)
        .addToBlockchainBatch([owner.address, addr2.address], [amount1, amount2], "m", "c", []);

      await expect(tx)
        .to.emit(transactions, "TransactionAdded")
        .withArgs(addr1.address, owner.address, amount1, "m", "c", [], anyUint)
        .and.to.emit(transactions, "TransactionAdded")
        .withArgs(addr1.address, addr2.address, amount2, "m", "c", [], anyUint);
    });
  });

  describe("getTransactionCount", function () {
    it("returns 0 before any transaction and increments per recorded transfer (including batch legs)", async function () {
      expect(await transactions.getTransactionCount()).to.equal(0n);

      const amount = ethers.parseEther("10");
      await transactions.transfer(addr1.address, amount);
      await transactions.connect(addr1).addToBlockchain(addr2.address, amount, "", "", []);
      expect(await transactions.getTransactionCount()).to.equal(1n);

      await transactions.transfer(addr1.address, ethers.parseEther("2"));
      await transactions.connect(addr1).addToBlockchainBatch(
        [owner.address, addr2.address],
        [ethers.parseEther("1"), ethers.parseEther("1")],
        "",
        "",
        []
      );
      expect(await transactions.getTransactionCount()).to.equal(3n);
    });
  });
});
