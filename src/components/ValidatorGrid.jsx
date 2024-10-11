import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  StakeProgram, 
  Authorized, 
  Lockup, 
  LAMPORTS_PER_SOL, 
  SystemProgram, 
  Transaction, 
  Keypair,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import StakeModal from './StakeModal';
import StakeAccountsDisplay from './StakeAccountsDisplay';

const ITEMS_PER_PAGE = 12;
const MINIMUM_STAKE_AMOUNT = 0.001;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000; // 1 second

const ValidatorGrid = () => {
  const [validators, setValidators] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stakingValidator, setStakingValidator] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [stakeAccounts, setStakeAccounts] = useState([]);
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredValidators, setFilteredValidators] = useState([]);
  const [sortOption, setSortOption] = useState('commission-asc');

  const fetchWithRetry = useCallback(async (fetchFunction, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF) => {
    try {
      return await fetchFunction();
    } catch (error) {
      if (retries === 0) {
        throw error;
      }
      console.log(`Retrying after ${backoff}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(fetchFunction, retries - 1, backoff * 2);
    }
  }, []);

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const voteAccounts = await fetchWithRetry(() => connection.getVoteAccounts());
        const allValidators = [...voteAccounts.current, ...voteAccounts.delinquent];
        
        const validatorData = allValidators.map(validator => ({
          address: new PublicKey(validator.votePubkey),
          name: validator.nodePubkey,
          commission: validator.commission,
          activeStake: validator.activatedStake / LAMPORTS_PER_SOL,
          delinquent: validator.delinquent,
        }));

        setValidators(validatorData);
      } catch (err) {
        console.error('Error fetching validators:', err);
        setError('Failed to fetch validators. Please check your network connection and try again.');
        showErrorToast('Failed to fetch validators. Please check your network connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    const fetchStakeAccounts = async () => {
      if (publicKey) {
        try {
          const accounts = await fetchWithRetry(() => 
            connection.getParsedProgramAccounts(StakeProgram.programId, {
              filters: [
                {
                  memcmp: {
                    offset: 12,
                    bytes: publicKey.toBase58(),
                  },
                },
              ],
            })
          );

          const parsedAccounts = accounts.map(account => ({
            pubkey: account.pubkey,
            lamports: account.account.lamports,
            data: account.account.data.parsed,
          }));

          setStakeAccounts(parsedAccounts);
        } catch (error) {
          console.error('Error fetching stake accounts:', error);
          showErrorToast('Failed to fetch stake accounts. Please try again later.');
        }
      }
    };

    fetchValidators();
    fetchStakeAccounts();
  }, [connection, publicKey, fetchWithRetry]);

  useEffect(() => {
    const filtered = validators.filter(validator => 
      validator.address.toBase58().toLowerCase().includes(searchTerm.toLowerCase()) ||
      validator.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const [criteria, order] = sortOption.split('-');
    const sorted = filtered.sort((a, b) => {
      if (criteria === 'commission') {
        return order === 'asc' ? a.commission - b.commission : b.commission - a.commission;
      } else if (criteria === 'activeStake') {
        return order === 'asc' ? a.activeStake - b.activeStake : b.activeStake - a.activeStake;
      }
      return 0;
    });
    setFilteredValidators(sorted);
    setPage(1); // Reset to first page when search term or sort option changes
  }, [searchTerm, validators, sortOption]);

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const showErrorToast = (message) => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000, // Increased to 5 seconds for longer messages
      timerProgressBar: true,
    });
  };

  const showSuccessToast = (message, isHTML = false) => {
    Swal.fire({
      icon: 'success',
      title: 'Success',
      html: isHTML ? message : undefined,
      text: isHTML ? undefined : message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
    });
  };

  const handleStakeClick = (validator) => {
    if (!publicKey) {
      showErrorToast('Please connect your wallet first');
      return;
    }
    setStakingValidator(validator);
    setIsModalOpen(true);
  };

  const handleStake = async (amount) => {
    if (amount < MINIMUM_STAKE_AMOUNT) {
      showErrorToast(`Minimum stake amount is ${MINIMUM_STAKE_AMOUNT} SOL`);
      return;
    }

    setIsStaking(true);
    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const fromPubkey = publicKey;
      const stakeAccount = Keypair.generate();
      const votePubkey = stakingValidator.address;
      const authorized = new Authorized(fromPubkey, fromPubkey);
      const lockup = new Lockup(0, 0, fromPubkey);

      const rentExemptReserve = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
      const totalAmount = lamports + rentExemptReserve;

      const transaction = new Transaction();
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: fromPubkey,
          newAccountPubkey: stakeAccount.publicKey,
          lamports: totalAmount,
          space: StakeProgram.space,
          programId: StakeProgram.programId,
        }),
        StakeProgram.initialize({
          stakePubkey: stakeAccount.publicKey,
          authorized: authorized,
          lockup: lockup,
        }),
        StakeProgram.delegate({
          stakePubkey: stakeAccount.publicKey,
          authorizedPubkey: fromPubkey,
          votePubkey: votePubkey,
        })
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = fromPubkey;

      // Simulate the transaction
      const simulation = await connection.simulateTransaction(transaction);
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }

      // If simulation is successful, proceed with signing and sending
      transaction.partialSign(stakeAccount);
      const signedTransaction = await signTransaction(transaction);
      const rawTransaction = signedTransaction.serialize();

      // Send and confirm the transaction
      const signature = await sendAndConfirmTransaction(connection, rawTransaction, {
        commitment: 'confirmed',
      });

      console.log('Transaction confirmed. Signature:', signature);
      const explorerLink = `https://solscan.io/tx/${signature}`;
      showSuccessToast(
        `Staking successful! View transaction on Solscan: <a href="${explorerLink}" target="_blank" rel="noopener noreferrer">View Transaction</a>`,
        true
      );
    } catch (err) {
      console.error('Error staking:', err);
      let errorMessage = `Staking failed: ${err.message}`;
      if (err.message.includes('0x1')) {
        errorMessage += '\nInsufficient funds for transaction.';
      } else if (err.message.includes('0x0')) {
        errorMessage += '\nTransaction simulation failed. Please check your balance and try again.';
      } else if (err.message.includes('Transaction was not confirmed')) {
        errorMessage += '\nTransaction timed out. Please try again.';
      }
      showErrorToast(errorMessage);
    } finally {
      setIsStaking(false);
      setIsModalOpen(false);
      setStakingValidator(null);
    }
  };

  const handleUnstake = async (stakeAccountPubkey) => {
    try {
      const transaction = new Transaction().add(
        StakeProgram.deactivate({
          stakePubkey: new PublicKey(stakeAccountPubkey),
          authorizedPubkey: publicKey,
        })
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      const explorerLink = `https://solscan.io/tx/${signature}`;
      showSuccessToast(
        `Unstaking initiated. View transaction on Solscan: <a href="${explorerLink}" target="_blank" rel="noopener noreferrer">View Transaction</a>`,
        true
      );
      
      // Refresh stake accounts
      const updatedAccounts = stakeAccounts.map(account => 
        account.pubkey.toBase58() === stakeAccountPubkey
          ? { ...account, data: { ...account.data, state: 'deactivating' } }
          : account
      );
      setStakeAccounts(updatedAccounts);
    } catch (error) {
      console.error('Error unstaking:', error);
      showErrorToast(`Failed to initiate unstaking: ${error.message}`);
    }
  };

  const truncateAddress = (address) => {
    if (typeof address === 'string') {
      return `${address.slice(0, 9)}...${address.slice(-4)}`;
    } else if (address instanceof PublicKey) {
      const base58 = address.toBase58();
      return `${base58.slice(0, 9)}...${base58.slice(-4)}`;
    }
    return 'Invalid Address';
  };

  const paginatedValidators = filteredValidators.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredValidators.length / ITEMS_PER_PAGE);

  const Pagination = () => (
    <div className="flex justify-center items-center space-x-2 mt-8">
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        className={`px-4 py-2 rounded ${page === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
      >
        Previous
      </button>
      <span className="text-gray-300">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className={`px-4 py-2 rounded ${page === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
      >
        Next
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto mt-8">
        <div className="bg-red-500 text-white p-4 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <StakeAccountsDisplay 
        stakeAccounts={stakeAccounts} 
        onUnstake={handleUnstake} 
        truncateAddress={truncateAddress}
      />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-800 p-6 rounded-lg shadow-lg"
      >
        <input
          type="text"
          placeholder="Search validators by address or name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-2/3 px-4 py-2 bg-gray-700 rounded-md border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
        />
        <select
          value={sortOption}
          onChange={handleSortChange}
          className="w-full sm:w-1/3 px-4 py-2 bg-gray-700 rounded-md border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
        >
          <option value="commission-asc">Commission (Low to High)</option>
          <option value="commission-desc">Commission (High to Low)</option>
          <option value="activeStake-asc">Staked Amount (Low to High)</option>
          <option value="activeStake-desc">Staked Amount (High to Low)</option>
        </select>
      </motion.div>
      {filteredValidators.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center text-xl text-gray-400"
        >
          No validators found. Please try a different search term.
        </motion.div>
      ) : (
        <>
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl font-bold mb-6 text-blue-400"
          >
            List of Validators
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {paginatedValidators.map((validator, index) => (
              <motion.div
                key={validator.address.toBase58()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300"
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-blue-300 truncate" title={validator.name}>
                    {validator.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {truncateAddress(validator.address)}
                  </p>
                  <p className="text-gray-300 mb-2">Commission: <span className="font-semibold text-yellow-400">{validator.commission}%</span></p>
                  <p className="text-gray-300 mb-3">Active Stake: <span className="font-semibold text-green-400">{validator.activeStake.toFixed(2)} SOL</span></p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${validator.delinquent ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {validator.delinquent ? 'Delinquent' : 'Active'}
                  </span>
                </div>
                <div className="px-6 pb-6">
                  <button
                    className={`w-full py-2 px-4 rounded-md font-semibold transition-all duration-300 ${!publicKey || validator.delinquent ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 transform hover:-translate-y-1'}`}
                    onClick={() => handleStakeClick(validator)}
                    disabled={!publicKey || validator.delinquent}
                  >
                    Stake
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <Pagination />
        </>
      )}
      <StakeModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isStaking) {
            setIsModalOpen(false);
            setStakingValidator(null);
          }
        }}
        onStake={handleStake}
        validatorName={stakingValidator ? stakingValidator.name : ''}
        validatorAddress={stakingValidator ? truncateAddress(stakingValidator.address) : ''}
        isStaking={isStaking}
      />
    </div>
  );
};

export default ValidatorGrid;