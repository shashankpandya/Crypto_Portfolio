import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { useContract } from "./useContract";
import { ContractContext } from "../context/ContractContext";

describe("useContract (P2-12)", () => {
  it("reads the value provided by ContractContext.Provider", () => {
    const value = { isAdmin: true, feePercentage: "1" };
    const wrapper = ({ children }) => (
      <ContractContext.Provider value={value}>{children}</ContractContext.Provider>
    );
    const { result } = renderHook(() => useContract(), { wrapper });
    expect(result.current).toBe(value);
  });

  it("returns undefined when used outside a ContractProvider", () => {
    const { result } = renderHook(() => useContract());
    expect(result.current).toBeUndefined();
  });
});
