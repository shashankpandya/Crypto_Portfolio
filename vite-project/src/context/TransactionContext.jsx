import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { SiweMessage } from "siwe";

// ---------------------------------------------------------------------------
// Session token helpers — sessionStorage so JWT is cleared on tab close.
// ---------------------------------------------------------------------------
const TOKEN_KEY = "auth_token";
const TOKEN_ADDR_KEY = "auth_address";

function storeSession(address, token) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_ADDR_KEY, address.toLowerCase());
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_ADDR_KEY);
}

function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || null;
}

function getStoredAddress() {
  return sessionStorage.getItem(TOKEN_ADDR_KEY) || null;
}

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

export const TransactionProvider = ({ children }) => {
  const [formData, setformData] = useState({
    addressTo: "",
    amount: "",
    message: "",
  });
  const [currentAccount, setCurrentAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState([]);
  // isConnectedToSite is derived — do NOT add an independent setter outside of:
  // connectWallet, disconnectWallet, restoreSession, handleAccountsChanged (P1-16)
  const [isConnectedToSite, setIsConnectedToSite] = useState(false);
  const [signature, setSignature] = useState(null);
  const [authToken, setAuthToken] = useState(getStoredToken());
  const [isAdmin, setIsAdmin] = useState(false);
  const [contractOwner, setContractOwner] = useState("");
  const [feePercentage, setFeePercentage] = useState("0");

  // ---------------------------------------------------------------------------
  // Axios interceptor — inject Authorization header on all watchlist requests.
  // Use a ref so we only register once and can clean up.
  // ---------------------------------------------------------------------------
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
  }, [authToken]);

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

  const fetchWatchlistDB = React.useCallback(async (address) => {
    try {
      const addrLower = address.toLowerCase();
      const res = await axios.get(`/api/watchlist/${addrLower}`);
      if (res.data.success) {
        return res.data.data.coins.map(c => c.coinId);
      }
    } catch (err) {
      console.error("Failed to fetch watchlist from DB:", err);
    }
    return [];
  }, []);

  const addToWatchlistDB = React.useCallback(async (address, coinId) => {
    try {
      const addrLower = address.toLowerCase();
      await axios.post(`/api/watchlist/${addrLower}/coins`, { coinId });
    } catch (err) {
      console.error("Failed to add to watchlist DB:", err);
    }
  }, []);

  const removeFromWatchlistDB = React.useCallback(async (address, coinId) => {
    try {
      const addrLower = address.toLowerCase();
      await axios.delete(`/api/watchlist/${addrLower}/coins/${coinId}`);
    } catch (err) {
      console.error("Failed to remove from watchlist DB:", err);
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

  const syncLocalWatchlistToDB = async (address) => {
    try {
      const addrLower = address.toLowerCase();
      const userWatchlistKey = `watchlist_${addrLower}`;
      const mixedCaseKey = `watchlist_${address}`;
      
      let localWatchlist = JSON.parse(localStorage.getItem(userWatchlistKey)) || [];

      // Migrate from mixed-case key if it exists and is different
      if (mixedCaseKey !== userWatchlistKey) {
        const mixedWatchlist = JSON.parse(localStorage.getItem(mixedCaseKey));
        if (mixedWatchlist) {
          localWatchlist = [...new Set([...localWatchlist, ...mixedWatchlist])];
          localStorage.removeItem(mixedCaseKey);
        }
      }

      // Merge anonymous watchlist if present
      const anonWatchlist = JSON.parse(localStorage.getItem("watchlist_anonymous")) || [];
      if (anonWatchlist.length > 0) {
        localWatchlist = [...new Set([...localWatchlist, ...anonWatchlist])];
        localStorage.removeItem("watchlist_anonymous");
      }

      // Save merged list back to lowercase user key
      localStorage.setItem(userWatchlistKey, JSON.stringify(localWatchlist));

      if (localWatchlist.length === 0) return;

      const res = await axios.get(`/api/watchlist/${addrLower}`);
      const dbCoins = res.data.success ? res.data.data.coins.map(c => c.coinId) : [];

      for (const coinId of localWatchlist) {
        if (!dbCoins.includes(coinId)) {
          await axios.post(`/api/watchlist/${addrLower}/coins`, { coinId });
        }
      }
      console.log("[Watchlist] Local watchlist synced to database.");
    } catch (err) {
      console.error("Error syncing watchlist to DB:", err);
    }
  };

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

  const checkIfWalletIsConnect = async () => {
    try {
      if (!window.ethereum) {
        console.log("MetaMask is not installed.");
        return;
      }

      const accounts = await window.ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        await getAllTransactions();
        await checkAdminStatus(accounts[0]);
        await syncLocalWatchlistToDB(accounts[0]);
      } else {
        console.log("No accounts found");
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

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return alert("Please install MetaMask.");

      // 1. Request MetaMask account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      const accountLower = account.toLowerCase();

      // 2. Fetch nonce from backend (SIWE)
      const nonceRes = await axios.get(`/api/auth/nonce?address=${accountLower}`);
      if (!nonceRes.data.success) throw new Error("Failed to fetch nonce.");
      const nonce = nonceRes.data.nonce;

      // 3. Build EIP-4361 SIWE message
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const siweMsg = new SiweMessage({
        domain: window.location.host,
        address: account,
        statement: "Sign in with Ethereum to Crypto Portfolio.",
        uri: window.location.origin,
        version: "1",
        chainId: Number(network.chainId),
        nonce,
      });
      const messageText = siweMsg.prepareMessage();

      // 4. Sign with MetaMask
      const signer = await provider.getSigner();
      const sig = await signer.signMessage(messageText);
      setSignature(sig);

      // 5. Verify on backend and receive JWT
      const verifyRes = await axios.post("/api/auth/verify", {
        message: messageText,
        signature: sig,
      });
      if (!verifyRes.data.success) throw new Error("Server rejected signature.");
      const token = verifyRes.data.token;

      // 6. Store session securely (sessionStorage — cleared on tab/browser close)
      storeSession(accountLower, token);
      setAuthToken(token);
      setCurrentAccount(account);
      setIsConnectedToSite(true);

      // Keep account in localStorage for reconnect UX (not used for auth)
      localStorage.setItem("currentAccount", account);

      await checkAdminStatus(account);
      await syncLocalWatchlistToDB(account);
    } catch (error) {
      console.error("Connection failed:", error);
      if (error.code === 4001 || error.message?.includes("rejected")) {
        throw new Error("Connection request rejected by user.");
      }
      throw error;
    }
  };

  const disconnectWallet = () => {
    clearSession();
    setAuthToken(null);
    setIsConnectedToSite(false);
    setCurrentAccount("");
    setSignature(null);
    setIsAdmin(false);
    setContractOwner("");
    setFeePercentage("0");
    localStorage.removeItem("currentAccount");
    localStorage.removeItem("signature"); // legacy cleanup
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



  /** Returns native ETH balance of address as a formatted string (P1-15). */
  const getEthBalance = async (address) => {
    try {
      const provider = getProvider();
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("[getEthBalance] Error:", error);
      throw error;
    }
  };

  /** Returns MTK (ERC-20) token balance of address as a formatted string (P1-15). */
  const getTokenBalance = async (address) => {
    try {
      if (!transactionsAddress || !ethers.isAddress(transactionsAddress)) {
        return "0";
      }
      const contract = getReadContract();
      const decimals = await contract.decimals();
      const balance = await contract.balanceOf(address);
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error("[getTokenBalance] Error:", error);
      return "0";
    }
  };

  useEffect(() => {
    checkIfWalletIsConnect();
    verifyContract();
  }, []);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = getStoredToken();
      const storedAddress = getStoredAddress();
      const storedAccount = localStorage.getItem("currentAccount");

      if (storedToken && storedAddress) {
        // JWT present — restore auth state without re-signing
        setCurrentAccount(storedAccount || storedAddress);
        setAuthToken(storedToken);
        setIsConnectedToSite(true);
        await checkAdminStatus(storedAddress);
      } else if (storedAccount) {
        // Wallet connected but no JWT (e.g. AUTH_REQUIRED=false era)
        setCurrentAccount(storedAccount);
        setIsConnectedToSite(true);
        await checkAdminStatus(storedAccount);
      } else {
        setIsConnectedToSite(false);
      }
    };

    restoreSession();
  }, []);

  // Listen for MetaMask account and chain changes (P1-16)
  // Both listeners live here — single registration point, correct cleanup on unmount.
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      // Empty accounts array means the user disconnected in MetaMask
      clearSession();
      setAuthToken(null);
      setIsConnectedToSite(false);
      setCurrentAccount("");
      setSignature(null);
      setIsAdmin(false);
      setContractOwner("");
      setFeePercentage("0");
      localStorage.removeItem("currentAccount");
      if (accounts.length > 0) {
        // A new account was selected — clear state and prompt re-authentication
        console.log("[Auth] Account changed. Please reconnect to authenticate.");
      }
    };

    const handleChainChanged = () => {
      // Chain change may invalidate cached contract state — safest to reload
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        transactionCount,
        connectWallet,
        transactions,
        currentAccount,
        isLoading,
        sendTransaction,
        sendBatchTransaction,
        handleChange,
        formData,
        checkAllowance,
        approveAllowance,
        getEthBalance,
        getTokenBalance,
        getContractInfo,
        disconnectWallet,
        isConnectedToSite,
        signature,
        authToken,
        isAdmin,
        contractOwner,
        feePercentage,
        updateFeePercentage,
        fetchWatchlistDB,
        addToWatchlistDB,
        removeFromWatchlistDB,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
