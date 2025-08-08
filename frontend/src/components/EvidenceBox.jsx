import React, { useState } from "react";
import { connectWallet } from "../utils/connectWallet";
import { getV2Contract } from "../utils/Contract";

export default function EvidenceBox() {
  const [claimId, setClaimId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [inputType, setInputType] = useState("police");
  const [inputHash, setInputHash] = useState("");
  const [verdict, setVerdict] = useState(true);
  const [uri, setUri] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [signature, setSignature] = useState("");
  const [useTyped, setUseTyped] = useState(true);

  const submitEvidence = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    if (useTyped) {
      if (!roundId || !expiresAt) { alert('RoundId and ExpiresAt required'); return; }
      const tx = await contract.submitEvidenceTyped(
        claimId,
        roundId,
        inputType,
        inputHash,
        verdict,
        uri,
        expiresAt,
        signature
      );
      await tx.wait();
    } else {
      const tx = await contract.submitEvidenceSigned(
        claimId,
        inputType,
        inputHash,
        verdict,
        signature
      );
      await tx.wait();
    }
    alert("Evidence submitted");
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Submit Evidence</h3>
      <label style={{display:'block', marginBottom:8}}>
        <input type="checkbox" checked={useTyped} onChange={(e)=>setUseTyped(e.target.checked)} /> Use EIP-712 typed evidence
      </label>
      <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
      {useTyped && (
        <input placeholder="Round ID" value={roundId} onChange={(e)=>setRoundId(e.target.value)} />
      )}
      <input placeholder="Input Type (e.g., police)" value={inputType} onChange={(e)=>setInputType(e.target.value)} />
      <input placeholder="Input Hash (0x...)" value={inputHash} onChange={(e)=>setInputHash(e.target.value)} />
      <label style={{marginLeft:8, display:'block'}}>
        <input type="checkbox" checked={verdict} onChange={(e)=>setVerdict(e.target.checked)} /> Verdict YES
      </label>
      {useTyped && (
        <>
          <input placeholder="Evidence URI (ipfs:// or https://)" value={uri} onChange={(e)=>setUri(e.target.value)} />
          <input placeholder="Expires At (unix seconds)" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} />
        </>
      )}
      <textarea placeholder="Provider Signature (0x...)" value={signature} onChange={(e)=>setSignature(e.target.value)} />
      <button onClick={submitEvidence}>Submit Evidence</button>
    </div>
  );
}