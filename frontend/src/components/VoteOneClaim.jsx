import React, { useState } from "react";
import { getV2Contract } from "../utils/Contract";
import { connectWallet } from "../utils/connectWallet";
import { ethers } from "ethers";
import toast from "react-hot-toast";

export default function VoteOnClaim() {
  const [claimId, setClaimId] = useState("");
  const [stake, setStake] = useState("0.01");
  const [commitment, setCommitment] = useState("");
  const [voteYes, setVoteYes] = useState(true);
  const [nonce, setNonce] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCommit = async () => {
    setLoading(true);
    try {
      const wallet = await connectWallet();
      if (!wallet) return;
      const contract = getV2Contract(wallet.signer);
      const tx = await contract.commitVote(claimId, commitment, {
        value: ethers.parseEther(stake),
      });
      await tx.wait();
      toast.success("Commit submitted");
    } catch (e) {
      console.error(e);
      toast.error("Commit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    setLoading(true);
    try {
      const wallet = await connectWallet();
      if (!wallet) return;
      const contract = getV2Contract(wallet.signer);
      const tx = await contract.revealVote(claimId, voteYes, nonce);
      await tx.wait();
      toast.success("Reveal submitted");
    } catch (e) {
      console.error(e);
      toast.error("Reveal failed");
    } finally {
      setLoading(false);
    }
  };

  const computeCommitment = async () => {
    try {
      if (!window.ethereum) return;
      const wallet = await connectWallet();
      if (!wallet) return;
      const contract = getV2Contract(wallet.provider);
      const claim = await contract.getClaim(claimId);
      const currentRound = Number(claim[3]);
      const addr = wallet.account;
      if (!nonce) { toast.error("Enter a nonce first"); return; }
      const packed = ethers.solidityPacked([
        "bool",
        "bytes32",
        "address",
        "uint256",
        "uint256",
      ], [voteYes, nonce, addr, BigInt(claimId), BigInt(currentRound)]);
      const hash = ethers.keccak256(packed);
      setCommitment(hash);
      toast.success(`Commitment computed (round ${currentRound})`);
    } catch (e) {
      console.error(e);
      toast.error("Compute failed");
    }
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
          <button onClick={computeCommitment} disabled={loading}>Compute Commitment</button>
          <input style={{width:'100%'}} placeholder="Commitment" value={commitment} onChange={(e)=>setCommitment(e.target.value)} />
          <button onClick={handleCommit} disabled={loading || !commitment}>Commit</button>
        </div>
      </div>

      <div style={{border:'1px solid #ddd', padding: 12}}>
        <h4>Reveal</h4>
        <input placeholder="Claim ID" value={claimId} onChange={(e)=>setClaimId(e.target.value)} />
        <label style={{marginLeft: 8}}>
          <input type="checkbox" checked={voteYes} onChange={(e)=>setVoteYes(e.target.checked)} /> Vote YES
        </label>
        <input placeholder="Nonce (same used in commit)" value={nonce} onChange={(e)=>setNonce(e.target.value)} />
        <button onClick={handleReveal} disabled={loading}>Reveal</button>
      </div>
    </div>
  );
}
