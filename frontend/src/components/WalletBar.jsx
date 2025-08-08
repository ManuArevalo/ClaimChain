import React from 'react';

export default function WalletBar({ account, chainId, onConnect }) {
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
      <button onClick={onConnect}>{account ? 'Reconnect' : 'Connect Wallet'}</button>
    </div>
  );
}