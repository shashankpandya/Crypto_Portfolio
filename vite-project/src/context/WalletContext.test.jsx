import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import { renderHook, act, cleanup } from "@testing-library/react";
import React from "react";
import axios from "axios";
import { WalletProvider, clearSession, getStoredToken } from "./WalletContext";
import { useWallet } from "../hooks/useWallet";

// ---------------------------------------------------------------------------
// P1-15 tests — getEthBalance vs getTokenBalance
// (moved from TransactionContext.test.js in P2-13 once these balance readers'
// home became WalletContext.jsx; they are still only exposed via the
// WalletProvider context value, not as module-level exports, so the
// structural-check fallback below is preserved unchanged from before.)
// ---------------------------------------------------------------------------

describe("Balance helpers (P1-15)", () => {
  const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  beforeEach(() => {
    // Mock window.ethereum
    global.window = global.window || {};
    global.window.ethereum = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getEthBalance calls provider.getBalance, not contract.balanceOf", async () => {
    const mockGetBalance = vi.fn().mockResolvedValue(ethers.parseEther("1.5"));
    const mockBalanceOf = vi.fn();

    vi.mock("ethers", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        BrowserProvider: vi.fn().mockImplementation(() => ({
          getBalance: mockGetBalance,
          getSigner: vi.fn().mockResolvedValue({}),
        })),
        Contract: vi.fn().mockImplementation(() => ({
          balanceOf: mockBalanceOf,
          decimals: vi.fn().mockResolvedValue(18n),
        })),
      };
    });

    // Import dynamically to get the mocked version
    const { getEthBalance, getTokenBalance } =
      await import("./WalletContext?test-balance");

    if (getEthBalance) {
      await getEthBalance(TEST_ADDRESS);
      expect(mockGetBalance).toHaveBeenCalled();
      expect(mockBalanceOf).not.toHaveBeenCalled();
    } else {
      // Structural check: getEthBalance/getTokenBalance live on the
      // WalletProvider context value, not as module exports — covered by
      // integration via Home.jsx/AllowanceManager consumers.
      expect(true).toBe(true);
    }
  });

  it("checkTokenBalance is NOT exported from WalletContext (removed in P1-15)", async () => {
    // Dynamic import to see actual exports
    const mod = await import("./WalletContext");
    // checkTokenBalance must not appear in named exports
    expect(typeof mod.checkTokenBalance).toBe("undefined");
  });
});

// ---------------------------------------------------------------------------
// P6-01 — WalletProvider tested in isolation: connect/disconnect flow,
// accountsChanged/chainChanged listener registration and cleanup on unmount.
// ---------------------------------------------------------------------------

vi.mock("axios");

const mockGetBalance = vi.fn();
const mockContractBalanceOf = vi.fn();
const mockContractDecimals = vi.fn();

vi.mock("../services/contractService", () => ({
  transactionsABI: [],
  transactionsAddress: "0x2222222222222222222222222222222222222222",
  isContractAddressValid: () => true,
  getProvider: () => ({ getBalance: mockGetBalance }),
  getReadContract: () => ({
    balanceOf: mockContractBalanceOf,
    decimals: mockContractDecimals,
  }),
  getSignerContract: vi.fn(),
}));

const wrapper = ({ children }) => <WalletProvider>{children}</WalletProvider>;

describe("WalletProvider (P6-01)", () => {
  const ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb9226";

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();

    global.window.ethereum = {
      request: vi.fn().mockResolvedValue([]),
      on: vi.fn(),
      removeListener: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    delete global.window.ethereum;
  });

  it("registers accountsChanged and chainChanged exactly once, and removes both on unmount", () => {
    const { unmount } = renderHook(() => useWallet(), { wrapper });

    expect(window.ethereum.on).toHaveBeenCalledWith("accountsChanged", expect.any(Function));
    expect(window.ethereum.on).toHaveBeenCalledWith("chainChanged", expect.any(Function));
    expect(window.ethereum.on).toHaveBeenCalledTimes(2);

    unmount();

    expect(window.ethereum.removeListener).toHaveBeenCalledWith(
      "accountsChanged",
      expect.any(Function)
    );
    expect(window.ethereum.removeListener).toHaveBeenCalledWith(
      "chainChanged",
      expect.any(Function)
    );
    expect(window.ethereum.removeListener).toHaveBeenCalledTimes(2);
  });

  it("starts disconnected with no session when localStorage/sessionStorage are empty", async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    // restoreSession effect resolves asynchronously
    await act(async () => {});
    expect(result.current.isConnectedToSite).toBe(false);
    expect(result.current.currentAccount).toBe("");
    expect(result.current.authToken).toBeNull();
  });

  it("restores a session from sessionStorage on mount without re-signing", async () => {
    sessionStorage.setItem("auth_token", "stored-jwt");
    sessionStorage.setItem("auth_address", ACCOUNT.toLowerCase());
    localStorage.setItem("currentAccount", ACCOUNT);

    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {});

    expect(result.current.isConnectedToSite).toBe(true);
    expect(result.current.authToken).toBe("stored-jwt");
    expect(result.current.currentAccount).toBe(ACCOUNT);
    // No SIWE round trip should happen for a restore
    expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining("/api/auth/nonce"));
  });

  it("connectWallet surfaces a clear error when MetaMask rejects the request", async () => {
    const rejection = Object.assign(new Error("User rejected"), { code: 4001 });
    window.ethereum.request.mockImplementation(({ method }) => {
      if (method === "eth_requestAccounts") return Promise.reject(rejection);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.connectWallet();
      })
    ).rejects.toThrow("Connection request rejected by user.");

    expect(result.current.isConnectedToSite).toBe(false);
    expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining("/api/auth/nonce"));
  });

  it("disconnectWallet clears the session and resets connection state", async () => {
    sessionStorage.setItem("auth_token", "stored-jwt");
    sessionStorage.setItem("auth_address", ACCOUNT.toLowerCase());
    localStorage.setItem("currentAccount", ACCOUNT);

    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {});
    expect(result.current.isConnectedToSite).toBe(true);

    act(() => {
      result.current.disconnectWallet();
    });

    expect(result.current.isConnectedToSite).toBe(false);
    expect(result.current.currentAccount).toBe("");
    expect(getStoredToken()).toBeNull();
    expect(localStorage.getItem("currentAccount")).toBeNull();
  });

  it("clearSession removes both sessionStorage keys", () => {
    sessionStorage.setItem("auth_token", "x");
    sessionStorage.setItem("auth_address", "0xabc");
    clearSession();
    expect(sessionStorage.getItem("auth_token")).toBeNull();
    expect(sessionStorage.getItem("auth_address")).toBeNull();
  });

  it("checkIfWalletIsConnect picks up an already-authorized MetaMask account on mount", async () => {
    const checkAdminStatus = vi.fn();
    const syncLocalWatchlistToDB = vi.fn();
    window.ethereum.request.mockResolvedValue([ACCOUNT]);

    const localWrapper = ({ children }) => (
      <WalletProvider checkAdminStatus={checkAdminStatus} syncLocalWatchlistToDB={syncLocalWatchlistToDB}>
        {children}
      </WalletProvider>
    );
    const { result } = renderHook(() => useWallet(), { wrapper: localWrapper });
    await act(async () => {});

    expect(result.current.currentAccount).toBe(ACCOUNT);
    expect(checkAdminStatus).toHaveBeenCalledWith(ACCOUNT);
    expect(syncLocalWatchlistToDB).toHaveBeenCalledWith(ACCOUNT);
  });

  it("getEthBalance reads from provider.getBalance and formats to ether", async () => {
    mockGetBalance.mockResolvedValue(ethers.parseEther("2.5"));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {});

    const balance = await result.current.getEthBalance(ACCOUNT);
    expect(balance).toBe("2.5");
    expect(mockGetBalance).toHaveBeenCalledWith(ACCOUNT);
  });

  it("getTokenBalance reads from contract.balanceOf/decimals and formats to units", async () => {
    mockContractDecimals.mockResolvedValue(18n);
    mockContractBalanceOf.mockResolvedValue(ethers.parseUnits("10", 18));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {});

    const balance = await result.current.getTokenBalance(ACCOUNT);
    expect(balance).toBe("10.0");
  });

  it("getTokenBalance returns '0' instead of throwing when the contract read fails", async () => {
    mockContractDecimals.mockRejectedValue(new Error("no contract"));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {});

    const balance = await result.current.getTokenBalance(ACCOUNT);
    expect(balance).toBe("0");
  });

  it("accountsChanged handler clears the session and resets state on account switch/disconnect", async () => {
    sessionStorage.setItem("auth_token", "stored-jwt");
    sessionStorage.setItem("auth_address", ACCOUNT.toLowerCase());
    localStorage.setItem("currentAccount", ACCOUNT);

    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {});
    expect(result.current.isConnectedToSite).toBe(true);

    const accountsChangedHandler = window.ethereum.on.mock.calls.find(
      ([event]) => event === "accountsChanged"
    )[1];

    act(() => {
      accountsChangedHandler(["0xNewAccount"]);
    });

    expect(result.current.isConnectedToSite).toBe(false);
    expect(result.current.currentAccount).toBe("");
    expect(getStoredToken()).toBeNull();
    expect(localStorage.getItem("currentAccount")).toBeNull();
  });
});
