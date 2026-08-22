import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./features/home/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import { WalletProvider, getStoredToken } from "./context/WalletContext";
import { useWallet } from "./hooks/useWallet";
import { WatchlistProvider } from "./context/WatchlistContext";
import { useWatchlist } from "./hooks/useWatchlist";
import { ContractProvider } from "./context/ContractContext";
import { useContract } from "./hooks/useContract";
import "./App.css";
import { fetchCoins } from "./api";

// Lazy load components directly from their source directories to avoid eager bundling via index.js
const Home = React.lazy(() => import("./features/home/Home"));
const Watchlist = React.lazy(() => import("./features/market/Watchlist"));
const TokenTransfer = React.lazy(() => import("./features/transfer/TokenTransfer"));
const AllowanceManager = React.lazy(() => import("./features/transfer/AllowanceManager"));
const CoinDetails = React.lazy(() => import("./features/market/CoinDetails"));
const AdminPanel = React.lazy(() => import("./features/admin/AdminPanel"));

const SuspenseFallback = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FF385C] shadow-md shadow-[#FF385C]/20"></div>
    <p className="mt-4 text-[#a1a7bb] text-sm font-medium tracking-wide">Loading component...</p>
  </div>
);

/**
 * AuthInterceptor (P2-13) — axios interceptor injecting the Authorization
 * header on watchlist requests. Moved verbatim from the retired
 * TransactionContext.jsx composition layer.
 */
const AuthInterceptor = ({ children }) => {
  const { authToken } = useWallet();
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

  return children;
};

/**
 * AppProviders (P2-13) — wires ContractContext's checkAdminStatus/
 * getAllTransactions/resetAdminState and WatchlistContext's
 * syncLocalWatchlistToDB into WalletProvider at the same connect/restore
 * points they always ran at. Replaces the TransactionComposition +
 * TransactionBridge layers retired from TransactionContext.jsx.
 */
const AppProviders = ({ children }) => {
  const watchlist = useWatchlist();
  const contract = useContract();

  return (
    <WalletProvider
      checkAdminStatus={contract.checkAdminStatus}
      getAllTransactions={contract.getAllTransactions}
      syncLocalWatchlistToDB={watchlist.syncLocalWatchlistToDB}
      resetAdminState={contract.resetAdminState}
    >
      <AuthInterceptor>{children}</AuthInterceptor>
    </WalletProvider>
  );
};

const App = () => {
  const [coins, setCoins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCoins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedCoins = await fetchCoins(100);
      setCoins(fetchedCoins);
    } catch (err) {
      console.error("Failed to load coins:", err);
      setError("Failed to load coins. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoins();
  }, []);

  return (
    <Router>
      <WatchlistProvider>
        <ContractProvider>
          <AppProviders>
            <div className="min-h-screen bg-[#050811] premium-bg text-white relative overflow-x-hidden">
              {/* Ambient Background Glow Blur Circles */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF385C]/04 blur-[150px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#2563EB]/04 blur-[150px]"></div>
              </div>
              <div className="relative z-10">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                  <ErrorBoundary>
                    <React.Suspense fallback={<SuspenseFallback />}>
                      <Routes>
                        <Route
                          path="/"
                          element={
                            <Home
                              coins={coins}
                              coinsLoading={isLoading}
                              coinsError={error}
                              onRetryCoins={loadCoins}
                            />
                          }
                        />
                        <Route path="/watchlist" element={<Watchlist coins={coins} />} />
                        <Route path="/allowance" element={<AllowanceManager />} />
                        {/* Redirect deprecated routes */}
                        <Route path="/approveallowance" element={<Navigate to="/allowance" replace />} />
                        <Route path="/allowancecheck" element={<Navigate to="/allowance" replace />} />
                        <Route path="/transfer" element={<TokenTransfer />} />
                        <Route path="/admin" element={<AdminPanel />} />
                        <Route
                          path="/coin/:id"
                          element={
                            <CoinDetails
                              coins={coins}
                            />
                          }
                        />
                        <Route path="*" element={<div>Page not found</div>} />
                      </Routes>
                    </React.Suspense>
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </AppProviders>
        </ContractProvider>
      </WatchlistProvider>
    </Router>
  );
};

export default App;
