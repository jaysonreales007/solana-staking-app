import React, { useState, useCallback } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Copy, LogOut } from 'lucide-react';

const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const CustomWalletMultiButton = () => {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 400);
    }
  }, [publicKey]);

  const truncatedAddress = publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : '';

  const content = connected ? (
    <div className="flex items-center">
      <span>{wallet?.adapter?.name}: {truncatedAddress}</span>
    </div>
  ) : (
    <div className="flex items-center">
      <WalletIcon />
      <span>Connect Wallet</span>
    </div>
  );

  return (
    <WalletMultiButton
      className="!bg-blue-500 hover:!bg-blue-600 flex items-center"
      startIcon={null}
      endIcon={null}
    >
      {content}
      {connected && (
        <div className="ml-2 flex items-center space-x-2">
          <span onClick={copyAddress} className="p-1 hover:bg-blue-600 rounded flex items-center cursor-pointer" title="Copy Address">
            <Copy size={16} className="mr-1" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </span>
          <span onClick={disconnect} className="p-1 hover:bg-blue-600 rounded flex items-center cursor-pointer" title="Disconnect">
            <LogOut size={16} className="mr-1" />
            <span>Disconnect</span>
          </span>
        </div>
      )}
    </WalletMultiButton>
  );
};

export default CustomWalletMultiButton;