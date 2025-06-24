import React, { useState } from "react";
import { getContract } from "../utils/contract";
import { connectWallet } from "../utils/connectWallet";

export default function VoteOnClaim() {
  const [claimId, setClaimId] = useState("");
  const [voteYes, setVoteYes] = useState(true);
  const [stake, setStake] = useState("0.01"); // in ETH

  const handleVote = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;

    const contract = getContract(wallet.signer);
    const tx = await contract.voteOnClaim(claimId, voteYes, {
      value: ethers.parseEther(stake),
    });
    await tx.wait();

    alert("Voted successfully!");
  };

  return (
    <div>
      <h3>Vote on Claim</h3>
      <input
        placeholder="Claim ID"
        value={claimId}
        onChange={(e) => setClaimId(e.target.value)}
      />
      <input
        type="number"
        placeholder="Stake (ETH)"
        value={stake}
        onChange={(e) => setStake(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={voteYes}
          onChange={(e) => setVoteYes(e.target.checked)}
        />
        Vote YES
      </label>
      <button onClick={handleVote}>Vote</button>
    </div>
  );
}
