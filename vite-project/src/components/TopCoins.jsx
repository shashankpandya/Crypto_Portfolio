import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaSearch, FaCoins, FaDollarSign, FaChartLine, FaTrophy } from "react-icons/fa";
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
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 font-black text-xs shadow-md shadow-yellow-500/20">
          <FaTrophy className="text-xs" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900 font-black text-xs shadow-md shadow-gray-400/20">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-black text-xs shadow-md shadow-amber-700/20">
          3
        </span>
      );
    }
    return <span className="text-gray-400 font-mono text-sm font-semibold">{rank}</span>;
  };

  return (
    <div className="w-full bg-gray-800 bg-opacity-50 text-white rounded-2xl shadow-2xl p-8 mt-12 border border-gray-700 backdrop-filter backdrop-blur-sm">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-teal-400 flex items-center">
          <FaCoins className="mr-2 text-teal-500" /> Explore Top Crypto Coins
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
            className="w-full px-4 py-2.5 pl-10 rounded-lg bg-gray-900 bg-opacity-80 border border-gray-750 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm text-white placeholder-gray-500 transition-all duration-300"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <FaSearch className="text-gray-500 text-xs" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-900 bg-opacity-70 text-gray-300 text-sm font-semibold border-b border-gray-700">
              <th className="px-6 py-4 text-left font-bold w-20">Rank</th>
              <th className="px-6 py-4 text-left font-bold">Coin</th>
              <th className="px-6 py-4 text-right font-bold">
                <span className="flex items-center justify-end">
                  <FaDollarSign className="mr-1 text-teal-500 text-xs" /> Price
                </span>
              </th>
              <th className="px-6 py-4 text-right font-bold">
                <span className="flex items-center justify-end">
                  <FaChartLine className="mr-1 text-teal-500 text-xs" /> 24h Change
                </span>
              </th>
              <th className="px-6 py-4 text-right font-bold">Market Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredCoins.length > 0 ? (
              filteredCoins.map((coin, index) => {
                // Find actual rank in the original list
                const actualRank = (coins || []).findIndex((c) => c.id === coin.id) + 1;
                return (
                  <tr
                    key={coin.id || index}
                    className="coin-row border-b border-gray-750 hover:bg-gray-700 hover:bg-opacity-40 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-bold text-gray-400">{getRankBadge(actualRank)}</td>
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
                          <div className="font-bold text-white group-hover:text-teal-400 transition-colors duration-200">
                            {coin.name || "N/A"}
                          </div>
                          <div className="text-xs text-gray-400 font-mono uppercase">
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
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {(coin.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
                        {coin.price_change_percentage_24h?.toFixed(2) ?? "N/A"}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-300">
                      ${coin.market_cap?.toLocaleString() ?? "N/A"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-lg">
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
