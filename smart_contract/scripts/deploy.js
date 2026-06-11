const hre = require("hardhat");

async function main() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const Transactions = await hre.ethers.getContractFactory("Transactions");

    console.log("Deploying Transactions...");

    // The Transactions contract requires an initialSupply in its constructor.
    // We'll deploy with 1,000,000 tokens (assuming 18 decimals).
    const initialSupply = hre.ethers.utils.parseEther("1000000");
    const transactions = await Transactions.deploy(initialSupply);

    console.log("Waiting for deployment confirmation...");
    // Using Ethers v5 syntax .deployed() instead of v6 .waitForDeployment()
    await transactions.deployed();

    const address = transactions.address;
    console.log("Transactions deployed to:", address);
    console.log("\nAdd this to your server/.env:");
    console.log(`CONTRACT_ADDRESS=${address}`);
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
