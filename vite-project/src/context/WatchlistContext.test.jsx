import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import axios from "axios";
import { WatchlistProvider } from "./WatchlistContext";
import { useWatchlist } from "../hooks/useWatchlist";

vi.mock("axios");

const ADDRESS = "0xAbCdEf0000000000000000000000000000000A";
const wrapper = ({ children }) => <WatchlistProvider>{children}</WatchlistProvider>;

describe("WatchlistProvider (P2-11 / P6-01)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("anonymous watchlist", () => {
    it("adds and removes coins under the watchlist_anonymous key", () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      act(() => {
        result.current.addToAnonymousWatchlist("bitcoin");
      });
      expect(JSON.parse(localStorage.getItem("watchlist_anonymous"))).toEqual(["bitcoin"]);

      act(() => {
        result.current.removeFromAnonymousWatchlist("bitcoin");
      });
      expect(JSON.parse(localStorage.getItem("watchlist_anonymous"))).toEqual([]);
    });

    it("does not duplicate an id already in the anonymous list", () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });
      act(() => {
        result.current.addToAnonymousWatchlist("bitcoin");
        result.current.addToAnonymousWatchlist("bitcoin");
      });
      expect(JSON.parse(localStorage.getItem("watchlist_anonymous"))).toEqual(["bitcoin"]);
    });
  });

  describe("DB-backed watchlist (rollback on failure)", () => {
    it("addToWatchlistDB writes to localStorage only after the API call succeeds", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      let outcome;
      await act(async () => {
        outcome = await result.current.addToWatchlistDB(ADDRESS, "ethereum");
      });

      expect(outcome).toEqual({ success: true });
      expect(JSON.parse(localStorage.getItem(`watchlist_${ADDRESS.toLowerCase()}`))).toEqual([
        "ethereum",
      ]);
    });

    it("addToWatchlistDB does NOT write to localStorage when the API call fails", async () => {
      axios.post.mockRejectedValueOnce(new Error("500"));
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      let outcome;
      await act(async () => {
        outcome = await result.current.addToWatchlistDB(ADDRESS, "ethereum");
      });

      expect(outcome).toEqual({ success: false });
      expect(localStorage.getItem(`watchlist_${ADDRESS.toLowerCase()}`)).toBeNull();
    });

    it("removeFromWatchlistDB writes to localStorage only after the API call succeeds", async () => {
      localStorage.setItem(`watchlist_${ADDRESS.toLowerCase()}`, JSON.stringify(["ethereum"]));
      axios.delete.mockResolvedValueOnce({ data: { success: true } });
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      let outcome;
      await act(async () => {
        outcome = await result.current.removeFromWatchlistDB(ADDRESS, "ethereum");
      });

      expect(outcome).toEqual({ success: true });
      expect(JSON.parse(localStorage.getItem(`watchlist_${ADDRESS.toLowerCase()}`))).toEqual([]);
    });

    it("removeFromWatchlistDB does NOT touch localStorage when the API call fails (rollback stays intact)", async () => {
      localStorage.setItem(`watchlist_${ADDRESS.toLowerCase()}`, JSON.stringify(["ethereum"]));
      axios.delete.mockRejectedValueOnce(new Error("500"));
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      let outcome;
      await act(async () => {
        outcome = await result.current.removeFromWatchlistDB(ADDRESS, "ethereum");
      });

      expect(outcome).toEqual({ success: false });
      expect(JSON.parse(localStorage.getItem(`watchlist_${ADDRESS.toLowerCase()}`))).toEqual([
        "ethereum",
      ]);
    });
  });

  describe("syncLocalWatchlistToDB", () => {
    it("merges the anonymous watchlist into the user watchlist and clears the anonymous key", async () => {
      localStorage.setItem("watchlist_anonymous", JSON.stringify(["bitcoin"]));
      axios.get.mockResolvedValueOnce({ data: { success: true, data: { coins: [] } } });
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await act(async () => {
        await result.current.syncLocalWatchlistToDB(ADDRESS);
      });

      expect(localStorage.getItem("watchlist_anonymous")).toBeNull();
      expect(JSON.parse(localStorage.getItem(`watchlist_${ADDRESS.toLowerCase()}`))).toContain(
        "bitcoin"
      );
      expect(axios.post).toHaveBeenCalledWith(
        `/api/watchlist/${ADDRESS.toLowerCase()}/coins`,
        { coinId: "bitcoin" }
      );
    });

    it("does nothing when the merged local watchlist is empty", async () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await act(async () => {
        await result.current.syncLocalWatchlistToDB(ADDRESS);
      });
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
