import React, { useState } from 'react';
import { connectWallet } from './utils/connectWallet';

function App() {
  const [account, setAccount] = useState(null);

  const handleConnect = async () => {
    const wallet = await connectWallet();
    if (wallet) {
      setAccount(wallet.account);
      console.log("Connected:", wallet.account);
    }
  };

  return (
    <div>
      <h1>ClaimChain dApp</h1>
      {!account ? (
        <button onClick={handleConnect}>Connect Wallet</button>
      ) : (
        <p>Connected: {account}</p>
      )}
    </div>
  );
}

export default App;
