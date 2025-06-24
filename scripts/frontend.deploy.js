const hre = require("hardhat");

async function main() {
  const ClaimManager = await hre.ethers.getContractFactory("ClaimManager");
  const claimManager = await ClaimManager.deploy();
  await claimManager.waitForDeployment();

  console.log("ClaimManager deployed to:", claimManager.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
