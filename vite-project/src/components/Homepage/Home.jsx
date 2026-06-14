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

// requestAnimationFrame CountUp Component
const CountUp = ({ value, duration = 800, decimals = 4 }) => {
  const [currentVal, setCurrentVal] = useState(0);
  useEffect(() => {
    let start = null;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setCurrentVal(0);
      return;
    }
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCurrentVal(progress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);
  return <span>{currentVal.toFixed(decimals)}</span>;
};

const Home = ({ coins }) => {
  const { currentAccount, checkTokenBalance, isConnectedToSite, connectWallet } =
    useContext(TransactionContext);
  const [balance, setBalance] = useState("0");
  const [network, setNetwork] = useState("Unknown Network");
  const [isTestnet, setIsTestnet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mouse radial reflection state
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const copyToClipboard = () => {
    if (currentAccount) {
      navigator.clipboard.writeText(currentAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    gsap.fromTo(
      ".gsap-fade-in",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power1.out" }
    );
  }, []);

  useEffect(() => {
    const fetchBalanceAndNetwork = async () => {
      if (currentAccount && window.ethereum) {
        try {
          const rawBalance = await checkTokenBalance(currentAccount);
          const parsedBalance = parseFloat(rawBalance);
          setBalance(!isNaN(parsedBalance) ? parsedBalance.toString() : "0.0000");

          const provider = new ethers.BrowserProvider(window.ethereum);
          const chainIdHex = await provider.send("eth_chainId", []);
          const chainId = parseInt(chainIdHex, 16);
          setNetwork(getNetworkName(chainIdHex));
          // Simple testnet check
          setIsTestnet([5, 11155111, 80001].includes(chainId));
        } catch (error) {
          console.error("Error fetching balance or network:", error);
        }
      }
    };

    const handleChainChanged = async () => {
      try {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        const chainIdHex = await newProvider.send("eth_chainId", []);
        const chainId = parseInt(chainIdHex, 16);
        setNetwork(getNetworkName(chainIdHex));
        setIsTestnet([5, 11155111, 80001].includes(chainId));
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
    <div className="page-container text-white">
      <div className="relative z-10 w-full">
        {/* Header Title */}
        <div className="mb-6 flex flex-col items-center justify-center text-center gsap-fade-in">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="premium-text-gradient-primary">Portfolio Overview</span>
          </h1>
          <p className="text-xs text-[#71717a] mt-1.5 max-w-md">
            Monitor asset allocations, track live market values, and execute smart contract actions.
          </p>
        </div>

        {isConnectedToSite ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            {/* Wallet Card with Mouse Radial Glow */}
            <div className="lg:col-span-1 gsap-fade-in">
              <div
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="h-[175px] w-full rounded-lg border border-white/5 relative overflow-hidden flex flex-col justify-between p-5 cursor-pointer shadow-xl transition-all duration-300"
                style={{
                  background: isHovered
                    ? `radial-gradient(circle 120px at ${coords.x}px ${coords.y}px, rgba(255, 56, 92, 0.1), transparent), #0c1118`
                    : "#0c1118",
                }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/5 px-2.5 py-1 rounded text-white font-bold">
                    Connected Wallet
                  </span>
                  {/* Hexagon Monogram */}
                  <svg className="w-5 h-5 opacity-60" viewBox="0 0 100 100" fill="none">
                    <path
                      d="M30 15 L70 15 L90 50 L70 85 L30 85 L10 50 Z"
                      stroke="#FF385C"
                      strokeWidth="12"
                      fill="none"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <p className="text-[#a1a7bb] text-xs font-mono">
                      {`${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`}
                    </p>
                    <button
                      onClick={copyToClipboard}
                      className="text-[#71717a] hover:text-white transition-colors"
                      title="Copy Address"
                    >
                      {copied ? (
                        <span className="text-[10px] text-[#10B981] font-bold">Copied!</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <h3 className="text-white text-lg font-bold tracking-tight">
                    Ethereum Identity
                  </h3>
                </div>
              </div>
            </div>

            {/* Wallet Info Grid */}
            <div className="lg:col-span-2 bg-[#0c1118] border border-white/5 rounded-lg p-5 flex flex-col justify-between gsap-fade-in shadow-lg">
              <div>
                <h2 className="text-lg font-bold text-white mb-4 tracking-tight">
                  Asset Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#050811] p-3.5 rounded border border-white/5">
                    <p className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Ether Balance</p>
                    <p className="text-white text-2xl font-bold font-mono">
                      <CountUp value={balance} decimals={4} /> <span className="text-xs text-[#71717a] font-normal font-sans ml-1">ETH</span>
                    </p>
                  </div>
                  <div className="bg-[#050811] p-3.5 rounded border border-white/5 flex flex-col justify-between">
                    <div>
                      <p className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Network State</p>
                      <div className="flex items-center space-x-2">
                        {/* Dot indicator */}
                        <span className={`h-2 w-2 rounded-full ${isTestnet ? 'bg-[#FF7B00]' : 'bg-[#2563EB]'}`}></span>
                        <p className="text-white text-sm font-semibold">{network}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-white/5 pt-3.5 flex justify-between items-center text-xs">
                <span className="text-[#71717a]">Security Check</span>
                <span className="text-[#10B981] font-semibold flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified Connection
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-8 bg-[#0c1118] rounded-lg p-8 border border-white/5 gsap-fade-in max-w-md mx-auto flex flex-col items-center shadow-xl">
            <div className="w-12 h-12 bg-[#FF385C]/10 rounded-full flex items-center justify-center mb-4 border border-[#FF385C]/20 shadow-inner">
              <svg className="w-6 h-6 text-[#FF385C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 text-white tracking-tight">
              Connect Web3 Wallet
            </h2>
            <p className="text-[#71717a] text-xs mb-6 max-w-xs leading-relaxed">
              Connect your Ethereum provider to explore tokens, approve token allowances, and transfer assets securely.
            </p>
            <button
              onClick={handleConnect}
              className="premium-btn text-white text-xs font-bold py-2 px-6 rounded-lg transition duration-200 transform hover:scale-[1.01]"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Top Cryptocurrencies Table List */}
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
