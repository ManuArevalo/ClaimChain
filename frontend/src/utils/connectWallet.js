import { ethers } from 'ethers';
import { NETWORK } from '../configuration/network';

async function ensureChain(ethereum) {
  const targetHex = NETWORK.chainIdHex;
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetHex }],
    });
  } catch (err) {
    if (err && err.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: targetHex,
          chainName: NETWORK.chainName,
          nativeCurrency: { name: NETWORK.currencySymbol, symbol: NETWORK.currencySymbol, decimals: 18 },
          rpcUrls: [NETWORK.rpcUrl],
          blockExplorerUrls: [NETWORK.blockExplorerUrl]
        }]
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not detected.");
    return null;
  }

  try {
    await ensureChain(window.ethereum);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    return { provider, signer, account: accounts[0], chainId: Number(network.chainId) };
  } catch (err) {
    console.error("Wallet connection failed:", err);
    return null;
  }
}
