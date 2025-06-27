// scripts/deploy.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const ClaimManager = await hre.ethers.getContractFactory("ClaimManager");

  // Constructor requires owner address
  const claimManager = await ClaimManager.deploy(deployer.address);

  // Wait for deployment
  await claimManager.waitForDeployment();

  console.log("ClaimManager deployed to:", await claimManager.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
