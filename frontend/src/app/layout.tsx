// app/layout.tsx or src/app/layout.tsx

'use client';

import { WagmiConfig } from 'wagmi';
import { config } from '../src/wagmi.config'; // adjust path if different

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WagmiConfig config={config}>
          {children}
        </WagmiConfig>
      </body>
    </html>
  );
}
// Note: Ensure that the path to wagmi.config.ts is correct based on your project structure.
// This layout wraps your application with the WagmiConfig provider, allowing you to use Wagmi hooks and components throughout your app.
// You can now use Wagmi hooks like useAccount, useConnect, etc., in your
