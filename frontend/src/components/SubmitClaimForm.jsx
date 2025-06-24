import React, { useState } from "react";
import { getContract } from "../utils/contract";
import { connectWallet } from "../utils/connectWallet";

export default function SubmitClaim() {
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;

    const contract = getContract(wallet.signer);
    const tx = await contract.submitClaim(reason);
    await tx.wait();

    alert("Claim submitted!");
    setReason("");
  };

  return (
    <div>
      <h3>Submit a Claim</h3>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why are you claiming?"
      />
      <button onClick={handleSubmit}>Submit Claim</button>
    </div>
  );
}
