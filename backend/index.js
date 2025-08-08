require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { SiweMessage } = require('siwe');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXP = process.env.JWT_EXP || '15m';
const DOMAIN = process.env.DOMAIN || 'localhost';
const CHAIN_ID = Number(process.env.CHAIN_ID || 11155111);

// In-memory nonce store; use Redis in production
const nonces = new Map();

app.get('/auth/nonce', (req, res) => {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  nonces.set(nonce, Date.now());
  res.json({ nonce });
});

app.post('/auth/verify', async (req, res) => {
  try {
    const { message, signature } = req.body;
    if (!message || !signature) return res.status(400).json({ error: 'Missing message or signature' });

    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature, domain: DOMAIN, nonce: siweMessage.nonce });

    // Check nonce
    if (!nonces.has(siweMessage.nonce)) return res.status(400).json({ error: 'Invalid nonce' });
    nonces.delete(siweMessage.nonce);

    // Check chain
    if (Number(siweMessage.chainId) !== CHAIN_ID) return res.status(400).json({ error: 'Wrong chain' });

    const token = jwt.sign({ sub: siweMessage.address, chainId: CHAIN_ID }, JWT_SECRET, { expiresIn: JWT_EXP });
    res.json({ token, address: siweMessage.address });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Verification failed' });
  }
});

function auth(req, res, next) {
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Example protected route
app.get('/me', auth, (req, res) => {
  res.json({ address: req.user.sub, chainId: req.user.chainId });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Auth API listening on :${port}`));