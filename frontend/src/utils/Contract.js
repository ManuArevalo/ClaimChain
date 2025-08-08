import { ethers } from "ethers";
import ClaimManagerV2ABI from "../abi/ClaimManagerV2.abi.json";

export const CLAIM_MANAGER_V2_ADDRESS = "0xYourDeployedV2Address"; // update after deploy

export function getV2Contract(signerOrProvider) {
  return new ethers.Contract(CLAIM_MANAGER_V2_ADDRESS, ClaimManagerV2ABI, signerOrProvider);
}
