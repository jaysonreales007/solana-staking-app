import React, { useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import Header from './components/Header';
import ValidatorGrid from './components/ValidatorGrid';

import '@solana/wallet-adapter-react-ui/styles.css';
import 'sweetalert2/dist/sweetalert2.min.css';

function App() {
  const apiKey = import.meta.env.VITE_SOLANA_RPC_ENDPOINT;
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
  ], []);

  useEffect(() => {
    console.log("Endpoint:", endpoint); // Log the endpoint for debugging
    if (!apiKey) {
      console.error("API key is not set. Please check your .env file.");
    }
  }, [apiKey, endpoint]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen bg-black text-white">
            <div className="starfield"></div>
            <div className="relative z-10">
              <Header />
              <ValidatorGrid />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
