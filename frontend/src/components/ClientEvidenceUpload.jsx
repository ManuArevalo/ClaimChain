import React, { useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";

async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return "0x" + hex;
}

export default function ClientEvidenceUpload() {
  const [file, setFile] = useState(null);
  const [w3Token, setW3Token] = useState(""); // Web3.Storage API token (optional)
  const [cid, setCid] = useState("");
  const [uri, setUri] = useState("");
  const [sha256Blob, setSha256Blob] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrTextHash, setOcrTextHash] = useState("");
  const [payload, setPayload] = useState("");
  const [inputHash, setInputHash] = useState("");
  const [s3UploadUrl, setS3UploadUrl] = useState(""); // presigned PUT URL

  const computeAndPrepare = async () => {
    try {
      if (!file) { toast.error("Select a file first"); return; }
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
      toast.success("Hashes computed");
    } catch (e) {
      console.error(e);
      toast.error("Compute failed");
    }
  };

  const uploadToWeb3Storage = async () => {
    try {
      if (!w3Token) { toast.error("Set Web3.Storage API token"); return; }
      if (!file) { toast.error("Select a file first"); return; }
      const resp = await fetch("https://api.web3.storage/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${w3Token}` },
        body: file
      });
      if (!resp.ok) { toast.error("Upload failed"); return; }
      const data = await resp.json();
      if (data && data.cid) {
        setCid(data.cid);
        const u = `ipfs://${data.cid}`;
        setUri(u);
        toast.success("Uploaded to IPFS");
      }
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    }
  };

  const uploadToS3 = async () => {
    try {
      if (!s3UploadUrl) { toast.error("Set S3 presigned URL"); return; }
      if (!file) { toast.error("Select a file first"); return; }
      const resp = await fetch(s3UploadUrl, { method: 'PUT', body: file });
      if (!resp.ok) { toast.error("S3 upload failed"); return; }
      const publicUrl = s3UploadUrl.split('?')[0];
      setUri(publicUrl);
      toast.success("Uploaded to S3");
    } catch (e) {
      console.error(e);
      toast.error("S3 upload failed");
    }
  };

  return (
    <div style={{border:'1px solid #ddd', padding: 12}}>
      <h3>Client Evidence (Police Report Photo)</h3>
      <input type="file" accept="image/*,application/pdf" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
      <input placeholder="Evidence URI (optional)" value={uri} onChange={(e)=>setUri(e.target.value)} />
      <textarea placeholder="OCR text (optional)" value={ocrText} onChange={(e)=>setOcrText(e.target.value)} />

      <div style={{display:'flex', gap:8, margin:"8px 0"}}>
        <input placeholder="Web3.Storage API Token (optional)" value={w3Token} onChange={(e)=>setW3Token(e.target.value)} style={{flex:1}} />
        <button onClick={uploadToWeb3Storage}>Upload to IPFS</button>
      </div>

      <div style={{display:'flex', gap:8, margin:"8px 0"}}>
        <input placeholder="S3 Presigned PUT URL (optional)" value={s3UploadUrl} onChange={(e)=>setS3UploadUrl(e.target.value)} style={{flex:1}} />
        <button onClick={uploadToS3}>Upload to S3</button>
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