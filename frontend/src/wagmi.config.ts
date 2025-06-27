// src/wagmi.config.ts

import { createConfig, configureChains } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { metaMask } from 'wagmi/connectors';

const { chains, publicClient } = configureChains([sepolia], [publicProvider()]);

export const config = createConfig({
  autoConnect: true,
  connectors: [metaMask()],
  publicClient,
});

