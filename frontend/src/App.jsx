import React, { useEffect, useState } from 'react';
import { connectWallet } from './utils/connectWallet';
import SubmitClaimForm from './components/SubmitClaimForm';
import ViewClaims from './components/ViewClaims';
import VoteOneClaim from './components/VoteOneClaim';
import EvidenceBox from './components/EvidenceBox';
import ResolveBox from './components/ResolveBox';
import RewardBox from './components/RewardBox';
import AppealBox from './components/AppealBox';
import OpenRoundBox from './components/OpenRoundBox';
import AdminBox from './components/AdminBox';
import ClientEvidenceUpload from './components/ClientEvidenceUpload';
import WalletBar from './components/WalletBar';
import { Toaster } from 'react-hot-toast';
import { getV2Contract } from './utils/Contract';

function App() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [role, setRole] = useState('client'); // client | juror | admin
  const [isOwner, setIsOwner] = useState(false);
  const [isProvider, setIsProvider] = useState(false);

  const handleConnect = async () => {
    const wallet = await connectWallet();
    if (wallet) {
      setAccount(wallet.account);
      setChainId(wallet.chainId);
      await detectRoles(wallet);
    }
  };

  const detectRoles = async (wallet) => {
    try {
      const c = getV2Contract(wallet.provider);
      const owner = await c.owner();
      setIsOwner(owner.toLowerCase() === wallet.account.toLowerCase());
      const types = ["police","oracle","expert","community"];
      let providerFlag = false;
      for (const t of types) {
        try {
          const ok = await c.approvedProviders(wallet.account, t);
          if (ok) { providerFlag = true; break; }
        } catch {}
      }
      setIsProvider(providerFlag);
      if (owner.toLowerCase() === wallet.account.toLowerCase() || providerFlag) {
        setRole('admin');
      } else {
        setRole('client');
      }
    } catch (e) {
      console.warn('Role detection failed', e);
    }
  };

  useEffect(() => {
    // Attempt auto connect (optional)
  }, []);

  return (
    <div style={{maxWidth: 900, margin: '0 auto', padding: 16}}>
      <Toaster position="top-right" />
      <h1>ClaimChain dApp</h1>
      <WalletBar account={account} chainId={chainId} onConnect={handleConnect} />

      <div style={{display:'flex', gap: 8, marginBottom: 12}}>
        <button onClick={()=>setRole('client')}>Client</button>
        <button onClick={()=>setRole('juror')}>Juror</button>
        <button onClick={()=>setRole('admin')} disabled={!(isOwner || isProvider)}>Admin</button>
      </div>

      {role === 'client' && (
        <div style={{display:'grid', gap: 16}}>
          <SubmitClaimForm />
          <ClientEvidenceUpload />
          <ViewClaims />
          <OpenRoundBox />
          <AppealBox />
        </div>
      )}

      {role === 'juror' && (
        <div style={{display:'grid', gap: 16}}>
          <ViewClaims />
          <VoteOneClaim />
          <RewardBox />
        </div>
      )}

      {role === 'admin' && (
        <div style={{display:'grid', gap: 16}}>
          <EvidenceBox />
          <ResolveBox />
          <AdminBox />
        </div>
      )}
    </div>
  );
}

export default App;
