import React, { useState } from "react";
import { getContract } from "../utils/contract";
import { connectWallet } from "../utils/connectWallet";

export default function ViewClaim() {
  const [claimId, setClaimId] = useState("");
  const [claimData, setClaimData] = useState(null);

  const handleFetch = async () => {
    const wallet = await connectWallet();
    const contract = getContract(wallet.provider);

    const data = await contract.getClaim(claimId);
    setClaimData(data);
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
          <p><strong>Description:</strong> {claimData[1]}</p>
          <p><strong>Disputed:</strong> {claimData[2].toString()}</p>
          <p><strong>Resolved:</strong> {claimData[3].toString()}</p>
        </div>
      )}
    </div>
  );
}
