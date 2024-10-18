// Deploying contracts with the account: 0x407031C5911e10bEc23eB86893083F52D0a49251   --my account address
// Transactions deployed to: 0x22664A9539c165f2A462Dc0eBE78b85063613A12    -- our contract address

const hre = require("hardhat");

async function main() {
  try {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const Transactions = await hre.ethers.getContractFactory("Transactions");
    
    const initialSupply = hre.ethers.utils.parseUnits("1000000", 18);

    console.log("Deploying Transactions...");

    const transactions = await Transactions.deploy(initialSupply);

    console.log("Waiting for deployment...");
    await transactions.deployed();

    console.log("Transactions deployed to:", transactions.address);
    console.log("Contract deployment transaction hash:", transactions.deployTransaction.hash);
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
