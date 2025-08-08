import { ethers } from "ethers";
import ClaimManagerV2ABI from "../abi/ClaimManagerV2.abi.json";

export const CLAIM_MANAGER_V2_ADDRESS = process.env.REACT_APP_CLAIM_MANAGER_V2_ADDRESS || "0x0000000000000000000000000000000000000000";

export function getV2Contract(signerOrProvider) {
  if (!CLAIM_MANAGER_V2_ADDRESS || CLAIM_MANAGER_V2_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn('CLAIM_MANAGER_V2_ADDRESS is not set');
  }
  return new ethers.Contract(CLAIM_MANAGER_V2_ADDRESS, ClaimManagerV2ABI, signerOrProvider);
}
