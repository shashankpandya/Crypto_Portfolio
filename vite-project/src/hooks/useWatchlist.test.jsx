import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { useWatchlist } from "./useWatchlist";
import { WatchlistContext } from "../context/WatchlistContext";

describe("useWatchlist (P2-11)", () => {
  it("reads the value provided by WatchlistContext.Provider", () => {
    const value = { getLocalWatchlist: () => ["bitcoin"] };
    const wrapper = ({ children }) => (
      <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
    );
    const { result } = renderHook(() => useWatchlist(), { wrapper });
    expect(result.current).toBe(value);
  });

  it("returns undefined when used outside a WatchlistProvider", () => {
    const { result } = renderHook(() => useWatchlist());
    expect(result.current).toBeUndefined();
  });
});
