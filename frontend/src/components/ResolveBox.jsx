import React, { useState } from "react";
import { connectWallet } from "../utils/connectWallet";
import { getV2Contract } from "../utils/Contract";

export default function ResolveBox() {
  const [claimId, setClaimId] = useState("");
  const [txHash, setTxHash] = useState("");

  const resolve = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    const tx = await contract.resolve(claimId);
    setTxHash(tx.hash);
    await tx.wait();
    alert("Resolved (check ClaimResolved event)");
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Resolve Claim</h3>
      <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
      <button onClick={resolve}>Resolve</button>
      {txHash && <p>Tx: {txHash}</p>}
    </div>
  );
}