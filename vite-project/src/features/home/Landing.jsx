import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { useWallet } from "../../hooks/useWallet";
import { useToast } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { COLORS, MOTION, prefersReducedMotion } from "../../utils/tokens";

const FEATURES = [
  {
    title: "Live market data",
    description: "Real-time prices, 24h change, and 7-day trends across the top cryptocurrencies, cached for speed.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    title: "On-chain transfers",
    description: "Send MTK tokens, manage allowances, and review your transaction history — signed directly by your wallet.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
    ),
  },
  {
    title: "Personal watchlist",
    description: "Track the assets you care about. Synced to your wallet address so it follows you across sessions and devices.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    ),
  },
  {
    title: "Secure by design",
    description: "Sign-In with Ethereum authentication — no passwords, no custody of your keys, ever.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
];

const TickerRow = ({ coin }) => {
  const isPositive = (coin.price_change_percentage_24h ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.03] last:border-b-0">
      <div className="flex items-center min-w-0">
        {coin.image && (
          <img src={coin.image} alt="" className="w-5 h-5 mr-2.5 rounded-full flex-shrink-0" />
        )}
        <span className="text-xs font-bold text-white truncate">{coin.name}</span>
        <span className="text-[10px] text-muted font-mono uppercase ml-1.5 flex-shrink-0">
          {coin.symbol?.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-mono text-xs font-bold text-white">
          ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ?? "N/A"}
        </span>
        <span className={`tabular-nums text-[11px] font-semibold w-14 text-right ${isPositive ? "text-positive" : "text-negative"}`}>
          {isPositive ? "▲ " : "▼ "}
          {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

const Landing = ({ coins, coinsLoading = false }) => {
  const { connectWallet } = useWallet();
  const { notify } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const previewCoins = useMemo(() => (coins || []).slice(0, 6), [coins]);

  const handleConnect = async () => {
    if (isConnecting) return;
    if (!window.ethereum) {
      notify({ variant: "error", message: "No wallet found. Install MetaMask to connect." });
      return;
    }
    setIsConnecting(true);
    try {
      await connectWallet();
      notify({ variant: "success", message: "Wallet connected." });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      notify({ variant: "error", message: error.message || "Failed to connect wallet. Please try again." });
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set(".landing-fade-in", { opacity: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      ".landing-fade-in",
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: MOTION.durationSlow, stagger: MOTION.staggerLoose, ease: MOTION.ease }
    );
  }, []);

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center pt-10 pb-16">
        <div className="landing-fade-in">
          <Badge variant="cobalt" className="mb-4">
            Built on Ethereum · Sepolia testnet
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1] mb-5">
            Your crypto portfolio,
            <br />
            <span className="bg-gradient-to-r from-coral to-cobalt bg-clip-text text-transparent">
              on-chain and in real time.
            </span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-8">
            Connect your wallet to track balances, transfer tokens, and watch the market — all verified
            directly against the blockchain, with no custodial middleman.
          </p>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="text-sm py-2.5 px-7 transform hover:scale-[1.01]"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet to Start"}
            </Button>
            <Link
              to="/watchlist"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Browse markets first →
            </Link>
          </div>
        </div>

        {/* Live market preview card */}
        <div className="landing-fade-in">
          <Card className="p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Live Market Preview
              </h2>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive"></span>
              </span>
            </div>
            <div className="rounded-lg border border-white/5 overflow-hidden bg-base/60">
              {coinsLoading ? (
                <div className="flex flex-col gap-2 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : previewCoins.length > 0 ? (
                previewCoins.map((coin) => <TickerRow key={coin.id} coin={coin} />)
              ) : (
                <p className="text-xs text-muted text-center py-8">Market data unavailable right now.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-16">
        {FEATURES.map((feature) => (
          <Card key={feature.title} interactive className="landing-fade-in p-5">
            <div className="w-9 h-9 rounded-md bg-white/[0.04] border border-white/5 flex items-center justify-center mb-4">
              <svg className="w-4.5 h-4.5 text-coral" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {feature.icon}
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">{feature.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
          </Card>
        ))}
      </div>

      {/* Bottom CTA strip */}
      <div className="landing-fade-in rounded-lg border border-white/5 bg-gradient-to-r from-coral/[0.06] to-cobalt/[0.06] px-6 py-8 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }}>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Ready to see your portfolio?</h2>
          <p className="text-xs text-slate-400">Connect MetaMask — it only takes a signature, nothing is sent on-chain.</p>
        </div>
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="text-sm py-2.5 px-7 flex-shrink-0"
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </div>
    </div>
  );
};

export default Landing;
