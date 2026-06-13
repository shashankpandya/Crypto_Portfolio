import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TransactionContext } from "../../context/TransactionContext";
import { ethers } from "ethers";
import { FaEthereum } from "react-icons/fa";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BiNetworkChart } from "react-icons/bi";
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
          const networkInfo = await provider.getNetwork();

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
    <div className="min-h-screen bg-gray-900 rounded-lg text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-5xl font-extrabold text-center text-teal-400 mb-12 gsap-fade-in">
          Your Crypto Dashboard
        </h1>

        {isConnectedToSite ? (
          <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ethereum Card */}
            <div className="lg:col-span-1 gsap-fade-in">
              <div
                className="h-[200px] w-full max-w-[350px] mx-auto rounded-2xl shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden transform hover:scale-105 hover:rotate-1 hover:shadow-[0_20px_50px_rgba(15,118,110,0.35)] transition-all duration-500 cursor-pointer border border-white border-opacity-15"
                style={{
                  background:
                    "linear-gradient(135deg, #0f766e 0%, #115e59 40%, #0d9488 100%)",
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                    <FaEthereum className="text-white text-xl" />
                  </div>
                  <div className="group relative">
                    <AiOutlineInfoCircle className="text-white text-xl opacity-60 cursor-pointer" />
                    <div className="absolute right-0 w-48 p-2 mt-2 text-sm text-white bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20">
                      Click on the coin to watch details and add to watchlist.
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-white text-sm font-mono opacity-75">
                    {currentAccount
                      ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(
                          -4
                        )}`
                      : "Address"}
                  </p>
                  <h3 className="text-white text-3xl font-bold mt-1 tracking-wide">
                    Ethereum
                  </h3>
                </div>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="lg:col-span-2 bg-gray-800 bg-opacity-50 rounded-2xl shadow-2xl p-6 border border-gray-700 backdrop-filter backdrop-blur-sm gsap-fade-in">
              <h2 className="text-2xl font-bold mb-4 text-teal-400">
                Wallet Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <FaEthereum className="text-teal-400 text-3xl mr-4" />
                  <div>
                    <p className="text-gray-400 text-sm font-semibold">Balance</p>
                    <p className="text-white text-2xl font-black">
                      {balance} ETH
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <BiNetworkChart className="text-teal-400 text-3xl mr-4" />
                  <div>
                    <p className="text-gray-400 text-sm font-semibold">Network</p>
                    <p className="text-white text-xl font-bold">{network}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-sm mb-1 font-semibold">Connected Address</p>
                <p className="text-white text-sm break-all font-mono">
                  {currentAccount || "Not connected"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-12 bg-gray-800 bg-opacity-50 rounded-2xl p-8 border border-gray-700 backdrop-filter backdrop-blur-sm gsap-fade-in">
            <p className="text-2xl mb-4 font-bold text-gray-200">
              Connect your wallet to view your portfolio and access features.
            </p>
            <p className="text-gray-400 text-lg">
              Use the{" "}
              <span className="text-teal-400 font-semibold underline decoration-2 decoration-teal-400 cursor-pointer">
                Connect Wallet
              </span>{" "}
              button in the navbar to get started.
            </p>
          </div>
        )}

        {/* Top Cryptocurrencies Grid */}
        <div className="mt-12 gsap-fade-in">
          <h2 className="text-3xl font-extrabold mb-6 text-teal-400">
            Top Cryptocurrencies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coins &&
              coins.slice(0, 6).map((coin, index) => (
                <Link
                  key={coin.id || index}
                  to={`/coin/${coin.id || ''}`}
                  className="bg-gray-800 bg-opacity-60 p-5 rounded-xl border border-gray-700 hover:border-teal-500/50 hover:shadow-[0_10px_30px_rgba(20,184,166,0.1)] transition-all duration-300 transform hover:-translate-y-1"
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
                      <h3 className="text-lg font-bold text-white leading-tight">{coin.name || 'N/A'}</h3>
                      <span className="text-xs text-gray-400 font-mono font-bold uppercase">{coin.symbol || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline mt-4">
                    <span className="text-gray-400 text-xs font-semibold">Price</span>
                    <span className="text-white font-extrabold font-mono">${coin.current_price?.toLocaleString() ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-gray-400 text-xs font-semibold">24h Change</span>
                    <span
                      className={`font-extrabold font-mono text-sm ${
                        (coin.price_change_percentage_24h ?? 0) >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
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
