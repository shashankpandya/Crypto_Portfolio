import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

import {
  transactionsAddress,
  verifyContract,
  logContractMethods,
  logContractDetails,
  checkAllowance,
  approveAllowance,
} from "../utils/constant";
import {
  getProvider,
  getReadContract,
  getSignerContract,
} from "../services/contractService";
import { WalletProvider, getStoredToken } from "./WalletContext";
import { useWallet } from "../hooks/useWallet";
import { WatchlistProvider } from "./WatchlistContext";
import { useWatchlist } from "../hooks/useWatchlist";

// Make sure these are correctly defined in your constants file
// console.log("Contract Address:", contractAddress);
// console.log("Contract ABI:", contractABI);

export const TransactionContext = React.createContext();

/**
 * Helper to build transaction options dynamically (P1-12).
 * Prefers provider estimation (contract.estimateGas + 10% buffer) while supporting
 * user overrides when specified. Eliminates hardcoded gas prices/limits.
 */
export const getTxOptions = async (contract, methodName, args = [], customOptions = {}) => {
  const options = {};

  if (customOptions.gasLimit && !isNaN(customOptions.gasLimit) && Number(customOptions.gasLimit) > 0) {
    options.gasLimit = BigInt(Math.floor(Number(customOptions.gasLimit)));
  } else if (contract && contract.estimateGas && typeof contract.estimateGas[methodName] === "function") {
    try {
      const estimatedGas = await contract.estimateGas[methodName](...args);
      options.gasLimit = (estimatedGas * 110n) / 100n; // 10% safety margin
    } catch (err) {
      console.warn(`[GasEstimation] Could not estimate gas for ${methodName}:`, err?.message || err);
    }
  }

  if (customOptions.gasPrice && !isNaN(customOptions.gasPrice) && Number(customOptions.gasPrice) > 0) {
    options.gasPrice = ethers.parseUnits(customOptions.gasPrice.toString(), "gwei");
  }

  return options;
};

const getEthereumContract = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask.");
  return getSignerContract();
};

const fetchContractABI = async (contractAddress) => {
  const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
  const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "1") {
      return JSON.parse(response.data.result);
    } else {
      throw new Error("Failed to fetch ABI");
    }
  } catch (error) {
    console.error("Error fetching ABI:", error);
    throw error;
  }
};

const getContractInfo = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask.");
  const contract = getReadContract();

  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    const totalSupply = await contract.totalSupply();
    const decimals = await contract.decimals();

    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Total Supply:", ethers.formatUnits(totalSupply, decimals));
    console.log("Decimals:", decimals);

    return { name, symbol, totalSupply, decimals };
  } catch (error) {
    console.error("Error getting contract info:", error);
    throw error;
  }
};

/**
 * TransactionBridge — consumes WalletContext and re-exposes its wallet slice
 * merged with TransactionContext's own (transaction/admin/watchlist) slice
 * under the single TransactionContext, so every existing consumer keeps
 * reading the exact same merged shape it did before the P2-10 split.
 */
const TransactionBridge = ({ children, transactionValue }) => {
  const wallet = useWallet();
  const watchlist = useWatchlist();

  // Axios interceptor — inject Authorization header on all watchlist requests.
  // Use a ref so we only register once and can clean up.
  const interceptorRef = useRef(null);

  useEffect(() => {
    if (interceptorRef.current !== null) {
      axios.interceptors.request.eject(interceptorRef.current);
    }
    interceptorRef.current = axios.interceptors.request.use((config) => {
      const token = getStoredToken();
      if (token && config.url && config.url.includes("/api/watchlist")) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    });
    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, [wallet.authToken]);

  return (
    <TransactionContext.Provider
      value={{
        ...transactionValue,
        connectWallet: wallet.connectWallet,
        disconnectWallet: wallet.disconnectWallet,
        currentAccount: wallet.currentAccount,
        isConnectedToSite: wallet.isConnectedToSite,
        signature: wallet.signature,
        authToken: wallet.authToken,
        getEthBalance: wallet.getEthBalance,
        getTokenBalance: wallet.getTokenBalance,
        fetchWatchlistDB: watchlist.fetchWatchlistDB,
        addToWatchlistDB: watchlist.addToWatchlistDB,
        removeFromWatchlistDB: watchlist.removeFromWatchlistDB,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

/**
 * TransactionComposition — bridges WatchlistContext's syncLocalWatchlistToDB
 * into WalletProvider (which must call it at the same connect/restore points
 * it always has), then renders TransactionBridge to build the final merged
 * value. Keeps WatchlistProvider/WalletProvider/TransactionBridge composed in
 * the same nesting order the P2-10 split established.
 */
const TransactionComposition = ({
  children,
  transactionValue,
  checkAdminStatus,
  getAllTransactions,
  resetAdminState,
}) => {
  const watchlist = useWatchlist();

  return (
    <WalletProvider
      checkAdminStatus={checkAdminStatus}
      getAllTransactions={getAllTransactions}
      syncLocalWatchlistToDB={watchlist.syncLocalWatchlistToDB}
      resetAdminState={resetAdminState}
    >
      <TransactionBridge transactionValue={transactionValue}>
        {children}
      </TransactionBridge>
    </WalletProvider>
  );
};

export const TransactionProvider = ({ children }) => {
  const [formData, setformData] = useState({
    addressTo: "",
    amount: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [contractOwner, setContractOwner] = useState("");
  const [feePercentage, setFeePercentage] = useState("0");

  const handleChange = (e, name) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const checkAdminStatus = React.useCallback(async (account) => {
    if (!account) return;
    try {
      if (!transactionsAddress || !ethers.isAddress(transactionsAddress)) return;
      const contract = await getEthereumContract();
      const owner = await contract.owner();
      setContractOwner(owner);
      setIsAdmin(account.toLowerCase() === owner.toLowerCase());

      const fee = await contract.feePercentage();
      setFeePercentage((Number(fee) / 100).toString()); // 1% = 100 basis points
    } catch (err) {
      console.error("Error checking admin status:", err);
    }
  }, []);

  // Resets admin/fee state alongside wallet disconnect/account-change resets
  // (P2-10: WalletContext calls this via prop so isAdmin/contractOwner/
  // feePercentage — which stay owned here — reset at the same points they
  // always did).
  const resetAdminState = React.useCallback(() => {
    setIsAdmin(false);
    setContractOwner("");
    setFeePercentage("0");
  }, []);

  const updateFeePercentage = React.useCallback(async (newFeePercent) => {
    try {
      const contract = await getEthereumContract();
      const basisPoints = Math.round(parseFloat(newFeePercent) * 100);
      const txOptions = await getTxOptions(contract, "setFeePercentage", [basisPoints]);
      const tx = await contract.setFeePercentage(basisPoints, txOptions);
      setIsLoading(true);
      await tx.wait();
      setIsLoading(false);
      setFeePercentage(newFeePercent.toString());
      return tx.hash;
    } catch (err) {
      setIsLoading(false);
      console.error("Error setting fee percentage:", err);
      throw err;
    }
  }, []);

  const sendBatchTransaction = React.useCallback(async (receivers, amounts, message = "") => {
    try {
      if (window.ethereum) {
        if (!transactionsAddress || !ethers.isAddress(transactionsAddress)) {
          throw new Error("Smart contract address (VITE_CONTRACT_ADDRESS) is not configured.");
        }

        const contract = await getEthereumContract();
        const parsedAmounts = amounts.map(amt => ethers.parseEther(amt));
        const batchArgs = [receivers, parsedAmounts, message || "", "Batch Transfer", []];
        const txOptions = await getTxOptions(contract, "addToBlockchainBatch", batchArgs);

        setIsLoading(true);
        const transaction = await contract.addToBlockchainBatch(
          ...batchArgs,
          txOptions
        );
        await transaction.wait();
        setIsLoading(false);
        return transaction;
      } else {
        throw new Error("No ethereum object found");
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Batch transaction failed:", error);
      throw error;
    }
  }, []);

  const getAllTransactions = async () => {
    try {
      if (window.ethereum) {
        if (!transactionsAddress || !ethers.isAddress(transactionsAddress)) {
          console.warn("VITE_CONTRACT_ADDRESS is not set or invalid. Skipping fetching transactions.");
          return;
        }
        const transactionsContract = getReadContract();
        const availableTransactions =
          await transactionsContract.getAllTransactions();

        const structuredTransactions = availableTransactions.map(
          (transaction) => ({
            addressTo: transaction.receiver,
            addressFrom: transaction.sender,
            timestamp: new Date(
              Number(transaction.timestamp) * 1000
            ).toLocaleString(),
            message: transaction.message,
            amount: Number(transaction.amount) / 10 ** 18,
          })
        );

        console.log(structuredTransactions);

        setTransactions(structuredTransactions);
      } else {
        console.log("Ethereum is not present");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfTransactionsExists = async () => {
    try {
      if (!window.ethereum) return false;
      const transactionsContract = await getEthereumContract();
      const currentTransactionCount =
        await transactionsContract.getTransactionCount();

      window.localStorage.setItem(
        "transactionCount",
        currentTransactionCount.toString()
      );
      return true;
    } catch (error) {
      console.error("Failed to check transaction existence:", error);
      return false;
    }
  };

  const sendTransaction = async () => {
    try {
      if (window.ethereum) {
        const { addressTo, amount, message } = formData;

        if (!transactionsAddress || !ethers.isAddress(transactionsAddress)) {
          throw new Error("Smart contract address (VITE_CONTRACT_ADDRESS) is not configured.");
        }

        const contract = await getEthereumContract();
        const parsedAmount = ethers.parseEther(amount);
        const txArgs = [addressTo, parsedAmount, message || "", "Transfer", []];
        const txOptions = await getTxOptions(contract, "addToBlockchain", txArgs);

        const transaction = await contract.addToBlockchain(
          ...txArgs,
          txOptions
        );

        return transaction;
      } else {
        throw new Error(
          "No Ethereum browser extension detected, please install MetaMask."
        );
      }
    } catch (error) {
      console.error("Send transaction error:", error);
      if (error.code === "ACTION_REJECTED") {
        throw new Error("Transaction was rejected in MetaMask.");
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyContract();
  }, []);

  const transactionValue = {
    transactionCount,
    transactions,
    isLoading,
    sendTransaction,
    sendBatchTransaction,
    handleChange,
    formData,
    checkAllowance,
    approveAllowance,
    getContractInfo,
    isAdmin,
    contractOwner,
    feePercentage,
    updateFeePercentage,
  };

  return (
    <WatchlistProvider>
      <TransactionComposition
        checkAdminStatus={checkAdminStatus}
        getAllTransactions={getAllTransactions}
        resetAdminState={resetAdminState}
        transactionValue={transactionValue}
      >
        {children}
      </TransactionComposition>
    </WatchlistProvider>
  );
};
