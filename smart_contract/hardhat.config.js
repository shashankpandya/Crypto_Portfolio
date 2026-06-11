require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

// NEVER hardcode private keys or API keys in this file.
// All secrets are loaded from smart_contract/.env
module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [`0x${process.env.DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}`]
        : [],
      timeout: 60000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
