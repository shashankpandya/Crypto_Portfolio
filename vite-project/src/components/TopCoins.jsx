import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";

const generateSparklinePath = (id, change24h) => {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const points = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * 60;
    let y = 12 + Math.sin((hash + i) * 1.1) * 7;
    y += (change24h > 0 ? (count - i) * 0.4 : (i - count) * 0.4);
    y = Math.max(3, Math.min(21, y));
    points.push(`${x},${y}`);
  }
  return `M ${points.join(" L ")}`;
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
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gradient-to-r from-[#FF7B00] to-[#FF385C] text-white font-black text-xs">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/10 text-white font-black text-xs">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#2563EB]/15 text-[#38BDF8] font-black text-xs border border-[#2563EB]/30">
          3
        </span>
      );
    }
    return <span className="text-[#71717a] font-mono text-xs font-semibold pl-2">{rank}</span>;
  };

  return (
    <div className="w-full bg-[#0b0f19] border border-white/5 rounded-lg p-5 mt-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Explore Top Cryptocurrencies
          </h2>
          <p className="text-xs text-[#71717a] mt-0.5">Real-time market capitalizations and price trends.</p>
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
            className="w-full px-3 py-1.5 rounded bg-[#060912] border border-white/5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-white/5 rounded-lg">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-[#050811] text-[#a1a7bb] text-xs font-semibold border-b border-white/5 select-none">
              <th className="px-4 py-2.5 text-left font-bold w-16">Rank</th>
              <th className="px-4 py-2.5 text-left font-bold">Asset</th>
              <th className="px-4 py-2.5 text-right font-bold">Price</th>
              <th className="px-4 py-2.5 text-right font-bold w-24">Change (24h)</th>
              <th className="px-4 py-2.5 text-center font-bold w-24">Trend</th>
              <th className="px-4 py-2.5 text-right font-bold hidden md:table-cell">Market Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filteredCoins.length > 0 ? (
              filteredCoins.map((coin) => {
                const actualRank = (coins || []).findIndex((c) => c.id === coin.id) + 1;
                const isPositive = (coin.price_change_percentage_24h ?? 0) >= 0;
                return (
                  <tr
                    key={coin.id}
                    className="coin-row hover:bg-white/[0.02] transition-colors duration-150 h-11"
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
                          <span className="font-bold text-xs text-white group-hover:text-[#FF385C] transition-colors duration-150">
                            {coin.name || "N/A"}
                          </span>
                          <span className="text-[10px] text-[#71717a] font-mono uppercase ml-1.5">
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
                        className={`font-bold font-mono text-xs ${
                          isPositive ? "text-[#10B981]" : "text-[#EF4444]"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {coin.price_change_percentage_24h?.toFixed(2) ?? "0.00"}%
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center items-center">
                        <svg className="w-16 h-6" viewBox="0 0 60 24" fill="none">
                          <path
                            d={generateSparklinePath(coin.id, coin.price_change_percentage_24h)}
                            stroke={isPositive ? "#10B981" : "#EF4444"}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animate-sparkline"
                          />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] text-[#71717a] hidden md:table-cell">
                      ${coin.market_cap?.toLocaleString() ?? "N/A"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-[#71717a] text-xs">
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
