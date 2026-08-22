import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
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
  const { currentAccount, getEthBalance, getTokenBalance, isConnectedToSite, connectWallet } =
    useWallet();
  const [ethBalance, setEthBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
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

  // Fetch ETH and MTK balances + network when account changes (P1-15)
  // chainChanged listener moved to TransactionContext (P1-16)
  useEffect(() => {
    const fetchBalancesAndNetwork = async () => {
      if (currentAccount && window.ethereum) {
        try {
          // ETH balance
          const rawEth = await getEthBalance(currentAccount);
          const parsedEth = parseFloat(rawEth);
          setEthBalance(!isNaN(parsedEth) ? parsedEth.toString() : "0.0000");

          // MTK token balance
          const rawToken = await getTokenBalance(currentAccount);
          const parsedToken = parseFloat(rawToken);
          setTokenBalance(!isNaN(parsedToken) ? parsedToken.toString() : "0");

          // Network
          const provider = new ethers.BrowserProvider(window.ethereum);
          const chainIdHex = await provider.send("eth_chainId", []);
          const chainId = parseInt(chainIdHex, 16);
          setNetwork(getNetworkName(chainIdHex));
          setIsTestnet([5, 11155111, 80001].includes(chainId));
        } catch (error) {
          console.error("Error fetching balances or network:", error);
        }
      }
    };

    fetchBalancesAndNetwork();
  }, [currentAccount, getEthBalance, getTokenBalance]);

  return (
    <div className="page-container text-white">
      <div className="relative z-10 w-full">
        {/* Compact inline page header row */}
        <div className="flex items-center justify-between mb-5 pt-6 gsap-fade-in">
          <div>
            <h1 className="text-base font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">Your portfolio at a glance</p>
          </div>
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
                <div className="flex justify-between items-center">
                  <span className="text-[10px] tracking-widest text-slate-600 uppercase font-bold">
                    Wallet
                  </span>
                  {/* Network Dot */}
                  <span className={`w-1.5 h-1.5 rounded-full ${isTestnet ? 'bg-[#FF7B00]' : 'bg-[#2563EB]'}`}></span>
                </div>
                
                <div className="flex flex-col flex-1 justify-center mt-2">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-slate-400 text-xs font-mono break-all select-all">
                      {currentAccount}
                    </p>
                    <button
                      onClick={copyToClipboard}
                      className="text-[#71717a] hover:text-white transition-colors"
                      title="Copy Address"
                    >
                      {copied ? (
                        <span className="text-[10px] text-[#10B981] font-bold">✓</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-widest bg-white/[0.04] border border-white/5 px-2.5 py-1 rounded text-white font-bold inline-block font-mono">
                    {network}
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Info Grid */}
            <div className="lg:col-span-2 bg-[#0c1118] border border-white/5 rounded-lg p-5 flex flex-col justify-between gsap-fade-in shadow-lg">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Asset Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ETH Balance */}
                  <div className="bg-[#050811] p-3.5 rounded border border-white/5">
                    <p className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Ether Balance</p>
                    <p className="text-white text-2xl font-bold font-mono animate-fade-in-300">
                      <CountUp value={ethBalance} decimals={4} /> <span className="text-xs text-[#71717a] font-normal font-sans ml-1">ETH</span>
                    </p>
                  </div>
                  {/* MTK Token Balance */}
                  <div className="bg-[#050811] p-3.5 rounded border border-white/5">
                    <p className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">MTK Balance</p>
                    <p className="text-white text-2xl font-bold font-mono animate-fade-in-300">
                      <CountUp value={tokenBalance} decimals={2} /> <span className="text-xs text-[#71717a] font-normal font-sans ml-1">MTK</span>
                    </p>
                  </div>
                  {/* Network */}
                  <div className="bg-[#050811] p-3.5 rounded border border-white/5 flex flex-col justify-between">
                    <div>
                      <p className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Network</p>
                      <div className="flex items-center space-x-2">
                        {/* Dot indicator */}
                        <span className={`h-2 w-2 rounded-full ${isTestnet ? 'bg-[#FF7B00]' : 'bg-[#2563EB]'}`}></span>
                        <p className="text-white text-sm font-semibold">{network}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-white/5 pt-3 flex justify-between items-center text-[11px] text-[#71717a]">
                <span>Security Check</span>
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

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

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
