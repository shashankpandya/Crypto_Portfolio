import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Homepage/Navbar";
import {
  Watchlist,
  TokenTransfer,
  ApproveAllowance,
  AllowanceCheck,
  Home,
  CoinDetails,
  ErrorBoundary,
  AdminPanel,
  TourGuide,
} from "./components";
import { TransactionProvider } from "./context/TransactionContext";
import "./App.css";
import { fetchCoins } from "./api";

const App = () => {
  const [coins, setCoins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCoins = async () => {
      try {
        const fetchedCoins = await fetchCoins(100); // Adjust the number as needed
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
      <div className="min-h-screen bg-[#12131a] premium-bg flex flex-col justify-center items-center text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#3861fb]/10 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#5b21b6]/10 blur-[120px]"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center space-x-3 mb-8 animate-pulse">
            <span className="p-3 rounded-2xl bg-gradient-to-br from-[#3861fb] to-[#5b21b6] text-white shadow-xl shadow-blue-500/20">
              <div className="w-5 h-5 rounded-full bg-white relative">
                <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-[#3861fb] to-[#5b21b6]"></div>
              </div>
            </span>
            <div className="flex flex-col leading-none text-left select-none">
              <span className="text-xs uppercase tracking-widest text-[#a1a7bb] font-extrabold">Crypto</span>
              <span className="text-xl font-black tracking-tight text-white">Portfolio</span>
            </div>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3861fb] shadow-md shadow-blue-500/20"></div>
          <p className="mt-4 text-[#a1a7bb] font-medium tracking-wide">Syncing market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#12131a] premium-bg flex flex-col justify-center items-center text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#3861fb]/10 blur-[120px]"></div>
        </div>
        <div className="relative z-10 max-w-md w-full px-6">
          <div className="premium-glow-card p-8 rounded-3xl text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-inner">
              <svg className="w-8 h-8 text-[#ea3943]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Sync Error</h3>
            <p className="text-[#ea3943] text-sm font-medium mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full premium-btn text-white font-bold py-3 px-6 rounded-full transition duration-300"
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
      <TransactionProvider>
        <div className="min-h-screen bg-[#12131a] premium-bg text-white relative overflow-x-hidden">
          {/* Ambient Background Glow Blur Circles */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#3861fb]/05 blur-[150px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#5b21b6]/05 blur-[150px]"></div>
          </div>
          <div className="relative z-10">
            <Navbar />
            <TourGuide />
            <div className="container mx-auto px-4 py-8">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home coins={coins} />} />
                  <Route path="/watchlist" element={<Watchlist coins={coins} />} />
                  <Route
                    path="/approveallowance"
                    element={<ApproveAllowance />}
                  />
                  <Route path="/allowancecheck" element={<AllowanceCheck />} />
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
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </TransactionProvider>
    </Router>
  );
};

export default App;
