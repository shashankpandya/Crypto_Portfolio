const hre = require("hardhat");

async function main() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const Transactions = await hre.ethers.getContractFactory("Transactions");

    console.log("Deploying Transactions...");

    // Deploy with no constructor arguments.
    // waitForDeployment() is the ethers v6 / Hardhat 2.22+ API.
    // The old .deployed() and ethers.utils.* calls no longer exist.
    const transactions = await Transactions.deploy();

    console.log("Waiting for deployment confirmation...");
    await transactions.waitForDeployment();

    const address = await transactions.getAddress();
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
