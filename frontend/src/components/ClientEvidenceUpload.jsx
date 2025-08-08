import React, { useState } from "react";
import { ethers } from "ethers";

async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return "0x" + hex;
}

export default function ClientEvidenceUpload() {
  const [file, setFile] = useState(null);
  const [token, setToken] = useState(""); // Web3.Storage API token (optional)
  const [cid, setCid] = useState("");
  const [uri, setUri] = useState("");
  const [sha256Blob, setSha256Blob] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrTextHash, setOcrTextHash] = useState("");
  const [payload, setPayload] = useState("");
  const [inputHash, setInputHash] = useState("");

  const computeAndPrepare = async () => {
    if (!file) { alert("Select a file first"); return; }
    const sha = await sha256Hex(file);
    setSha256Blob(sha);

    const ocrHash = ocrText ? ethers.keccak256(ethers.toUtf8Bytes(ocrText)) : "0x" + "00".repeat(32);
    setOcrTextHash(ocrHash);

    let finalUri = uri;
    if (!finalUri && cid) finalUri = `ipfs://${cid}`;

    const evidence = {
      uri: finalUri || "",
      sha256Blob: sha,
      ocrTextHash: ocrHash,
      extractedFields: {},
      authenticity: { c2paValid: false, exifSuspicious: false, riskScore: 0 },
      verdict: true,
      roundId: 0,
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    };

    const json = JSON.stringify(evidence);
    setPayload(json);
    const ih = ethers.keccak256(ethers.toUtf8Bytes(json));
    setInputHash(ih);
  };

  const uploadToWeb3Storage = async () => {
    if (!token) { alert("Set Web3.Storage API token"); return; }
    if (!file) { alert("Select a file first"); return; }
    const resp = await fetch("https://api.web3.storage/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: file
    });
    if (!resp.ok) { alert("Upload failed"); return; }
    const data = await resp.json();
    if (data && data.cid) {
      setCid(data.cid);
      setUri(`ipfs://${data.cid}`);
    }
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Client Evidence (Police Report Photo)</h3>
      <input type="file" accept="image/*,application/pdf" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
      <input placeholder="Evidence URI (optional)" value={uri} onChange={(e)=>setUri(e.target.value)} />
      <textarea placeholder="OCR text (optional)" value={ocrText} onChange={(e)=>setOcrText(e.target.value)} />

      <div style={{display:'flex', gap:8, margin:"8px 0"}}>
        <input placeholder="Web3.Storage API Token (optional)" value={token} onChange={(e)=>setToken(e.target.value)} style={{flex:1}} />
        <button onClick={uploadToWeb3Storage}>Upload to IPFS</button>
      </div>

      <button onClick={computeAndPrepare}>Compute Hashes</button>

      {sha256Blob && <p>sha256Blob: {sha256Blob}</p>}
      {cid && <p>CID: {cid}</p>}
      {uri && <p>URI: {uri}</p>}
      {ocrTextHash && <p>ocrTextHash: {ocrTextHash}</p>}
      {payload && (
        <div>
          <p>evidence JSON:</p>
          <textarea readOnly value={payload} rows={6} style={{width:'100%'}} />
        </div>
      )}
      {inputHash && <p>inputHash (share to provider): {inputHash}</p>}
    </div>
  );
}