import React from "react";
import axios from "axios";

export const WatchlistContext = React.createContext();

// ---------------------------------------------------------------------------
// localStorage key helpers — the ONE place `watchlist_*` keys are read from
// or written to. (P2-11: consolidated out of TransactionContext.jsx,
// CoinDetails.jsx, and Watchlist.jsx, which each had their own copy of this
// read/modify/write logic.)
// ---------------------------------------------------------------------------
const ANON_KEY = "watchlist_anonymous";
const userKey = (address) => `watchlist_${address.toLowerCase()}`;

const readList = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

const writeList = (key, list) => {
  localStorage.setItem(key, JSON.stringify(list));
};

/**
 * WatchlistProvider (P2-11) — owns all watchlist localStorage read/write
 * (anonymous + per-account keys), the watchlist REST calls, and the
 * anonymous->connected sync-on-connect behavior. Extracted from
 * TransactionContext.jsx, CoinDetails.jsx, and Watchlist.jsx.
 */
export const WatchlistProvider = ({ children }) => {
  const getAnonymousWatchlist = React.useCallback(() => readList(ANON_KEY), []);

  const addToAnonymousWatchlist = React.useCallback((coinId) => {
    const list = readList(ANON_KEY);
    if (!list.includes(coinId)) {
      list.push(coinId);
      writeList(ANON_KEY, list);
    }
    return list;
  }, []);

  const removeFromAnonymousWatchlist = React.useCallback((coinId) => {
    const list = readList(ANON_KEY).filter((id) => id !== coinId);
    writeList(ANON_KEY, list);
    return list;
  }, []);

  const getLocalWatchlist = React.useCallback((address) => {
    if (!address) return readList(ANON_KEY);
    return readList(userKey(address));
  }, []);

  const fetchWatchlistDB = React.useCallback(async (address) => {
    try {
      const addrLower = address.toLowerCase();
      const res = await axios.get(`/api/watchlist/${addrLower}`);
      if (res.data.success) {
        return res.data.data.coins.map((c) => c.coinId);
      }
    } catch (err) {
      console.error("Failed to fetch watchlist from DB:", err);
    }
    return [];
  }, []);

  const addToWatchlistDB = React.useCallback(async (address, coinId) => {
    try {
      const addrLower = address.toLowerCase();
      await axios.post(`/api/watchlist/${addrLower}/coins`, { coinId });
    } catch (err) {
      console.error("Failed to add to watchlist DB:", err);
      return { success: false };
    }
    const key = userKey(address);
    const list = readList(key);
    if (!list.includes(coinId)) {
      list.push(coinId);
      writeList(key, list);
    }
    return { success: true };
  }, []);

  const removeFromWatchlistDB = React.useCallback(async (address, coinId) => {
    try {
      const addrLower = address.toLowerCase();
      await axios.delete(`/api/watchlist/${addrLower}/coins/${coinId}`);
    } catch (err) {
      console.error("Failed to remove from watchlist DB:", err);
      return { success: false };
    }
    const key = userKey(address);
    writeList(key, readList(key).filter((id) => id !== coinId));
    return { success: true };
  }, []);

  const syncLocalWatchlistToDB = React.useCallback(async (address) => {
    try {
      const addrLower = address.toLowerCase();
      const userWatchlistKey = userKey(address);
      const mixedCaseKey = `watchlist_${address}`;

      let localWatchlist = readList(userWatchlistKey);

      // Migrate from mixed-case key if it exists and is different
      if (mixedCaseKey !== userWatchlistKey) {
        const mixedWatchlist = JSON.parse(localStorage.getItem(mixedCaseKey));
        if (mixedWatchlist) {
          localWatchlist = [...new Set([...localWatchlist, ...mixedWatchlist])];
          localStorage.removeItem(mixedCaseKey);
        }
      }

      // Merge anonymous watchlist if present
      const anonWatchlist = readList(ANON_KEY);
      if (anonWatchlist.length > 0) {
        localWatchlist = [...new Set([...localWatchlist, ...anonWatchlist])];
        localStorage.removeItem(ANON_KEY);
      }

      // Save merged list back to lowercase user key
      writeList(userWatchlistKey, localWatchlist);

      if (localWatchlist.length === 0) return;

      const res = await axios.get(`/api/watchlist/${addrLower}`);
      const dbCoins = res.data.success ? res.data.data.coins.map((c) => c.coinId) : [];

      for (const coinId of localWatchlist) {
        if (!dbCoins.includes(coinId)) {
          await axios.post(`/api/watchlist/${addrLower}/coins`, { coinId });
        }
      }
      console.log("[Watchlist] Local watchlist synced to database.");
    } catch (err) {
      console.error("Error syncing watchlist to DB:", err);
    }
  }, []);

  const value = {
    fetchWatchlistDB,
    addToWatchlistDB,
    removeFromWatchlistDB,
    syncLocalWatchlistToDB,
    getAnonymousWatchlist,
    addToAnonymousWatchlist,
    removeFromAnonymousWatchlist,
    getLocalWatchlist,
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
};
