import React, { useState } from 'react';
import { connectWallet } from './utils/connectWallet';
import SubmitClaimForm from './components/SubmitClaimForm';
import ViewClaims from './components/ViewClaims';
import VoteOneClaim from './components/VoteOneClaim';
import EvidenceBox from './components/EvidenceBox';
import ResolveBox from './components/ResolveBox';
import RewardBox from './components/RewardBox';
import AppealBox from './components/AppealBox';
import OpenRoundBox from './components/OpenRoundBox';

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
    <div style={{maxWidth: 720, margin: '0 auto', padding: 16}}>
      <h1>ClaimChain dApp</h1>
      {!account ? (
        <button onClick={handleConnect}>Connect Wallet</button>
      ) : (
        <p>Connected: {account}</p>
      )}

      <div style={{display:'grid', gap: 16}}>
        <SubmitClaimForm />
        <ViewClaims />
        <OpenRoundBox />
        <VoteOneClaim />
        <EvidenceBox />
        <ResolveBox />
        <RewardBox />
        <AppealBox />
      </div>
    </div>
  );
}

export default App;
