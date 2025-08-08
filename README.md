# ClaimChain - Full Deployment

## 1) Contracts

Prereqs: Node 18+, npm, and a funded deployer key on the target network (e.g., Sepolia).

- Create `.env` in the project root with:

```
SEPOLIA_API_URL=https://sepolia.infura.io/v3/<yourKey>
PRIVATE_KEY=0x<your_private_key>
```

- Compile and deploy ClaimManagerV2:

```
# from /workspace
npm ci --no-audit --no-fund
SEPOLIA_API_URL=$SEPOLIA_API_URL PRIVATE_KEY=$PRIVATE_KEY npx hardhat compile
SEPOLIA_API_URL=$SEPOLIA_API_URL PRIVATE_KEY=$PRIVATE_KEY npx hardhat run scripts/deploy-v2.js --network sepolia
```

This writes the deployed address to `frontend/.env.local` and `frontend/.env.production`, and copies the ABI to `frontend/src/abi/ClaimManagerV2.abi.json`.

Optional owner setup (from a Hardhat task/console):
- `setOracleSigner(address)`
- `setTreasury(address)`
- `approveProvider(address, "police", true)` etc.
- `setParams(cooldown, commit, reveal, quorum)`

## 2) Frontend (Create React App) - Local

```
cd frontend
npm i
npm start
```

Ensure `REACT_APP_CLAIM_MANAGER_V2_ADDRESS` is set in `.env.local` (auto-written by deploy script).

## 3) Frontend - Vercel

- Push this repo to GitHub.
- In Vercel dashboard, "Import Project" -> select `frontend` folder.
- Set Environment Variables (Project Settings -> Environment Variables):
  - `REACT_APP_CLAIM_MANAGER_V2_ADDRESS` = 0x... (from deploy)
- Build command: `npm run build`
- Output directory: `build`
- Framework preset: Create React App (or auto-detect)

Alternatively via CLI:
```
cd frontend
npm i -g vercel
vercel login
vercel --prod
```

## 4) Roles / Portals

- Client: submit claim, view claims, open/dispute round, appeal
- Juror: commit vote, reveal vote, claim rewards
- Admin (owner or approved provider): submit signed evidence, resolve claims, manage params/providers

Role detection is automatic after wallet connect:
- Owner is `owner()` of the contract
- Provider is any address approved via `approvedProviders(address, type)` for common types: police/oracle/expert/community

## 5) Oracle Integration

Submit signed evidence using `Evidence` panel with the oracle/provider signature conforming to the contract hash:
`keccak256( address(this), chainId, claimId, keccak256(inputType), inputHash, verdict )` signed as an ETH signed message.