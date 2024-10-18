import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { TransactionContext } from "../context/TransactionContext";
import { searchCoins } from "../api";
import {
  FaSearch,
  FaCoins,
  FaDollarSign,
  FaChartLine,
  FaTrash,
} from "react-icons/fa";

const Watchlist = ({ coins }) => {
  const { currentAccount } = useContext(TransactionContext);
  const [watchlist, setWatchlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const storedWatchlist =
      JSON.parse(localStorage.getItem(`watchlist_${currentAccount}`)) || [];
    setWatchlist(storedWatchlist);
    setIsLoading(false);
  }, [currentAccount]);

  const handleSearch = useCallback(
    async (term) => {
      if (term.trim() === "") {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchCoins(term, coins);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching for coins:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [coins]
  );

  // Move this outside the component to avoid recreating on each render
  const debouncedSearch = debounce(handleSearch, 300);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  // Memoize this function to prevent unnecessary re-renders
  const memoizedAddToWatchlist = useCallback(
    (coin) => {
      if (!watchlist.includes(coin.id)) {
        const updatedWatchlist = [...watchlist, coin.id];
        setWatchlist(updatedWatchlist);
        localStorage.setItem(
          `watchlist_${currentAccount}`,
          JSON.stringify(updatedWatchlist)
        );
      }
      setSearchTerm("");
      setSearchResults([]);
    },
    [watchlist, currentAccount]
  );

  // Memoize this function as well
  const memoizedRemoveFromWatchlist = useCallback(
    (coinId) => {
      const updatedWatchlist = watchlist.filter((id) => id !== coinId);
      setWatchlist(updatedWatchlist);
      localStorage.setItem(
        `watchlist_${currentAccount}`,
        JSON.stringify(updatedWatchlist)
      );
    },
    [watchlist, currentAccount]
  );

  if (isLoading) {
    return <div className="text-white">Loading watchlist...</div>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-4xl font-bold mb-8 text-teal-400">Your Watchlist</h2>
      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Search for a token by name or symbol"
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full p-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition duration-300"
        />
        <FaSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>
      {isSearching && (
        <div className="text-center text-gray-400 mb-4">Searching...</div>
      )}
      {searchResults.length > 0 && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-md">
          {searchResults.map((coin) => (
            <div
              key={coin.id}
              className="flex justify-between items-center mb-3 p-2 hover:bg-gray-700 rounded transition duration-300"
            >
              <span className="flex items-center">
                <img
                  src={coin.image}
                  alt={coin.name}
                  className="w-8 h-8 mr-3 rounded-full"
                />
                <span>
                  {coin.name} ({coin.symbol.toUpperCase()})
                </span>
              </span>
              <button
                onClick={() => memoizedAddToWatchlist(coin)}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 transform hover:scale-105"
              >
                Add to Watchlist
              </button>
            </div>
          ))}
        </div>
      )}
      {watchlist.length === 0 ? (
        <p className="text-center text-gray-400 text-lg">
          Your watchlist is empty. Use the search bar to add coins.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <span className="flex items-center">
                    <FaCoins className="mr-2" /> Name
                  </span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <span className="flex items-center">
                    <FaDollarSign className="mr-2" /> Current Price (USD)
                  </span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <span className="flex items-center">
                    <FaChartLine className="mr-2" /> 24h Change (%)
                  </span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {watchlist.map((coinId) => {
                const coin = coins.find((c) => c.id === coinId);
                return coin ? (
                  <tr
                    key={coinId}
                    className="hover:bg-gray-700 transition duration-300"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/coin/${coinId}`}
                        className="flex items-center text-teal-400 hover:text-teal-300"
                      >
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-8 h-8 mr-3 rounded-full"
                        />
                        <div>
                          <div className="font-medium">{coin.name}</div>
                          <div className="text-sm text-gray-400">
                            {coin.symbol.toUpperCase()}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${coin.current_price.toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap ${
                        coin.price_change_percentage_24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {coin.price_change_percentage_24h.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => memoizedRemoveFromWatchlist(coinId)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 transform hover:scale-105 flex items-center"
                      >
                        <FaTrash className="mr-2" /> Remove
                      </button>
                    </td>
                  </tr>
                ) : null;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Watchlist;

// Add this utility function at the end of the file
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
