require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_API_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: SEPOLIA_API_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};

