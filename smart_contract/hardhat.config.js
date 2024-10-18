// zb6vbCKpRBpsrMQfccLFf_jD180NF_Bh
//https://eth-sepolia.g.alchemy.com/v2/zb6vbCKpRBpsrMQfccLFf_jD180NF_Bh

require("@nomiclabs/hardhat-waffle");

module.exports = {
  defaultNetwork: "sepolia",
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
      url: "https://eth-sepolia.g.alchemy.com/v2/RaTj00saH2HeAxbGYV8J_-9FL46VDs9a",
      accounts: [
        "301dd51f2321c9e7b82450fecf82dc728988d27c6d71b1781be2fcea6bd4b164",
      ],
      //remove gas price and gas limit
      timeout: 60000, // 60 seconds
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
