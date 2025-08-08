const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const initialOwner = deployer.address;
  const initialTreasury = deployer.address;

  const Factory = await ethers.getContractFactory('ClaimManagerV2');
  const contract = await Factory.deploy(initialOwner, initialTreasury);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log('ClaimManagerV2 deployed at:', addr);

  // Copy ABI to frontend
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'ClaimManagerV2.sol', 'ClaimManagerV2.json');
  const frontendAbiDir = path.join(__dirname, '..', 'frontend', 'src', 'abi');
  if (!fs.existsSync(frontendAbiDir)) fs.mkdirSync(frontendAbiDir, { recursive: true });
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  fs.writeFileSync(path.join(frontendAbiDir, 'ClaimManagerV2.abi.json'), JSON.stringify(artifact.abi, null, 2));

  // Write env for CRA
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const envContent = `REACT_APP_CLAIM_MANAGER_V2_ADDRESS=${addr}\n`;
  fs.writeFileSync(path.join(frontendDir, '.env.local'), envContent);
  fs.writeFileSync(path.join(frontendDir, '.env.production'), envContent);

  console.log('Frontend env written with contract address.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});