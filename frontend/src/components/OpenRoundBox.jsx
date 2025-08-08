import React, { useState } from "react";
import { connectWallet } from "../utils/connectWallet";
import { getV2Contract } from "../utils/Contract";
import { ethers } from "ethers";

export default function OpenRoundBox() {
  const [claimId, setClaimId] = useState("");
  const [bondEth, setBondEth] = useState("0");

  const openOrBond = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    const value = bondEth && Number(bondEth) > 0 ? ethers.parseEther(bondEth) : 0n;
    const tx = await contract.openOrDisputeRound(claimId, { value });
    await tx.wait();
    alert("Round opened / bond added");
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Open/Dispute Round</h3>
      <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
      <input type="number" placeholder="Bond (ETH)" value={bondEth} onChange={(e)=>setBondEth(e.target.value)} />
      <button onClick={openOrBond}>Open / Add Bond</button>
    </div>
  );
}