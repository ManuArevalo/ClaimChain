import React, { useState } from "react";
import { connectWallet } from "../utils/connectWallet";
import { getV2Contract } from "../utils/Contract";

export default function RewardBox() {
  const [claimId, setClaimId] = useState("");
  const [roundId, setRoundId] = useState("");

  const claim = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    const tx = await contract.claimReward(claimId, roundId);
    await tx.wait();
    alert("Reward claimed / refunded");
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Claim Reward</h3>
      <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
      <input placeholder="Round ID" value={roundId} onChange={(e)=>setRoundId(e.target.value)} />
      <button onClick={claim}>Claim</button>
    </div>
  );
}