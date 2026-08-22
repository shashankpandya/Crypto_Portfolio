import { useContext } from "react";
import { WatchlistContext } from "../context/WatchlistContext";

/**
 * useWatchlist (P2-11) — reads watchlist localStorage/REST-sync state and
 * mutation functions from WatchlistContext. Must be used within a
 * WatchlistProvider.
 */
export const useWatchlist = () => useContext(WatchlistContext);
