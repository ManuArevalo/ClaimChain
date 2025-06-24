import { ethers } from "ethers";
import ClaimManagerABI from "./ClaimManagerABI.json"; // ABI file exported from Hardhat

const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; // update this

export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, ClaimManagerABI, signerOrProvider);
}
