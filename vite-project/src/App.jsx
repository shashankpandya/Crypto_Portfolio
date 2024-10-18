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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <Router>
      <TransactionProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-700 to-black text-white">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home coins={coins} />} />
              <Route path="/watchlist" element={<Watchlist coins={coins} />} />
              <Route
                path="/approveallowance"
                element={<ApproveAllowance />}
              />
              <Route path="/allowancecheck" element={<AllowanceCheck />} />
              <Route path="/transfer" element={<TokenTransfer />} />
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
          </div>
        </div>
      </TransactionProvider>
    </Router>
  );
};

export default App;
