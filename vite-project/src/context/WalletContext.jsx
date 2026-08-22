import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { SiweMessage } from "siwe";

import { transactionsAddress } from "../utils/constant";
import { getProvider, getReadContract } from "../services/contractService";

// ---------------------------------------------------------------------------
// Session token helpers — sessionStorage so JWT is cleared on tab close.
// (P2-10: extracted from TransactionContext, still used there for the axios
// interceptor via `getStoredToken`.)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "auth_token";
const TOKEN_ADDR_KEY = "auth_address";

export function storeSession(address, token) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_ADDR_KEY, address.toLowerCase());
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_ADDR_KEY);
}

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || null;
}

export function getStoredAddress() {
  return sessionStorage.getItem(TOKEN_ADDR_KEY) || null;
}

export const WalletContext = React.createContext();

/**
 * WalletProvider (P2-10) — owns wallet connect/disconnect/account state, the
 * SIWE session flow, ETH+MTK balance reads, and the accountsChanged/
 * chainChanged listeners. Extracted from TransactionContext.jsx.
 *
 * Contract admin status / watchlist sync remain owned by TransactionContext
 * (later splits) but must still run at the exact same points in the
 * connect/restore/account-change flows as before this split. TransactionContext
 * injects them here as callback props so the original call sequencing — and
 * therefore observable behavior — is unchanged.
 *
 * (P5-03: the eager `getAllTransactions()` call that used to run here on
 * every connect/restore was removed — it read the contract's entire,
 * unbounded global transaction array on every page load. Transaction
 * history is now fetched paginated and per-address, on demand, by whichever
 * view renders it — see `ContractContext.getTransactionHistory`.)
 */
export const WalletProvider = ({
  children,
  checkAdminStatus = async () => {},
  syncLocalWatchlistToDB = async () => {},
  resetAdminState = () => {},
}) => {
  const [currentAccount, setCurrentAccount] = useState("");
  // isConnectedToSite is derived — do NOT add an independent setter outside of:
  // connectWallet, disconnectWallet, restoreSession, handleAccountsChanged (P1-16)
  const [isConnectedToSite, setIsConnectedToSite] = useState(false);
  const [signature, setSignature] = useState(null);
  const [authToken, setAuthToken] = useState(getStoredToken());

  const checkIfWalletIsConnect = async () => {
    try {
      if (!window.ethereum) {
        console.log("MetaMask is not installed.");
        return;
      }

      const accounts = await window.ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        await checkAdminStatus(accounts[0]);
        await syncLocalWatchlistToDB(accounts[0]);
      } else {
        console.log("No accounts found");
      }
    } catch (error) {
      console.log(error);
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
    resetAdminState();
    localStorage.removeItem("currentAccount");
    localStorage.removeItem("signature"); // legacy cleanup
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
      resetAdminState();
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
    <WalletContext.Provider
      value={{
        currentAccount,
        connectWallet,
        disconnectWallet,
        isConnectedToSite,
        signature,
        authToken,
        getEthBalance,
        getTokenBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
