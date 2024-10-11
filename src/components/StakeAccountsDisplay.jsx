import React from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const StakeAccountsDisplay = ({ stakeAccounts, onUnstake, truncateAddress }) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Your Stake Accounts</h2>
      {stakeAccounts.length === 0 ? (
        <p>You don't have any active stake accounts.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stakeAccounts.map((account) => (
            <div key={account.pubkey.toBase58()} className="bg-gray-800 rounded-lg p-4">
              <p className="font-semibold">Account: {truncateAddress(account.pubkey)}</p>
              <p>Amount: {(account.lamports / LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
              <p>Status: {account.data.state}</p>
              {account.data.state === 'active' && (
                <button
                  onClick={() => onUnstake(account.pubkey.toBase58())}
                  className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                >
                  Unstake
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StakeAccountsDisplay;