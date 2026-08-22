import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "./features/home/Navbar";
import LedgerTicker from "./features/home/LedgerTicker";
import RequireWallet from "./components/RequireWallet";
import ErrorBoundary from "./components/ErrorBoundary";
import { WalletProvider, getStoredToken } from "./context/WalletContext";
import { useWallet } from "./hooks/useWallet";
import { WatchlistProvider } from "./context/WatchlistContext";
import { useWatchlist } from "./hooks/useWatchlist";
import { ContractProvider } from "./context/ContractContext";
import { useContract } from "./hooks/useContract";
import { ToastProvider } from "./components/ui/Toast";
import "./App.css";
import { fetchCoins } from "./api";

// Lazy load components directly from their source directories to avoid eager bundling via index.js
const Home = React.lazy(() => import("./features/home/Home"));
const Landing = React.lazy(() => import("./features/home/Landing"));
const Watchlist = React.lazy(() => import("./features/market/Watchlist"));
const TokenTransfer = React.lazy(() => import("./features/transfer/TokenTransfer"));
const AllowanceManager = React.lazy(() => import("./features/transfer/AllowanceManager"));
const CoinDetails = React.lazy(() => import("./features/market/CoinDetails"));
const AdminPanel = React.lazy(() => import("./features/admin/AdminPanel"));

const SuspenseFallback = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-coral shadow-md shadow-coral/20"></div>
    <p className="mt-4 text-slate-400 text-sm font-medium tracking-wide">Loading component...</p>
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
 * RootRoute — the "/" route shows the marketing Landing page (with a live
 * market preview) before a wallet is connected, and the connected Dashboard
 * (Home) once it is. Lives inside AppProviders/WalletProvider so it can read
 * isConnectedToSite directly instead of App.jsx duplicating wallet state.
 */
const RootRoute = ({ coins, coinsLoading, coinsError, onRetryCoins }) => {
  const { isConnectedToSite } = useWallet();
  return isConnectedToSite ? (
    <Home coins={coins} coinsLoading={coinsLoading} coinsError={coinsError} onRetryCoins={onRetryCoins} />
  ) : (
    <Landing coins={coins} coinsLoading={coinsLoading} />
  );
};

/**
 * AppProviders (P2-13) — wires ContractContext's checkAdminStatus/
 * resetAdminState and WatchlistContext's syncLocalWatchlistToDB into
 * WalletProvider at the same connect/restore points they always ran at.
 * Replaces the TransactionComposition + TransactionBridge layers retired
 * from TransactionContext.jsx. (P5-03: getAllTransactions was removed from
 * this wiring — it's no longer called eagerly on connect/restore.)
 */
const AppProviders = ({ children }) => {
  const watchlist = useWatchlist();
  const contract = useContract();

  return (
    <WalletProvider
      checkAdminStatus={contract.checkAdminStatus}
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
      <ToastProvider>
      <WatchlistProvider>
        <ContractProvider>
          <AppProviders>
            <div className="min-h-screen bg-base premium-bg text-white relative overflow-x-hidden">
              {/* Ambient Background Glow Blur Circles */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-coral/[0.04] blur-[150px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cobalt/[0.04] blur-[150px]"></div>
              </div>
              <div className="relative z-10">
                <Navbar />
                <LedgerTicker coins={coins} />
                <div className="container mx-auto px-4 py-8">
                  <ErrorBoundary>
                    <React.Suspense fallback={<SuspenseFallback />}>
                      <Routes>
                        <Route
                          path="/"
                          element={
                            <RootRoute
                              coins={coins}
                              coinsLoading={isLoading}
                              coinsError={error}
                              onRetryCoins={loadCoins}
                            />
                          }
                        />
                        <Route path="/watchlist" element={<Watchlist coins={coins} />} />
                        <Route
                          path="/allowance"
                          element={
                            <RequireWallet>
                              <AllowanceManager />
                            </RequireWallet>
                          }
                        />
                        {/* Redirect deprecated routes */}
                        <Route path="/approveallowance" element={<Navigate to="/allowance" replace />} />
                        <Route path="/allowancecheck" element={<Navigate to="/allowance" replace />} />
                        <Route
                          path="/transfer"
                          element={
                            <RequireWallet>
                              <TokenTransfer />
                            </RequireWallet>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <RequireWallet>
                              <AdminPanel />
                            </RequireWallet>
                          }
                        />
                        <Route
                          path="/coin/:id"
                          element={
                            <CoinDetails
                              coins={coins}
                            />
                          }
                        />
                        <Route
                          path="*"
                          element={
                            <div className="flex flex-col items-center justify-center gap-sm py-xl text-center">
                              <p className="text-6xl font-black text-white">404</p>
                              <p className="text-lg font-medium text-white">Page not found</p>
                              <p className="max-w-sm text-sm text-muted">
                                The page you're looking for doesn't exist or has moved.
                              </p>
                              <Link
                                to="/"
                                className="inline-flex items-center justify-center rounded-md bg-coral px-md py-xs text-xs font-medium text-white shadow-[0_4px_12px_0_rgba(255,56,92,0.15)] transition duration ease-premium hover:opacity-95 hover:shadow-[0_6px_16px_0_rgba(255,56,92,0.3)] hover:-translate-y-px mt-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
                              >
                                Back to Dashboard
                              </Link>
                            </div>
                          }
                        />
                      </Routes>
                    </React.Suspense>
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </AppProviders>
        </ContractProvider>
      </WatchlistProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;
