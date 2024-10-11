import React, { useState } from 'react';

const MINIMUM_STAKE_AMOUNT = 0.001;

const StakeModal = ({ isOpen, onClose, onStake, validatorName, validatorAddress, isStaking, errorMessage }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleStake = () => {
    const stakeAmount = parseFloat(amount);
    if (!stakeAmount || stakeAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (stakeAmount < MINIMUM_STAKE_AMOUNT) {
      setError(`Minimum stake amount is ${MINIMUM_STAKE_AMOUNT} SOL`);
      return;
    }
    setError('');
    onStake(stakeAmount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Stake SOL</h2>
        <p className="mb-1 text-gray-300">Staking to validator:</p>
        <p className="mb-1 font-semibold">{validatorName}</p>
        <p className="mb-4 text-sm text-gray-400">{validatorAddress}</p>
        <p className="mb-2 text-sm text-gray-400">Minimum stake: {MINIMUM_STAKE_AMOUNT} SOL</p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Enter SOL amount (min ${MINIMUM_STAKE_AMOUNT})`}
          className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isStaking}
          min={MINIMUM_STAKE_AMOUNT}
          step="0.001"
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {errorMessage}</span>
          </div>
        )}
        <p className="text-red-500 font-bold mb-4">
          Warning: Staking involves risks. Only stake funds you can afford to lose.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            disabled={isStaking}
          >
            Cancel
          </button>
          <button
            onClick={handleStake}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
            disabled={isStaking}
          >
            {isStaking ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Staking...
              </>
            ) : (
              'Stake'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StakeModal;