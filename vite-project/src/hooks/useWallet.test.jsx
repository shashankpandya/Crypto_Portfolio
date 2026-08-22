import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { useWallet } from "./useWallet";
import { WalletContext } from "../context/WalletContext";

describe("useWallet (P2-10)", () => {
  it("reads the value provided by WalletContext.Provider", () => {
    const value = { currentAccount: "0xabc", isConnectedToSite: true };
    const wrapper = ({ children }) => (
      <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
    );
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current).toBe(value);
  });

  it("returns undefined when used outside a WalletProvider", () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current).toBeUndefined();
  });
});
