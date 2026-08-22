import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { COLORS } from "../../utils/tokens";

const renderSparkline = (sparklineData, isPositive) => {
  const prices = sparklineData?.price;
  if (!prices || !Array.isArray(prices) || prices.length < 2) {
    return null;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const width = 60;
  const height = 20;
  const padding = 2;

  const points = prices.map((price, i) => {
    const x = ((i / (prices.length - 1)) * width).toFixed(1);
    const y = (height + padding - ((price - min) / range) * height).toFixed(1);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg className="w-16 h-6" viewBox="0 0 60 24" fill="none">
      <path
        d={pathD}
        stroke={isPositive ? COLORS.positive : COLORS.negative}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const TopCoins = ({ coins }) => {
  const [filterText, setFilterText] = useState("");

  const filteredCoins = (coins || []).filter((coin) =>
    (coin.name || "").toLowerCase().includes(filterText.toLowerCase()) ||
    (coin.symbol || "").toLowerCase().includes(filterText.toLowerCase())
  );

  useEffect(() => {
    gsap.fromTo(
      ".coin-row",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.015, ease: "power1.out" }
    );
  }, [filterText, coins]);

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="text-amber-400 font-mono text-[11px] w-6 text-center block">
          1
        </span>
      );
    }
    return <span className="text-slate-500 font-mono text-[11px] w-6 text-center block">{rank}</span>;
  };

  return (
    <div className="w-full bg-surface border border-white/5 rounded-lg p-5 mt-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Explore Top Cryptocurrencies
          </h2>
          <p className="text-xs text-muted mt-0.5">Real-time market capitalizations and price trends.</p>
        </div>
        
        {/* Real-time search bar */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            id="coinSearchInput"
            name="coinSearch"
            placeholder="Search coin..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-base border border-white/5 text-xs text-white placeholder-muted focus:outline-none focus:border-cobalt transition-colors"
          />
        </div>
      </div>

      <div
        className="overflow-x-auto border border-white/5 rounded-lg"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}
      >
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-transparent text-slate-600 text-[10px] tracking-[0.12em] uppercase font-semibold border-b border-white/5 select-none">
              <th className="px-4 py-2.5 text-left w-16">Rank</th>
              <th className="px-4 py-2.5 text-left">Asset</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right w-24">Change (24h)</th>
              <th className="px-4 py-2.5 text-center w-24">Trend</th>
              <th className="px-4 py-2.5 text-right hidden md:table-cell">Market Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filteredCoins.length > 0 ? (
              filteredCoins.map((coin, index) => {
                const actualRank = coin.market_cap_rank ?? ((coins || []).findIndex((c) => c.id === coin.id) + 1);
                const isPositive = (coin.price_change_percentage_24h ?? 0) >= 0;
                return (
                  <tr
                    key={coin.id}
                    className="coin-row hover:bg-white/[0.025] transition-colors duration-100 cursor-pointer h-11 items-center"
                  >
                    <td className="px-4 py-2 font-bold text-xs">{getRankBadge(actualRank)}</td>
                    <td className="px-4 py-2">
                      <Link to={`/coin/${coin.id}`} className="flex items-center group">
                        {coin.image && (
                          <img
                            src={coin.image}
                            alt={coin.name || "Coin"}
                            className="w-6 h-6 mr-2.5 rounded-full"
                          />
                        )}
                        <div className="leading-tight">
                          <span className="font-bold text-xs text-white group-hover:text-coral transition-colors duration-150">
                            {coin.name || "N/A"}
                          </span>
                          <span className="text-[10px] text-muted font-mono uppercase ml-1.5">
                            {coin.symbol?.toUpperCase() ?? "N/A"}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-xs text-white">
                      ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`tabular-nums text-xs font-medium ${
                          isPositive ? "text-positive" : "text-negative"
                        }`}
                      >
                        {isPositive ? "▲ " : "▼ "}
                        {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center items-center">
                        {renderSparkline(coin.sparkline_in_7d, isPositive)}
                      </div>
                    </td>

                    <td className="px-4 py-2 text-right font-mono text-xs text-slate-500 hidden md:table-cell">
                      ${coin.market_cap?.toLocaleString() ?? "N/A"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-muted text-xs">
                  No assets matching search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopCoins;
