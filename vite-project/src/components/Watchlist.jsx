import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { TransactionContext } from "../context/TransactionContext";
import { searchCoins } from "../api";
import { debounce } from "../utils/debounce";
import { gsap } from "gsap";

// Lightweight SVG Sparkline component representing 7d price trends
const Sparkline = ({ data, positive }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const height = 35;
  const width = 120;
  
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="w-[120px] h-[35px]" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={positive ? "#16c784" : "#ea3943"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
};

const Watchlist = ({ coins }) => {
  const { currentAccount, fetchWatchlistDB, addToWatchlistDB, removeFromWatchlistDB } =
    useContext(TransactionContext);
  
  const [watchlist, setWatchlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

  // Load watchlist on connect
  useEffect(() => {
    const loadWatchlist = async () => {
      setIsLoading(true);
      if (currentAccount) {
        const dbCoins = await fetchWatchlistDB(currentAccount);
        setWatchlist(dbCoins);
      } else {
        const storedWatchlist =
          JSON.parse(localStorage.getItem("watchlist_anonymous")) || [];
        setWatchlist(storedWatchlist);
      }
      setIsLoading(false);
    };
    loadWatchlist();
  }, [currentAccount, fetchWatchlistDB]);

  // Stagger animate watchlist items on load or view mode change
  useEffect(() => {
    if (!isLoading && watchlist.length > 0) {
      gsap.fromTo(
        ".watchlist-item",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, [isLoading, watchlist, viewMode]);

  const handleSearch = useCallback(
    async (term) => {
      if (term.trim() === "") {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchCoins(term, coins);
        setSearchResults(results.slice(0, 5)); // Limit dropdown suggestions to 5 results
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
          localStorage.setItem(
            `watchlist_${currentAccount}`,
            JSON.stringify(updatedWatchlist)
          );
        } else {
          localStorage.setItem(
            "watchlist_anonymous",
            JSON.stringify(updatedWatchlist)
          );
        }
      }
      setSearchTerm("");
      setSearchResults([]);
    },
    [watchlist, currentAccount, addToWatchlistDB]
  );

  const memoizedRemoveFromWatchlist = useCallback(
    async (coinId) => {
      const updatedWatchlist = watchlist.filter((id) => id !== coinId);
      setWatchlist(updatedWatchlist);
      if (currentAccount) {
        await removeFromWatchlistDB(currentAccount, coinId);
        localStorage.setItem(
          `watchlist_${currentAccount}`,
          JSON.stringify(updatedWatchlist)
        );
      } else {
        localStorage.setItem(
          "watchlist_anonymous",
          JSON.stringify(updatedWatchlist)
        );
      }
    },
    [watchlist, currentAccount, removeFromWatchlistDB]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3861fb] shadow-md shadow-blue-500/20"></div>
      </div>
    );
  }

  return (
    <div className="p-8 premium-glow-card text-white rounded-3xl relative overflow-hidden max-w-6xl mx-auto animate-fade-in">
      <div className="absolute inset-0 bg-shine opacity-5 pointer-events-none"></div>

      {/* Header section with toggle buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight">
            <span className="premium-text-gradient-primary">Your Watchlist</span>
          </h2>
          <p className="text-sm text-[#a1a7bb] mt-1">Explore, monitor, and manage your preferred tokens</p>
        </div>

        <div className="flex items-center space-x-2 bg-[#0e0f17]/50 p-1 rounded-xl border border-[#2e324d]/85 self-end md:self-auto font-bold text-xs select-none">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg transition duration-200 ${
              viewMode === "grid" ? "premium-btn text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg transition duration-200 ${
              viewMode === "list" ? "premium-btn text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Autocomplete Search suggestions dropdown */}
      <div className="mb-8 relative z-30">
        <label htmlFor="watchlistSearchInput" className="block text-[#a1a7bb] text-sm font-semibold mb-2">
          Add Coin to Watchlist
        </label>
        <div className="relative">
          <input
            type="text"
            id="watchlistSearchInput"
            name="watchlistSearch"
            placeholder="Type token name or symbol (e.g. bitcoin, eth)..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full p-4 rounded-2xl text-white focus:outline-none premium-input placeholder-gray-550"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs bg-[#12131a] hover:bg-[#1a1c27] px-3 py-2 rounded-lg border border-[#2e324d] transition-all duration-200 text-gray-300 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Suggestion Dropdown Panel */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-[#12131a]/95 border border-[#2e324d] rounded-2xl shadow-2xl overflow-hidden backdrop-filter backdrop-blur-md">
            {searchResults.map((coin) => (
              <button
                key={coin.id}
                onClick={() => memoizedAddToWatchlist(coin)}
                className="w-full flex justify-between items-center px-6 py-4 hover:bg-[#1f2233]/70 transition duration-200 border-b border-[#2e324d]/30 text-left"
              >
                <span className="flex items-center">
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className="w-8 h-8 mr-3 rounded-full"
                  />
                  <span>
                    <span className="font-bold text-white">{coin.name}</span>
                    <span className="text-[#a1a7bb] text-xs font-mono ml-2">({coin.symbol.toUpperCase()})</span>
                  </span>
                </span>
                <span className="text-[#3861fb] font-bold text-sm">
                  Add +
                </span>
              </button>
            ))}
          </div>
        )}
        {isSearching && (
          <div className="absolute right-14 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#3861fb] border-t-transparent"></div>
          </div>
        )}
      </div>

      {watchlist.length === 0 ? (
        /* Styled Empty State */
        <div className="text-center py-16 px-4 bg-[#141520]/40 border border-[#2c2f45]/80 rounded-3xl max-w-xl mx-auto backdrop-filter backdrop-blur-sm shadow-xl">
          <h3 className="text-2xl font-bold mb-2 text-white">No Coins Tracked</h3>
          <p className="text-[#a1a7bb] mb-6 max-w-md mx-auto text-sm">
            Your watchlist is currently empty. Connect your wallet or search above to add assets and monitor prices.
          </p>
          <button
            onClick={() => document.getElementById("watchlistSearchInput")?.focus()}
            className="premium-btn text-white font-bold py-2.5 px-6 rounded-full transition duration-250"
          >
            Find Coins
          </button>
        </div>
      ) : (
        /* Watchlist display modes */
        <>
          {viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchlist.map((coinId) => {
                const coin = coins.find((c) => c.id === coinId);
                if (!coin) return null;
                const change24h = coin.price_change_percentage_24h ?? 0;
                return (
                  <div
                    key={coinId}
                    className="watchlist-item premium-glow-card-interactive p-5 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      {/* Token Logo & Info */}
                      <div className="flex justify-between items-start mb-4">
                        <Link to={`/coin/${coinId}`} className="flex items-center group">
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="w-10 h-10 mr-3 rounded-full shadow-lg"
                          />
                          <div>
                            <h4 className="font-bold text-white group-hover:text-[#3861fb] transition duration-200">
                              {coin.name}
                            </h4>
                            <span className="text-xs text-[#a1a7bb] font-mono font-bold uppercase">
                              {coin.symbol}
                            </span>
                          </div>
                        </Link>

                        <button
                          onClick={() => memoizedRemoveFromWatchlist(coinId)}
                          className="text-[#ea3943] hover:text-white p-1 px-2.5 text-xs font-bold bg-[#ea3943]/10 hover:bg-[#ea3943] border border-[#ea3943]/20 rounded-lg transition duration-200"
                          aria-label={`Remove ${coin.name} from watchlist`}
                        >
                          Remove
                        </button>
                      </div>

                      {/* Prices & Changes */}
                      <div className="flex justify-between items-baseline mb-3">
                        <p className="text-2xl font-black font-mono">
                          ${coin.current_price?.toLocaleString() ?? "N/A"}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                            change24h >= 0 ? "bg-emerald-500/10 text-[#16c784]" : "bg-rose-500/10 text-[#ea3943]"
                          }`}
                        >
                          {change24h >= 0 ? "+" : ""}
                          {change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Sparkline & Details */}
                    <div className="mt-4 pt-4 border-t border-[#2e324d]/30 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#a1a7bb] uppercase font-extrabold tracking-wider mb-1">
                          7d Trend
                        </span>
                        <Sparkline
                          data={coin.sparkline_in_7d?.price || []}
                          positive={change24h >= 0}
                        />
                      </div>
                      <Link
                        to={`/coin/${coinId}`}
                        className="premium-btn-secondary text-[#3861fb] font-bold text-xs py-2 px-4 rounded-xl flex items-center transition duration-200"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="overflow-x-auto rounded-2xl border border-[#2e324d]/85 shadow-2xl">
              <table className="min-w-full bg-[#181a26]/40 border-collapse">
                <thead>
                  <tr className="bg-[#13141f] text-[#a1a7bb] text-xs font-bold uppercase border-b border-[#2e324d]">
                    <th className="px-6 py-4 text-left">Token</th>
                    <th className="px-6 py-4 text-right">Price</th>
                    <th className="px-6 py-4 text-right">24h Change</th>
                    <th className="px-6 py-4 text-center">7d Sparkline</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e324d]/30">
                  {watchlist.map((coinId) => {
                    const coin = coins.find((c) => c.id === coinId);
                    if (!coin) return null;
                    const change24h = coin.price_change_percentage_24h ?? 0;
                    return (
                      <tr
                        key={coinId}
                        className="watchlist-item hover:bg-[#1f2233]/50 transition duration-200"
                      >
                        {/* Token info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/coin/${coinId}`}
                            className="flex items-center text-[#3861fb] hover:text-[#2b52e2] group"
                          >
                            <img
                              src={coin.image}
                              alt={coin.name}
                              className="w-8 h-8 mr-3 rounded-full"
                            />
                            <div>
                              <div className="font-bold text-white group-hover:text-[#3861fb] transition duration-200">
                                {coin.name}
                              </div>
                              <div className="text-xs text-[#a1a7bb] font-mono font-bold uppercase">
                                {coin.symbol}
                              </div>
                            </div>
                          </Link>
                        </td>
                        
                        {/* Price */}
                        <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-base">
                          ${coin.current_price?.toLocaleString() ?? "N/A"}
                        </td>

                        {/* 24h change */}
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-sm ${
                            change24h >= 0 ? "text-[#16c784]" : "text-[#ea3943]"
                          }`}
                        >
                          {change24h >= 0 ? "+" : ""}
                          {change24h.toFixed(2)}%
                        </td>

                        {/* Sparkline */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-center">
                            <Sparkline
                              data={coin.sparkline_in_7d?.price || []}
                              positive={change24h >= 0}
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-3">
                            <Link
                              to={`/coin/${coinId}`}
                              className="text-xs premium-btn-secondary text-[#3861fb] font-bold px-3 py-1.5 rounded-lg transition duration-200"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => memoizedRemoveFromWatchlist(coinId)}
                              className="text-[#ea3943] hover:text-white text-xs font-bold px-3 py-1.5 bg-[#ea3943]/10 hover:bg-[#ea3943] border border-[#ea3943]/20 rounded-lg transition duration-200"
                              aria-label={`Remove ${coin.name}`}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Watchlist;
