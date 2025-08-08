import React, { useState } from "react";
import { connectWallet } from "../utils/connectWallet";
import { getV2Contract } from "../utils/Contract";
import { ethers } from "ethers";

export default function AppealBox() {
  const [claimId, setClaimId] = useState("");
  const [valueEth, setValueEth] = useState("0.02");

  const appeal = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    const tx = await contract.appeal(claimId, { value: ethers.parseEther(valueEth) });
    await tx.wait();
    alert("Appeal started; new round opened");
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Appeal</h3>
      <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
      <input type="number" placeholder="ETH value (fee + bond)" value={valueEth} onChange={(e)=>setValueEth(e.target.value)} />
      <button onClick={appeal}>Appeal</button>
    </div>
  );
}