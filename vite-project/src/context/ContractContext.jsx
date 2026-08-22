import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

import {
  transactionsAddress,
  verifyContract,
  checkAllowance,
  approveAllowance,
} from "../utils/constant";
import { getReadContract, getSignerContract } from "../services/contractService";

export const ContractContext = React.createContext();

/**
 * Helper to build transaction options dynamically (P1-12).
 * Prefers provider estimation (contract.estimateGas + 10% buffer) while supporting
 * user overrides when specified. Eliminates hardcoded gas prices/limits.
 *
 * (P2-12: extracted from TransactionContext.jsx, re-exported there unchanged
 * since TransactionContext.test.js imports it directly by name.)
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
 * ContractProvider (P2-12) — owns on-chain transfer/batch-transfer, allowance
 * check/approve wiring (delegating to utils/constant.js, never duplicating),
 * admin fee-change, gas options (getTxOptions), transaction history fetch,
 * and admin-status checks. Extracted from TransactionContext.jsx.
 *
 * `resetAdminState` is exposed so WalletContext can reset isAdmin/
 * contractOwner/feePercentage at the same connect/disconnect/account-change
 * points it always has — same callback-prop pattern P2-10 established for
 * checkAdminStatus/getAllTransactions.
 */
export const ContractProvider = ({ children }) => {
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
        return structuredTransactions;
      } else {
        console.log("Ethereum is not present");
        return [];
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  /**
   * getTransactionHistory (P5-03) — paginated per-address history from the
   * server's indexed Transaction collection, which is what
   * `getAllTransactions()` used to be relied on for despite being an
   * unbounded read of the *entire* global contract array. The chain read is
   * kept only as an explicit, clearly-labeled fallback for when the server
   * is unavailable, filtered and paginated client-side to the same shape.
   */
  const getTransactionHistory = async (address, { page = 1, limit = 20 } = {}) => {
    try {
      const res = await axios.get(`/api/transactions/${address}`, { params: { page, limit } });
      if (res.data?.success) {
        return {
          source: "server",
          transactions: res.data.data.map((tx) => ({
            addressFrom: tx.sender,
            addressTo: tx.recipient,
            amount: ethers.formatEther(tx.amount),
            message: tx.message,
            timestamp: new Date(tx.timestamp * 1000).toLocaleString(),
            txHash: tx.txHash,
          })),
          pagination: res.data.pagination,
        };
      }
      throw new Error("Unexpected /api/transactions response shape");
    } catch (err) {
      console.warn("Server transaction history unavailable, falling back to on-chain read:", err);
    }

    const addressLower = address.toLowerCase();
    const all = (await getAllTransactions()) || [];
    const matching = all
      .filter(
        (tx) =>
          tx.addressFrom?.toLowerCase() === addressLower || tx.addressTo?.toLowerCase() === addressLower
      )
      .reverse(); // most recent first, matching the server's default sort

    const total = matching.length;
    const start = (page - 1) * limit;

    return {
      source: "chain-fallback",
      transactions: matching.slice(start, start + limit),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
      },
    };
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

  const value = {
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
    checkAdminStatus,
    getAllTransactions,
    getTransactionHistory,
    resetAdminState,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
};
