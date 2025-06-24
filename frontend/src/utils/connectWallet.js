import { ethers } from 'ethers';

export async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not detected.");
    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    return { provider, signer, account: accounts[0] };
  } catch (err) {
    console.error("Wallet connection failed:", err);
    return null;
  }
}
