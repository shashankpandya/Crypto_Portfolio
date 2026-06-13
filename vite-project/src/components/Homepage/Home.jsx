import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TransactionContext } from "../../context/TransactionContext";
import { ethers } from "ethers";
import TopCoins from "../TopCoins";
import ErrorBoundary from "../ErrorBoundary";
import { gsap } from "gsap";

const getNetworkName = (chainIdHex) => {
  const chainId = parseInt(chainIdHex, 16);
  const networks = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon Mainnet",
    80001: "Mumbai Testnet",
  };
  return networks[chainId] || `Chain ID: ${chainId}`;
};

const Home = ({ coins }) => {
  const { currentAccount, checkTokenBalance, isConnectedToSite } =
    useContext(TransactionContext);
  const [balance, setBalance] = useState("0");
  const [network, setNetwork] = useState("Unknown Network");

  useEffect(() => {
    // Staggered entry animation for dashboard
    gsap.fromTo(
      ".gsap-fade-in",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power2.out" }
    );
  }, []);

  useEffect(() => {
    const fetchBalanceAndNetwork = async () => {
      if (currentAccount && window.ethereum) {
        try {
          const rawBalance = await checkTokenBalance(currentAccount);
          const parsedBalance = parseFloat(rawBalance);
          setBalance(!isNaN(parsedBalance) ? parsedBalance.toFixed(4) : "0.0000");

          const provider = new ethers.BrowserProvider(window.ethereum);
          const chainIdHex = await provider.send("eth_chainId", []);
          setNetwork(getNetworkName(chainIdHex));
        } catch (error) {
          console.error("Error fetching balance or network:", error);
        }
      }
    };

    const handleChainChanged = async () => {
      try {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        const chainIdHex = await newProvider.send("eth_chainId", []);
        setNetwork(getNetworkName(chainIdHex));
      } catch (error) {
        console.error("Error handling chain change:", error);
      }
    };

    fetchBalanceAndNetwork();

    if (window.ethereum) {
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [currentAccount, checkTokenBalance]);

  return (
    <div className="p-8 premium-glow-card text-white rounded-3xl relative overflow-hidden max-w-6xl mx-auto">
      <div className="absolute inset-0 bg-shine opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <h1 className="text-5xl font-black text-center mb-12 gsap-fade-in tracking-tight">
          <span className="premium-text-gradient-primary">Your Crypto Dashboard</span>
        </h1>

        {isConnectedToSite ? (
          <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Wallet Card */}
            <div className="lg:col-span-1 gsap-fade-in">
              <div
                className="h-[200px] w-full max-w-[350px] mx-auto rounded-2xl shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden transform hover:scale-105 hover:shadow-[0_20px_50px_rgba(56,97,251,0.25)] transition-all duration-500 cursor-pointer border border-[#4e557b]/30"
                style={{
                  background: "linear-gradient(135deg, #3861fb 0%, #6366f1 50%, #5b21b6 100%)",
                }}
              >
                <div className="absolute inset-0 bg-shine opacity-20 pointer-events-none"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="text-[10px] uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full text-blue-100 font-bold backdrop-blur-sm">
                    Active Wallet
                  </span>
                </div>
                <div className="z-10">
                  <p className="text-blue-105 text-sm font-mono opacity-90 mb-1">
                    {currentAccount
                      ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(
                          -4
                        )}`
                      : "Address"}
                  </p>
                  <h3 className="text-white text-3xl font-extrabold tracking-tight">
                    Ethereum Key
                  </h3>
                </div>
              </div>
            </div>

            {/* Wallet Info Slots */}
            <div className="lg:col-span-2 bg-[#141520]/50 rounded-2xl p-6 border border-[#2c2f45]/80 backdrop-filter backdrop-blur-sm gsap-fade-in shadow-inner">
              <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a7bb] tracking-tight">
                Wallet Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0e0f17]/60 p-4 rounded-xl border border-[#2c2f45]/50">
                  <p className="text-[#a1a7bb] text-xs font-bold uppercase tracking-wider mb-1">Balance</p>
                  <p className="text-white text-2xl font-black font-mono">
                    {balance} ETH
                  </p>
                </div>
                <div className="bg-[#0e0f17]/60 p-4 rounded-xl border border-[#2c2f45]/50">
                  <p className="text-[#a1a7bb] text-xs font-bold uppercase tracking-wider mb-1">Network</p>
                  <p className="text-white text-xl font-bold font-mono">{network}</p>
                </div>
              </div>
              <div className="mt-6 border-t border-[#2c2f45]/60 pt-4">
                <p className="text-[#a1a7bb] text-xs font-bold uppercase tracking-wider mb-1">Connected Address</p>
                <p className="text-white text-sm break-all font-mono">
                  {currentAccount || "Not connected"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-12 bg-[#141520]/40 rounded-2xl p-10 border border-[#2c2f45]/80 backdrop-filter backdrop-blur-sm gsap-fade-in shadow-inner">
            <p className="text-2xl mb-4 font-bold text-slate-100">
              Connect your wallet to view your portfolio and access features.
            </p>
            <p className="text-slate-400 text-base">
              Use the{" "}
              <span className="text-[#3861fb] font-semibold underline decoration-2 decoration-[#3861fb] cursor-pointer">
                Connect Wallet
              </span>{" "}
              button in the navbar to get started.
            </p>
          </div>
        )}

        {/* Top Cryptocurrencies Grid */}
        <div className="mt-12 gsap-fade-in">
          <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a7bb] tracking-tight">
            Top Cryptocurrencies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coins &&
              coins.slice(0, 6).map((coin, index) => (
                <Link
                  key={coin.id || index}
                  to={`/coin/${coin.id || ''}`}
                  className="premium-glow-card-interactive p-5 rounded-2xl"
                >
                  <div className="flex items-center mb-3">
                    {coin.image && (
                      <img
                        src={coin.image}
                        alt={coin.name || 'Coin'}
                        className="w-9 h-9 mr-3 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">{coin.name || 'N/A'}</h3>
                      <span className="text-xs text-[#a1a7bb] font-mono font-bold uppercase">{coin.symbol || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline mt-4">
                    <span className="text-[#a1a7bb] text-xs font-semibold">Price</span>
                    <span className="text-white font-extrabold font-mono">${coin.current_price?.toLocaleString() ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-[#a1a7bb] text-xs font-semibold">24h Change</span>
                    <span
                      className={`font-extrabold font-mono text-sm ${
                        (coin.price_change_percentage_24h ?? 0) >= 0
                          ? "text-[#16c784]"
                          : "text-[#ea3943]"
                      }`}
                    >
                      {(coin.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
                      {coin.price_change_percentage_24h?.toFixed(2) ?? 'N/A'}%
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* TopCoins component */}
        <div className="gsap-fade-in">
          <ErrorBoundary>
            <TopCoins coins={coins} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default Home;
