const { ethers } = require("hardhat");

async function main() {
  const ClaimManager = await ethers.getContractFactory("ClaimManager");
  const claimManager = await ClaimManager.deploy();

  // ⛏️ Wait for the contract to finish deploying (Ethers v6+)
  await claimManager.waitForDeployment();

  console.log("ClaimManager deployed to:", claimManager.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
