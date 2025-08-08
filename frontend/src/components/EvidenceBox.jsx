import React, { useState } from "react";
import { connectWallet } from "../utils/connectWallet";
import { getV2Contract } from "../utils/Contract";

export default function EvidenceBox() {
  const [claimId, setClaimId] = useState("");
  const [inputType, setInputType] = useState("police");
  const [inputHash, setInputHash] = useState("");
  const [verdict, setVerdict] = useState(true);
  const [signature, setSignature] = useState("");

  const submitEvidence = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    const tx = await contract.submitEvidenceSigned(
      claimId,
      inputType,
      inputHash,
      verdict,
      signature
    );
    await tx.wait();
    alert("Evidence submitted");
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Submit Evidence (Signed)</h3>
      <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
      <input placeholder="Input Type (e.g., police)" value={inputType} onChange={(e)=>setInputType(e.target.value)} />
      <input placeholder="Input Hash (0x...)" value={inputHash} onChange={(e)=>setInputHash(e.target.value)} />
      <label style={{marginLeft:8}}>
        <input type="checkbox" checked={verdict} onChange={(e)=>setVerdict(e.target.checked)} /> Verdict YES
      </label>
      <textarea placeholder="Provider Signature (0x...)" value={signature} onChange={(e)=>setSignature(e.target.value)} />
      <button onClick={submitEvidence}>Submit Evidence</button>
    </div>
  );
}