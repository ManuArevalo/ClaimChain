import React, { useState } from "react";
import { getV2Contract } from "../utils/Contract";
import { connectWallet } from "../utils/connectWallet";

export default function ViewClaim() {
  const [claimId, setClaimId] = useState("");
  const [claimData, setClaimData] = useState(null);

  const handleFetch = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.provider);

    const data = await contract.getClaim(claimId);
    setClaimData({
      claimant: data[0],
      description: data[1],
      createdAt: Number(data[2]),
      currentRound: Number(data[3])
    });
  };

  return (
    <div>
      <h3>View Claim</h3>
      <input
        value={claimId}
        onChange={(e) => setClaimId(e.target.value)}
        placeholder="Claim ID"
      />
      <button onClick={handleFetch}>Fetch Claim</button>
      {claimData && (
        <div>
          <p><strong>Description:</strong> {claimData.description}</p>
          <p><strong>Claimant:</strong> {claimData.claimant}</p>
          <p><strong>Round:</strong> {claimData.currentRound}</p>
        </div>
      )}
    </div>
  );
}
