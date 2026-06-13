import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";

const TopCoins = ({ coins }) => {
  const [filterText, setFilterText] = useState("");

  const filteredCoins = (coins || []).filter((coin) =>
    (coin.name || "").toLowerCase().includes(filterText.toLowerCase()) ||
    (coin.symbol || "").toLowerCase().includes(filterText.toLowerCase())
  );

  useEffect(() => {
    // Staggered entry animation for table rows on load and on filtering
    gsap.fromTo(
      ".coin-row",
      { opacity: 0, x: -15 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.02, ease: "power2.out" }
    );
  }, [filterText, coins]);

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-black text-xs shadow-md shadow-yellow-500/20">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-slate-300 to-slate-450 text-gray-900 font-black text-xs shadow-md shadow-gray-400/20">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black text-xs shadow-md shadow-amber-700/20">
          3
        </span>
      );
    }
    return <span className="text-slate-400 font-mono text-sm font-semibold">{rank}</span>;
  };

  return (
    <div className="w-full premium-glow-card text-white rounded-3xl p-8 mt-12">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight">
          <span className="premium-text-gradient-primary">Explore Top Crypto Coins</span>
        </h2>
        
        {/* Real-time search bar */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            id="coinSearchInput"
            name="coinSearch"
            placeholder="Search coin name or symbol..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl premium-input focus:outline-none text-sm text-white placeholder-gray-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#2e324d]/80 shadow-2xl">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-[#13141f] text-[#a1a7bb] text-sm font-semibold border-b border-[#2e324d]/80">
              <th className="px-6 py-4 text-left font-bold w-20">Rank</th>
              <th className="px-6 py-4 text-left font-bold">Coin</th>
              <th className="px-6 py-4 text-right font-bold">Price</th>
              <th className="px-6 py-4 text-right font-bold">24h Change</th>
              <th className="px-6 py-4 text-right font-bold">Market Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e324d]/30">
            {filteredCoins.length > 0 ? (
              filteredCoins.map((coin, index) => {
                const actualRank = (coins || []).findIndex((c) => c.id === coin.id) + 1;
                return (
                  <tr
                     key={coin.id || index}
                     className="coin-row border-b border-[#2e324d]/20 hover:bg-[#1f2233]/60 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-bold text-[#a1a7bb]">{getRankBadge(actualRank)}</td>
                    <td className="px-6 py-4">
                       <Link to={`/coin/${coin.id || ""}`} className="flex items-center group">
                        {coin.image && (
                          <img
                            src={coin.image}
                            alt={coin.name || "Coin"}
                            className="w-8 h-8 mr-3 rounded-full shadow-inner"
                          />
                        )}
                        <div>
                          <div className="font-bold text-white group-hover:text-[#3861fb] transition-colors duration-200">
                            {coin.name || "N/A"}
                          </div>
                          <div className="text-xs text-[#a1a7bb] font-mono uppercase">
                            {coin.symbol?.toUpperCase() ?? "N/A"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold">
                      ${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold font-mono ${
                          (coin.price_change_percentage_24h ?? 0) >= 0
                            ? "bg-emerald-500/10 text-[#16c784]"
                            : "bg-rose-500/10 text-[#ea3943]"
                        }`}
                      >
                        {(coin.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
                        {coin.price_change_percentage_24h?.toFixed(2) ?? "N/A"}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[#a1a7bb]">
                      ${coin.market_cap?.toLocaleString() ?? "N/A"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-lg">
                  No coins matching search criteria.
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
