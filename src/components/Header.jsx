import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ChevronDown, Copy, LogOut, Wallet } from 'lucide-react';
import Swal from 'sweetalert2';

const Header = () => {
  const { publicKey, disconnect } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      Swal.fire({
        icon: 'success',
        title: 'Address Copied!',
        text: 'The wallet address has been copied to your clipboard.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    }
  };

  const handleDisconnect = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You're about to disconnect your wallet.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, disconnect!'
    }).then((result) => {
      if (result.isConfirmed) {
        disconnect();
        Swal.fire(
          'Disconnected!',
          'Your wallet has been disconnected.',
          'success'
        );
      }
    });
  };

  return (
    <header className="bg-gray-900 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <img src="/logo.png" alt="SolanaVault Logo" className="h-20 w-20 mr-3" />
          <div>
            <h1 className="text-2xl font-bold">SolanaVault</h1>
            <p className="text-sm text-gray-400 mt-1">Stake with Confidence</p>
          </div>
        </div>
        {publicKey ? (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            >
              <Wallet className="mr-2 h-5 w-5" />
              <span>{truncatedAddress}</span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md overflow-hidden shadow-xl z-20">
                <button
                  onClick={copyAddress}
                  className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left"
                >
                  <Copy className="inline-block mr-2 h-4 w-4" />
                  Copy Address
                </button>
                <button
                  onClick={handleDisconnect}
                  className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left"
                >
                  <LogOut className="inline-block mr-2 h-4 w-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <WalletMultiButton className="bg-blue-500 hover:bg-blue-600" />
        )}
      </div>
    </header>
  );
};

export default Header;