// src/config/contracts.ts

import ClaimManagerABI from "../abi/ClaimManager.json";

export const CONTRACT_ADDRESS = "0xYourDeployedContractAddressHere"; // Replace with actual deployed address

export const claimManagerConfig = {
  address: CONTRACT_ADDRESS,
  abi: ClaimManagerABI,
} as const;
