import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./components/Homepage/Navbar";
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
const Home = React.lazy(() => import("./components/Homepage/Home"));
const Watchlist = React.lazy(() => import("./components/Watchlist"));
const TokenTransfer = React.lazy(() => import("./components/TokenTransfer"));
const AllowanceManager = React.lazy(() => import("./components/AllowanceManager"));
const CoinDetails = React.lazy(() => import("./components/CoinDetails"));
const AdminPanel = React.lazy(() => import("./components/AdminPanel"));

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

  useEffect(() => {
    const loadCoins = async () => {
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
    loadCoins();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050811] premium-bg flex flex-col justify-center items-center text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF385C]/08 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#2563EB]/08 blur-[120px]"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center space-x-3 mb-8 animate-pulse">
            <span className="p-3 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#FF7B00] text-white shadow-xl shadow-[#FF385C]/20">
              <div className="w-5 h-5 rounded-full bg-white relative">
                <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-[#FF385C] to-[#FF7B00]"></div>
              </div>
            </span>
            <div className="flex flex-col leading-none text-left select-none">
              <span className="text-xs uppercase tracking-widest text-[#a1a7bb] font-extrabold">Crypto</span>
              <span className="text-xl font-black tracking-tight text-white">Portfolio</span>
            </div>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF385C] shadow-md shadow-[#FF385C]/20"></div>
          <p className="mt-4 text-[#a1a7bb] font-medium tracking-wide">Syncing market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050811] premium-bg flex flex-col justify-center items-center text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF385C]/08 blur-[120px]"></div>
        </div>
        <div className="relative z-10 max-w-md w-full px-6">
          <div className="premium-glow-card p-8 rounded-xl text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-inner">
              <svg className="w-8 h-8 text-[#ea3943]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Sync Error</h3>
            <p className="text-[#ea3943] text-sm font-medium mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full premium-btn text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Retry Sync
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                        <Route path="/" element={<Home coins={coins} />} />
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
