import React, { useState } from "react";
import { connectWallet } from "../utils/connectWallet";
import { getV2Contract } from "../utils/Contract";

export default function AdminBox() {
  const [provider, setProvider] = useState("");
  const [inputType, setInputType] = useState("police");
  const [approved, setApproved] = useState(true);

  const [cooldown, setCooldown] = useState("60");
  const [commit, setCommit] = useState("180");
  const [reveal, setReveal] = useState("120");
  const [quorum, setQuorum] = useState("3");

  const [appealFee, setAppealFee] = useState("0.02");
  const [oracleSigner, setOracleSigner] = useState("");
  const [treasury, setTreasury] = useState("");

  const approve = async () => {
    const wallet = await connectWallet(); if (!wallet) return;
    const c = getV2Contract(wallet.signer);
    const tx = await c.approveProvider(provider, inputType, approved);
    await tx.wait();
    alert('Provider approval updated');
  };

  const updateParams = async () => {
    const wallet = await connectWallet(); if (!wallet) return;
    const c = getV2Contract(wallet.signer);
    const tx = await c.setParams(cooldown, commit, reveal, quorum);
    await tx.wait();
    alert('Params updated');
  };

  const updateAppealFee = async () => {
    const wallet = await connectWallet(); if (!wallet) return;
    const c = getV2Contract(wallet.signer);
    const wei = BigInt(Math.floor(parseFloat(appealFee) * 1e18).toString());
    const tx = await c.setAppealFee(wei);
    await tx.wait();
    alert('Appeal fee updated');
  };

  const updateOracleSigner = async () => {
    const wallet = await connectWallet(); if (!wallet) return;
    const c = getV2Contract(wallet.signer);
    const tx = await c.setOracleSigner(oracleSigner);
    await tx.wait();
    alert('Oracle signer updated');
  };

  const updateTreasury = async () => {
    const wallet = await connectWallet(); if (!wallet) return;
    const c = getV2Contract(wallet.signer);
    const tx = await c.setTreasury(treasury);
    await tx.wait();
    alert('Treasury updated');
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Admin Tools</h3>

      <div style={{marginBottom:12}}>
        <h4>Approve Provider</h4>
        <input placeholder="Provider address" value={provider} onChange={(e)=>setProvider(e.target.value)} />
        <input placeholder="Input type" value={inputType} onChange={(e)=>setInputType(e.target.value)} />
        <label style={{marginLeft:8}}>
          <input type="checkbox" checked={approved} onChange={(e)=>setApproved(e.target.checked)} /> Approved
        </label>
        <button onClick={approve}>Update</button>
      </div>

      <div style={{marginBottom:12}}>
        <h4>Parameters</h4>
        <input type="number" placeholder="Cooldown (s)" value={cooldown} onChange={(e)=>setCooldown(e.target.value)} />
        <input type="number" placeholder="Commit (s)" value={commit} onChange={(e)=>setCommit(e.target.value)} />
        <input type="number" placeholder="Reveal (s)" value={reveal} onChange={(e)=>setReveal(e.target.value)} />
        <input type="number" placeholder="Min quorum" value={quorum} onChange={(e)=>setQuorum(e.target.value)} />
        <button onClick={updateParams}>Set Params</button>
      </div>

      <div style={{marginBottom:12}}>
        <h4>Appeal Fee</h4>
        <input type="number" placeholder="Appeal fee (ETH)" value={appealFee} onChange={(e)=>setAppealFee(e.target.value)} />
        <button onClick={updateAppealFee}>Set Appeal Fee</button>
      </div>

      <div style={{marginBottom:12}}>
        <h4>Oracle Signer</h4>
        <input placeholder="Oracle signer address" value={oracleSigner} onChange={(e)=>setOracleSigner(e.target.value)} />
        <button onClick={updateOracleSigner}>Set Oracle Signer</button>
      </div>

      <div>
        <h4>Treasury</h4>
        <input placeholder="Treasury address" value={treasury} onChange={(e)=>setTreasury(e.target.value)} />
        <button onClick={updateTreasury}>Set Treasury</button>
      </div>
    </div>
  );
}