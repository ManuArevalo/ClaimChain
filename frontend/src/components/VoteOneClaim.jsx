import React, { useState } from "react";
import { getV2Contract } from "../utils/Contract";
import { connectWallet } from "../utils/connectWallet";
import { ethers } from "ethers";

export default function VoteOnClaim() {
  const [claimId, setClaimId] = useState("");
  const [stake, setStake] = useState("0.01");
  const [commitment, setCommitment] = useState("");
  const [voteYes, setVoteYes] = useState(true);
  const [nonce, setNonce] = useState("");

  const handleCommit = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    const tx = await contract.commitVote(claimId, commitment, {
      value: ethers.parseEther(stake),
    });
    await tx.wait();
    alert("Commit submitted");
  };

  const handleReveal = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    const contract = getV2Contract(wallet.signer);

    const tx = await contract.revealVote(claimId, voteYes, nonce);
    await tx.wait();
    alert("Reveal submitted");
  };

  const computeCommitment = async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    const roundId = 0; // for UX, default; users should check currentRound in View
    if (!nonce) {
      alert("Enter a nonce first");
      return;
    }
    const packed = ethers.solidityPacked([
      "bool",
      "bytes32",
      "address",
      "uint256",
      "uint256",
    ], [voteYes, nonce, addr, BigInt(claimId), BigInt(roundId)]);
    const hash = ethers.keccak256(packed);
    setCommitment(hash);
  };

  return (
    <div>
      <h3>Commit-Reveal Voting</h3>
      <div style={{border:'1px solid #ddd', padding: 12, marginBottom: 12}}>
        <h4>Commit</h4>
        <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
        <input type="number" placeholder="Stake (ETH)" value={stake} onChange={(e)=>setStake(e.target.value)} />
        <input placeholder="Nonce (bytes32-like seed)" value={nonce} onChange={(e)=>setNonce(e.target.value)} />
        <label style={{marginLeft: 8}}>
          <input type="checkbox" checked={voteYes} onChange={(e)=>setVoteYes(e.target.checked)} /> Vote YES
        </label>
        <div style={{marginTop:8}}>
          <button onClick={computeCommitment}>Compute Commitment</button>
          <input style={{width:'100%'}} placeholder="Commitment" value={commitment} onChange={(e)=>setCommitment(e.target.value)} />
          <button onClick={handleCommit}>Commit</button>
        </div>
      </div>

      <div style={{border:'1px solid #ddd', padding: 12}}>
        <h4>Reveal</h4>
        <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
        <label style={{marginLeft: 8}}>
          <input type="checkbox" checked={voteYes} onChange={(e)=>setVoteYes(e.target.checked)} /> Vote YES
        </label>
        <input placeholder="Nonce (same used in commit)" value={nonce} onChange={(e)=>setNonce(e.target.value)} />
        <button onClick={handleReveal}>Reveal</button>
      </div>
    </div>
  );
}
