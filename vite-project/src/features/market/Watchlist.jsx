import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useWatchlist } from "../../hooks/useWatchlist";
import { searchCoins, fetchCoinsByIds } from "../../api";
import { debounce } from "../../utils/debounce";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { COLORS } from "../../utils/tokens";

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
  <svg className="w-10 h-10 text-muted mb-3 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.08 9.08l-5.66 5.66M14.32 4.84l4.95 4.95M11.5 7.67l2.83-2.83" />
    <path d="M19 19l-4-4M10 21l3-6M4 21l8-8" />
    <circle cx="12.2" cy="6.2" r="1.5" />
  </svg>
);

/**
 * TrendingPicker — replaces the dead-end "no coins yet" message with a live
 * top-gainers grid pulled from the same market data already on the page, so
 * an empty watchlist is an invitation to act rather than a blank screen.
 */
const TrendingPicker = ({ coins, onAdd }) => {
  const trending = useMemo(
    () =>
      [...(coins || [])]
        .filter((c) => typeof c.price_change_percentage_24h === "number")
        .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
        .slice(0, 6),
    [coins]
  );

  if (trending.length === 0) return null;

  return (
    <div className="mt-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-3 justify-center">
        <span className="text-positive text-xs">▲</span>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Trending today — top gainers
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {trending.map((coin) => (
          <button
            key={coin.id}
            onClick={() => onAdd(coin)}
            className="group flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-raised border border-white/5 hover:border-positive/30 hover:-translate-y-px transition-all duration-150 text-left"
          >
            <span className="flex items-center min-w-0">
              {coin.image && (
                <img src={coin.image} alt="" className="w-7 h-7 mr-2.5 rounded-full flex-shrink-0" />
              )}
              <span className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">{coin.name}</span>
                <span className="block text-[10px] font-mono text-positive">
                  ▲ {coin.price_change_percentage_24h.toFixed(2)}%
                </span>
              </span>
            </span>
            <span className="text-[10px] font-bold text-slate-600 group-hover:text-positive transition-colors flex-shrink-0">
              + Add
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Watchlist = ({ coins }) => {
  const { currentAccount } = useWallet();
  const { notify } = useToast();
  const {
    fetchWatchlistDB,
    addToWatchlistDB,
    removeFromWatchlistDB,
    getAnonymousWatchlist,
    addToAnonymousWatchlist,
    removeFromAnonymousWatchlist,
  } = useWatchlist();

  const [watchlist, setWatchlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  // Coins watched but outside the top-100 `coins` prop (P4-05) — fetched
  // individually by id so they still render instead of silently vanishing.
  const [missingCoinsData, setMissingCoinsData] = useState({});
  const [mutationError, setMutationError] = useState(null);

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

  // Fetch coins outside the top-100 fetch in a single batched request by id
  // (P5-06, completing the P4-05 fix at the data layer — that version made
  // N individual /coins/:id calls; this makes one /coins/markets?ids=... call).
  useEffect(() => {
    const topCoinIds = new Set((coins || []).map((c) => c.id));
    const missingIds = watchlist.filter(
      (id) => !topCoinIds.has(id) && !(id in missingCoinsData)
    );
    if (missingIds.length === 0) return;

    let cancelled = false;
    fetchCoinsByIds(missingIds)
      .then((results) => {
        if (cancelled) return;
        const byId = new Map(results.map((c) => [c.id, c]));
        setMissingCoinsData((prev) => {
          const next = { ...prev };
          for (const id of missingIds) {
            // A coin id CoinGecko doesn't recognize is simply absent from
            // the response — treated as a per-row failure, not a batch failure.
            next[id] = byId.get(id) || { id, failed: true };
          }
          return next;
        });
      })
      .catch((err) => {
        console.error("Failed to fetch watchlist coins by id:", err);
        if (!cancelled) {
          setMissingCoinsData((prev) => {
            const next = { ...prev };
            for (const id of missingIds) {
              next[id] = { id, failed: true };
            }
            return next;
          });
          notify({ variant: "error", message: "Couldn't load prices for some watchlist coins." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [coins, watchlist, missingCoinsData, notify]);

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
        notify({ variant: "error", message: "Coin search failed. Please try again." });
      } finally {
        setIsSearching(false);
      }
    },
    [coins, notify]
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
        const previousWatchlist = watchlist;
        setWatchlist([...watchlist, coin.id]);
        if (currentAccount) {
          const result = await addToWatchlistDB(currentAccount, coin.id);
          if (!result?.success) {
            setWatchlist(previousWatchlist);
            setMutationError(`Failed to add ${coin.name || coin.id} to your watchlist. Please try again.`);
          }
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
      const previousWatchlist = watchlist;
      setWatchlist(watchlist.filter((id) => id !== coinId));
      if (currentAccount) {
        const result = await removeFromWatchlistDB(currentAccount, coinId);
        if (!result?.success) {
          setWatchlist(previousWatchlist);
          setMutationError(`Failed to remove ${coinId} from your watchlist. Please try again.`);
        }
      } else {
        removeFromAnonymousWatchlist(coinId);
      }
    },
    [watchlist, currentAccount, removeFromWatchlistDB, removeFromAnonymousWatchlist]
  );

  return (
    <div className="page-container text-white">
      {/* Compact inline page header row */}
      <div className="flex items-center justify-between mb-5 pt-6">
        <div>
          <h1 className="text-base font-semibold text-white">Watchlist</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track your favorite assets</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-xs max-w-3xl mx-auto" role="status" aria-label="Loading watchlist">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : (
        <>
      {mutationError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-negative/20 bg-negative/5 px-4 py-2.5 text-xs text-negative max-w-lg mx-auto w-full"
        >
          <span>{mutationError}</span>
          <button
            onClick={() => setMutationError(null)}
            aria-label="Dismiss error"
            className="text-negative hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

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
            className="w-full h-10 px-3 pr-10 text-xs rounded bg-base border border-white/5 text-white placeholder-muted focus:outline-none focus:border-cobalt transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[10px] text-muted hover:text-white"
            >
              Clear
            </button>
          )}
          {isSearching && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-3 w-3 border border-coral border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Suggestion Dropdown Panel */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-surface-raised border border-white/5 rounded-lg shadow-2xl overflow-hidden">
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
                    <span className="text-muted text-[10px] font-mono ml-1.5 uppercase">({coin.symbol})</span>
                  </span>
                </span>
                <span className="text-cobalt font-bold text-[11px] hover:text-cobalt">
                  + Add
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {watchlist.length === 0 ? (
        <>
        <EmptyState
          icon={<TelescopeIcon />}
          title="No coins tracked yet"
          description="Search above to add your first asset"
          className="max-w-lg mx-auto"
        />
        <TrendingPicker coins={coins} onAdd={memoizedAddToWatchlist} />
        </>
      ) : (
        /* Dense Table View */
        <div className="overflow-x-auto border border-white/5 rounded-lg bg-surface-raised shadow-lg max-w-3xl mx-auto">
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
                const coin = coins.find((c) => c.id === coinId) || missingCoinsData[coinId];

                if (!coin) {
                  return (
                    <tr key={coinId} className="h-11">
                      <td colSpan={5} className="px-4 py-2 text-xs text-muted italic">
                        Loading {coinId}...
                      </td>
                    </tr>
                  );
                }

                if (coin.failed) {
                  return (
                    <tr key={coinId} className="h-11">
                      <td className="px-4 py-2 text-xs text-white">{coinId}</td>
                      <td colSpan={3} className="px-4 py-2 text-xs text-muted italic">
                        Price data unavailable
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => memoizedRemoveFromWatchlist(coinId)}
                          className="text-negative hover:text-white p-1 rounded font-bold text-sm leading-none transition duration-150 inline-flex items-center justify-center w-6 h-6 hover:bg-negative/15"
                          title={`Remove ${coinId}`}
                          aria-label={`Remove ${coinId} from watchlist`}
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  );
                }

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
                          <span className="font-bold text-xs text-white group-hover:text-coral transition-colors duration-150">
                            {coin.name}
                          </span>
                          <span className="text-[10px] text-muted font-mono uppercase ml-1.5">
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
                          isPositive ? "text-positive" : "text-negative"
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
                            stroke={isPositive ? COLORS.positive : COLORS.negative}
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
                        className="text-negative hover:text-white p-1 rounded font-bold text-sm leading-none transition duration-150 inline-flex items-center justify-center w-6 h-6 hover:bg-negative/15"
                        title={`Remove ${coin.name}`}
                        aria-label={`Remove ${coin.name} from watchlist`}
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
        </>
      )}
    </div>
  );
};

export default Watchlist;
