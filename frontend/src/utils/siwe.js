import { SiweMessage } from 'siwe';

export async function siweSignAndVerify(provider, account, backendUrl, domain, chainId) {
  // 1) get nonce
  const nonceRes = await fetch(`${backendUrl}/auth/nonce`);
  const { nonce } = await nonceRes.json();

  // 2) build SIWE message
  const message = new SiweMessage({
    domain,
    address: account,
    statement: 'Sign in with Ethereum to ClaimChain admin/juror portal.',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce
  });

  const msgToSign = message.prepareMessage();
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(msgToSign);

  // 3) verify
  const verifyRes = await fetch(`${backendUrl}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msgToSign, signature })
  });
  if (!verifyRes.ok) throw new Error('SIWE verify failed');
  const { token } = await verifyRes.json();
  return token;
}