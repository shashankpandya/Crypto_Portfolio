import React, { useEffect, useRef } from "react";
import axios from "axios";

import { WalletProvider, getStoredToken } from "./WalletContext";
import { useWallet } from "../hooks/useWallet";
import { WatchlistProvider } from "./WatchlistContext";
import { useWatchlist } from "../hooks/useWatchlist";
import { ContractProvider, getTxOptions } from "./ContractContext";
import { useContract } from "../hooks/useContract";

export { getTxOptions };

export const TransactionContext = React.createContext();

/**
 * TransactionBridge — consumes WalletContext, WatchlistContext and
 * ContractContext, merging their slices into the single TransactionContext
 * value so every existing consumer keeps reading the exact same shape it
 * did before the P2-10/P2-11/P2-12 splits.
 */
const TransactionBridge = ({ children }) => {
  const wallet = useWallet();
  const watchlist = useWatchlist();
  const contract = useContract();

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
        transactionCount: contract.transactionCount,
        transactions: contract.transactions,
        isLoading: contract.isLoading,
        sendTransaction: contract.sendTransaction,
        sendBatchTransaction: contract.sendBatchTransaction,
        handleChange: contract.handleChange,
        formData: contract.formData,
        checkAllowance: contract.checkAllowance,
        approveAllowance: contract.approveAllowance,
        getContractInfo: contract.getContractInfo,
        isAdmin: contract.isAdmin,
        contractOwner: contract.contractOwner,
        feePercentage: contract.feePercentage,
        updateFeePercentage: contract.updateFeePercentage,
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
 * TransactionComposition — bridges ContractContext's checkAdminStatus/
 * getAllTransactions/resetAdminState and WatchlistContext's
 * syncLocalWatchlistToDB into WalletProvider (which must call them at the
 * same connect/restore points it always has), then renders TransactionBridge
 * to build the final merged value. Keeps WatchlistProvider/ContractProvider/
 * WalletProvider/TransactionBridge composed in the same nesting order the
 * P2-10/P2-11 splits established.
 */
const TransactionComposition = ({ children }) => {
  const watchlist = useWatchlist();
  const contract = useContract();

  return (
    <WalletProvider
      checkAdminStatus={contract.checkAdminStatus}
      getAllTransactions={contract.getAllTransactions}
      syncLocalWatchlistToDB={watchlist.syncLocalWatchlistToDB}
      resetAdminState={contract.resetAdminState}
    >
      <TransactionBridge>{children}</TransactionBridge>
    </WalletProvider>
  );
};

export const TransactionProvider = ({ children }) => {
  return (
    <WatchlistProvider>
      <ContractProvider>
        <TransactionComposition>{children}</TransactionComposition>
      </ContractProvider>
    </WatchlistProvider>
  );
};
