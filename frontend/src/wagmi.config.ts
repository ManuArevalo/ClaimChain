// src/wagmi.config.ts
import { createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

export const config = createConfig({ chains: [sepolia],
  connectors: [metaMask()], ssr: false,
});

