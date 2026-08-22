import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { TransactionContext } from "../context/TransactionContext";
import { useWatchlist } from "../hooks/useWatchlist";
import { searchCoins } from "../api";
import { debounce } from "../utils/debounce";

const generateSparklinePath = (id, change24h) => {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const points = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * 50;
    let y = 12 + Math.sin((hash + i) * 1.1) * 7;
    y += (change24h > 0 ? (count - i) * 0.4 : (i - count) * 0.4);
    y = Math.max(3, Math.min(21, y));
    points.push(`${x},${y}`);
  }
  return `M ${points.join(" L ")}`;
};

const TelescopeIcon = () => (
  <svg className="w-10 h-10 text-[#71717a] mb-3 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.08 9.08l-5.66 5.66M14.32 4.84l4.95 4.95M11.5 7.67l2.83-2.83" />
    <path d="M19 19l-4-4M10 21l3-6M4 21l8-8" />
    <circle cx="12.2" cy="6.2" r="1.5" />
  </svg>
);

const Watchlist = ({ coins }) => {
  const { currentAccount, fetchWatchlistDB, addToWatchlistDB, removeFromWatchlistDB } =
    useContext(TransactionContext);
  const { getAnonymousWatchlist, addToAnonymousWatchlist, removeFromAnonymousWatchlist } =
    useWatchlist();

  const [watchlist, setWatchlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Load watchlist on connect
  useEffect(() => {
    const loadWatchlist = async () => {
      setIsLoading(true);
      if (currentAccount) {
        const dbCoins = await fetchWatchlistDB(currentAccount);
        setWatchlist(dbCoins);
      } else {
        setWatchlist(getAnonymousWatchlist());
      }
      setIsLoading(false);
    };
    loadWatchlist();
  }, [currentAccount, fetchWatchlistDB, getAnonymousWatchlist]);

  const handleSearch = useCallback(
    async (term) => {
      if (term.trim() === "") {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchCoins(term, coins);
        setSearchResults(results.slice(0, 5));
      } catch (error) {
        console.error("Error searching for coins:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [coins]
  );

  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    [handleSearch]
  );

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const memoizedAddToWatchlist = useCallback(
    async (coin) => {
      if (!watchlist.includes(coin.id)) {
        const updatedWatchlist = [...watchlist, coin.id];
        setWatchlist(updatedWatchlist);
        if (currentAccount) {
          await addToWatchlistDB(currentAccount, coin.id);
        } else {
          addToAnonymousWatchlist(coin.id);
        }
      }
      setSearchTerm("");
      setSearchResults([]);
    },
    [watchlist, currentAccount, addToWatchlistDB, addToAnonymousWatchlist]
  );

  const memoizedRemoveFromWatchlist = useCallback(
    async (coinId) => {
      const updatedWatchlist = watchlist.filter((id) => id !== coinId);
      setWatchlist(updatedWatchlist);
      if (currentAccount) {
        await removeFromWatchlistDB(currentAccount, coinId);
      } else {
        removeFromAnonymousWatchlist(coinId);
      }
    },
    [watchlist, currentAccount, removeFromWatchlistDB, removeFromAnonymousWatchlist]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF385C]"></div>
      </div>
    );
  }

  return (
    <div className="page-container text-white">
      {/* Compact inline page header row */}
      <div className="flex items-center justify-between mb-5 pt-6">
        <div>
          <h1 className="text-base font-semibold text-white">Watchlist</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track your favorite assets</p>
        </div>
      </div>

      {/* Autocomplete Search suggestions dropdown */}
      <div className="mb-6 relative max-w-lg mx-auto w-full z-30">
        <div className="relative">
          <input
            type="text"
            id="watchlistSearchInput"
            name="watchlistSearch"
            placeholder="Type token name or symbol (e.g. bitcoin, eth)..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full h-10 px-3 pr-10 text-xs rounded bg-[#060912] border border-white/5 text-white placeholder-[#71717a] focus:outline-none focus:border-[#2563EB] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[10px] text-[#71717a] hover:text-white"
            >
              Clear
            </button>
          )}
          {isSearching && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-3 w-3 border border-[#FF385C] border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Suggestion Dropdown Panel */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-[#0c1118] border border-white/5 rounded-lg shadow-2xl overflow-hidden">
            {searchResults.map((coin) => (
              <button
                key={coin.id}
                onClick={() => memoizedAddToWatchlist(coin)}
                className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] text-left text-xs"
              >
                <span className="flex items-center">
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className="w-5 h-5 mr-2 rounded-full"
                  />
                  <span>
                    <span className="font-bold text-white">{coin.name}</span>
                    <span className="text-[#71717a] text-[10px] font-mono ml-1.5 uppercase">({coin.symbol})</span>
                  </span>
                </span>
                <span className="text-[#38BDF8] font-bold text-[11px] hover:text-[#2563EB]">
                  + Add
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {watchlist.length === 0 ? (
        /* Styled Empty State - Inline */
        <div className="text-center py-16">
          <TelescopeIcon />
          <p className="text-slate-600 text-sm mt-3 font-medium">No coins tracked yet</p>
          <p className="text-slate-700 text-xs mt-1">Search above to add your first asset</p>
        </div>
      ) : (
        /* Dense Table View */
        <div className="overflow-x-auto border border-white/5 rounded-lg bg-[#0c1118] shadow-lg max-w-3xl mx-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-transparent text-slate-600 text-[10px] tracking-[0.12em] uppercase font-semibold border-b border-white/5 select-none">
                <th className="px-4 py-2.5 text-left">Asset</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right w-24">Change (24h)</th>
                <th className="px-4 py-2.5 text-center w-24">Trend</th>
                <th className="px-4 py-2.5 text-right w-16">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {watchlist.map((coinId) => {
                const coin = coins.find((c) => c.id === coinId);
                if (!coin) return null;
                const change24h = coin.price_change_percentage_24h ?? 0;
                const isPositive = change24h >= 0;
                return (
                  <tr
                    key={coinId}
                    className="group hover:bg-white/[0.025] transition-colors duration-100 cursor-pointer h-11 items-center"
                  >
                    <td className="px-4 py-2">
                      <Link to={`/coin/${coinId}`} className="flex items-center">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-6 h-6 mr-2 rounded-full"
                        />
                        <div className="leading-tight">
                          <span className="font-bold text-xs text-white group-hover:text-[#FF385C] transition-colors duration-150">
                            {coin.name}
                          </span>
                          <span className="text-[10px] text-[#71717a] font-mono uppercase ml-1.5">
                            {coin.symbol}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-xs text-white">
                      ${coin.current_price?.toLocaleString() ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`tabular-nums text-xs font-medium ${
                          isPositive ? "text-[#10B981]" : "text-[#EF4444]"
                        }`}
                      >
                        {isPositive ? "▲ " : "▼ "}
                        {Math.abs(change24h).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center items-center">
                        <svg className="w-16 h-6" viewBox="0 0 50 24" fill="none">
                          <path
                            d={generateSparklinePath(coin.id, change24h)}
                            stroke={isPositive ? "#10B981" : "#F43F5E"}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animate-sparkline"
                          />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => memoizedRemoveFromWatchlist(coinId)}
                        className="text-[#EF4444] hover:text-white p-1 rounded font-bold text-sm leading-none transition duration-150 inline-flex items-center justify-center w-6 h-6 hover:bg-[#EF4444]/15"
                        title={`Remove ${coin.name}`}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
