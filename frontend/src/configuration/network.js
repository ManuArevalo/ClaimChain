export const NETWORK = {
  chainIdDec: Number(process.env.REACT_APP_CHAIN_ID || 11155111),
  chainIdHex: process.env.REACT_APP_CHAIN_HEX || "0xaa36a7", // 11155111
  chainName: process.env.REACT_APP_CHAIN_NAME || "Sepolia",
  rpcUrl: process.env.REACT_APP_RPC_URL || "https://sepolia.infura.io/v3/",
  currencySymbol: process.env.REACT_APP_CURRENCY_SYMBOL || "ETH",
  blockExplorerUrl: process.env.REACT_APP_BLOCK_EXPLORER_URL || "https://sepolia.etherscan.io/",
};