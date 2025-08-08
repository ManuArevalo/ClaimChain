require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_API_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_API_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};

