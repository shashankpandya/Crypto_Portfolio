import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

import {
  transactionsABI,
  transactionsAddress,
  verifyContract,
  logContractMethods,
  logContractDetails,
} from "../utils/constant";

// Make sure these are correctly defined in your constants file
// console.log("Contract Address:", contractAddress);
// console.log("Contract ABI:", contractABI);

export const TransactionContext = React.createContext();

const getEthereumContract = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const transactionsContract = new ethers.Contract(
    transactionsAddress,
    transactionsABI,
    signer
  );

  return transactionsContract;
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
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(
    transactionsAddress,
    transactionsABI,
    provider
  );

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
    gasLimit: "",
    gasPrice: "",
  });
  const [currentAccount, setCurrentAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState([]);
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConnectedToSite, setIsConnectedToSite] = useState(false);
  const [signature, setSignature] = useState(null);
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

  const updateFeePercentage = React.useCallback(async (newFeePercent) => {
    try {
      const contract = await getEthereumContract();
      const basisPoints = Math.round(parseFloat(newFeePercent) * 100);
      const tx = await contract.setFeePercentage(basisPoints);
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
      const res = await axios.get(`/api/watchlist/${address}`);
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
      await axios.post(`/api/watchlist/${address}/coins`, { coinId });
    } catch (err) {
      console.error("Failed to add to watchlist DB:", err);
    }
  }, []);

  const removeFromWatchlistDB = React.useCallback(async (address, coinId) => {
    try {
      await axios.delete(`/api/watchlist/${address}/coins/${coinId}`);
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

        setIsLoading(true);
        const transaction = await contract.addToBlockchainBatch(
          receivers,
          parsedAmounts,
          message || "",
          "Batch Transfer",
          []
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
      const localWatchlist = JSON.parse(localStorage.getItem(`watchlist_${address}`)) || [];
      if (localWatchlist.length === 0) return;

      const res = await axios.get(`/api/watchlist/${address}`);
      const dbCoins = res.data.success ? res.data.data.coins.map(c => c.coinId) : [];

      for (const coinId of localWatchlist) {
        if (!dbCoins.includes(coinId)) {
          await axios.post(`/api/watchlist/${address}/coins`, { coinId });
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
        const provider = new ethers.BrowserProvider(window.ethereum);
        const transactionsContract = new ethers.Contract(
          transactionsAddress,
          transactionsABI,
          provider
        );
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
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      setCurrentAccount(account);

      // Request signature
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = "Connect to ChainPulse";
      const signature = await signer.signMessage(message);
      setSignature(signature);

      setIsConnectedToSite(true);

      // Save to local storage
      localStorage.setItem("currentAccount", account);
      localStorage.setItem("signature", signature);

      await checkAdminStatus(account);
      await syncLocalWatchlistToDB(account);
    } catch (error) {
      console.error("Connection failed:", error);
      if (error.code === 4001 || error.message?.includes("rejected")) {
        throw new Error("Connection request rejected by user.");
      }
      throw new Error("No ethereum object or connection failed.");
    }
  };

  const disconnectWallet = () => {
    setIsConnectedToSite(false);
    setCurrentAccount("");
    setSignature(null);
    setIsAdmin(false);
    setContractOwner("");
    setFeePercentage("0");
    // Clear local storage
    localStorage.removeItem("currentAccount");
    localStorage.removeItem("signature");
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

        // Call the smart contract's addToBlockchain method.
        // This transfers the ERC20 token, collects fees, and records the metadata.
        const transaction = await contract.addToBlockchain(
          addressTo,
          parsedAmount,
          message || "",
          "Transfer",
          []
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

  const checkAllowance = async (owner, spender) => {
    try {
      if (!window.ethereum) throw new Error("Please install MetaMask.");
      const contract = await getEthereumContract();
      const allowance = await contract.allowance(owner, spender);
      return ethers.formatUnits(allowance, 18);
    } catch (error) {
      console.error("Error checking allowance:", error);
      throw error;
    }
  };

  const approveAllowance = async (spender, amount) => {
    try {
      const contract = await getEthereumContract();
      const amountInWei = ethers.parseUnits(amount.toString(), 18);
      const transaction = await contract.approve(spender, amountInWei);
      setIsLoading(true);
      await transaction.wait();
      setIsLoading(false);
      return transaction.hash;
    } catch (error) {
      console.error("Error approving allowance:", error);
      throw error;
    }
  };

  const checkTokenBalance = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error checking token balance:", error);
      throw error;
    }
  };

  const handleApprove = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!currentAccount) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }

    if (!spender || !amount) {
      setErrorMessage("Please provide spender address and amount.");
      return;
    }

    try {
      setLoading(true);
      console.log(
        "Approving allowance for spender:",
        spender,
        "amount:",
        amount
      );
      const txHash = await approveAllowance(spender, amount);
      console.log("Approval transaction hash:", txHash);
      setSuccessMessage(
        `Allowance of ${amount} tokens approved for ${spender}`
      );
    } catch (error) {
      console.error("Error approving allowance:", error);
      setErrorMessage(error.message || "Failed to approve allowance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnect();
    verifyContract();
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      const storedAccount = localStorage.getItem("currentAccount");
      const storedSignature = localStorage.getItem("signature");

      if (storedAccount && storedSignature) {
        setCurrentAccount(storedAccount);
        setSignature(storedSignature);
        setIsConnectedToSite(true);
        await checkAdminStatus(storedAccount);
      } else {
        setIsConnectedToSite(false);
      }
    };

    checkConnection();
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
        checkTokenBalance,
        getContractInfo, // Add this line
        handleApprove,
        spender,
        amount,
        errorMessage,
        successMessage,
        loading,
        disconnectWallet,
        isConnectedToSite,
        signature,
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
