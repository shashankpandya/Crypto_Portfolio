import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

const { ethereum } = window;

const getEthereumContract = async () => {
  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const transactionsContract = new ethers.Contract(
    transactionsAddress,
    transactionsABI,
    signer
  );

  return transactionsContract;
};

const fetchContractABI = async (contractAddress) => {
  const apiKey = "XK6DFZKVW68WSQS17KQXKTZQA6IT7M7FW1";
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
  if (!ethereum) throw new Error("Please install MetaMask.");
  const provider = new ethers.BrowserProvider(ethereum);
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

  const handleChange = (e, name) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (ethereum) {
        const provider = new ethers.BrowserProvider(ethereum);
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
              transaction.timestamp.toNumber() * 1000
            ).toLocaleString(),
            message: transaction.message,
            amount: parseInt(transaction.amount._hex) / 10 ** 18,
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
      if (!ethereum) return alert("Please install MetaMask.");

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);

        await getAllTransactions();
      } else {
        console.log("No accounts found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfTransactionsExists = async () => {
    try {
      if (!ethereum) return false;
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
      if (!ethereum) return alert("Please install MetaMask.");
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      setCurrentAccount(account);

      // Request signature
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const message = "Connect to Crypto Portfolio";
      const signature = await signer.signMessage(message);
      setSignature(signature);

      setIsConnectedToSite(true);

      // Save to local storage
      localStorage.setItem("currentAccount", account);
      localStorage.setItem("signature", signature);
    } catch (error) {
      console.log(error);
      throw new Error("No ethereum object");
    }
  };

  const disconnectWallet = () => {
    setIsConnectedToSite(false);
    setCurrentAccount("");
    setSignature(null);
    // Clear local storage
    localStorage.removeItem("currentAccount");
    localStorage.removeItem("signature");
  };

  const sendTransaction = async () => {
    try {
      if (ethereum) {
        const { addressTo, amount } = formData;

        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();

        const parsedAmount = ethers.parseEther(amount);

        const tx = {
          to: addressTo,
          value: parsedAmount,
          gasLimit: 21000,
        };

        const transaction = await signer.sendTransaction(tx);

        setIsLoading(true);
        // console.log(`Transaction sent. Hash: ${transaction.hash}`);
        await transaction.wait();
        // console.log(`Transaction confirmed. Hash: ${transaction.hash}`);
        setIsLoading(false);

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
      if (!ethereum) throw new Error("Please install MetaMask.");
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
      const provider = new ethers.BrowserProvider(ethereum);
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
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
