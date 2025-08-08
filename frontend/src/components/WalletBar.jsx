import React from 'react';
import { siweSignAndVerify } from '../utils/siwe';

export default function WalletBar({ account, chainId, onConnect }) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
  const domain = window.location.host;

  const signIn = async () => {
    try {
      if (!window.ethereum || !account) return;
      const provider = new window.ethers.BrowserProvider(window.ethereum);
      const token = await siweSignAndVerify(provider, account, backendUrl, domain, chainId || 1);
      localStorage.setItem('claimchain_token', token);
      alert('Signed in');
    } catch (e) {
      console.error(e);
      alert('Sign-in failed');
    }
  };

  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0'}}>
      <div>
        {account ? (
          <>
            <span>Account: {account.slice(0,6)}...{account.slice(-4)}</span>
            {chainId && <span style={{marginLeft:12}}>Chain: {chainId}</span>}
          </>
        ) : (
          <span>Not connected</span>
        )}
      </div>
      <div style={{display:'flex', gap:8}}>
        <button onClick={onConnect}>{account ? 'Reconnect' : 'Connect Wallet'}</button>
        {account && <button onClick={signIn}>Sign-In (SIWE)</button>}
      </div>
    </div>
  );
}