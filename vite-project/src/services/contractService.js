import { ethers } from "ethers";
import abi from "../utils/Transactions.json";

// ---------------------------------------------------------------------------
// contractService — single owner of contract address + ABI + provider/signer
// construction for the frontend (P2-09). Everything that needs to talk to the
// Transactions contract should go through the functions below rather than
// constructing `ethers.Contract`/`ethers.BrowserProvider` inline.
// ---------------------------------------------------------------------------

export const transactionsABI = abi.abi;
export const transactionsAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

/** True when VITE_CONTRACT_ADDRESS is set and is a valid Ethereum address. */
export const isContractAddressValid = () =>
  Boolean(transactionsAddress) && ethers.isAddress(transactionsAddress);

/** Builds a fresh ethers BrowserProvider from window.ethereum. */
export const getProvider = () => new ethers.BrowserProvider(window.ethereum);

/**
 * Read-only contract instance, bound to a provider (defaults to a fresh
 * BrowserProvider). Use for calls that don't send a transaction.
 */
export const getReadContract = (provider) => {
  const resolvedProvider = provider || getProvider();
  return new ethers.Contract(transactionsAddress, transactionsABI, resolvedProvider);
};

/**
 * Signer-bound contract instance. Use for calls that send a transaction
 * (requires MetaMask account access already granted/requested by the caller).
 */
export const getSignerContract = async () => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(transactionsAddress, transactionsABI, signer);
};

export default {
  transactionsABI,
  transactionsAddress,
  isContractAddressValid,
  getProvider,
  getReadContract,
  getSignerContract,
};
