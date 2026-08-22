import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import axios from "axios";
import { ContractProvider, getTxOptions } from "./ContractContext";
import { useContract } from "../hooks/useContract";

// ---------------------------------------------------------------------------
// P1-12 tests (preserved, moved from TransactionContext.test.js in P2-13
// once getTxOptions' home became ContractContext.jsx)
// ---------------------------------------------------------------------------

describe("getTxOptions Helper (P1-12)", () => {
  it("returns empty options when no contract estimation or custom options provided", async () => {
    const opts = await getTxOptions(null, "transfer");
    expect(opts).toEqual({});
  });

  it("calculates estimated gasLimit with 10% safety buffer when contract estimateGas succeeds", async () => {
    const mockContract = {
      estimateGas: {
        addToBlockchain: vi.fn().mockResolvedValue(100000n),
      },
    };

    const opts = await getTxOptions(mockContract, "addToBlockchain", ["0x123", 1000n]);
    expect(opts.gasLimit).toBe(110000n); // 100000 * 1.10 = 110000
    expect(mockContract.estimateGas.addToBlockchain).toHaveBeenCalledWith("0x123", 1000n);
  });

  it("uses custom gasLimit override when provided in customOptions", async () => {
    const mockContract = {
      estimateGas: {
        addToBlockchain: vi.fn().mockResolvedValue(100000n),
      },
    };

    const opts = await getTxOptions(mockContract, "addToBlockchain", [], { gasLimit: "300000" });
    expect(opts.gasLimit).toBe(300000n);
    expect(mockContract.estimateGas.addToBlockchain).not.toHaveBeenCalled();
  });

  it("parses custom gasPrice override into Wei using gwei units", async () => {
    const opts = await getTxOptions(null, "addToBlockchain", [], { gasPrice: "20" });
    expect(opts.gasPrice).toBe(20000000000n); // 20 Gwei = 20,000,000,000 Wei
  });

  it("handles gas estimation failure gracefully without setting gasLimit", async () => {
    const mockContract = {
      estimateGas: {
        addToBlockchain: vi.fn().mockRejectedValue(new Error("Execution reverted")),
      },
    };

    const opts = await getTxOptions(mockContract, "addToBlockchain", []);
    expect(opts.gasLimit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// P6-01 — ContractProvider tested in isolation: transfer, batch transfer,
// admin fee change, admin status, and transaction history (server + chain
// fallback) paths.
// ---------------------------------------------------------------------------

vi.mock("axios");

const mockGetSignerContract = vi.fn();
const mockGetReadContract = vi.fn();

vi.mock("../services/contractService", () => ({
  transactionsABI: [],
  transactionsAddress: "0x1111111111111111111111111111111111111111",
  isContractAddressValid: () => true,
  getProvider: vi.fn(),
  getReadContract: (...args) => mockGetReadContract(...args),
  getSignerContract: (...args) => mockGetSignerContract(...args),
}));

const wrapper = ({ children }) => <ContractProvider>{children}</ContractProvider>;

describe("ContractProvider (P6-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window = global.window || {};
    global.window.ethereum = {};
  });

  afterEach(() => {
    delete global.window.ethereum;
  });

  it("sendTransaction sends addToBlockchain with the current formData", async () => {
    const addToBlockchain = vi.fn().mockResolvedValue({ hash: "0xdeadbeef" });
    mockGetSignerContract.mockResolvedValue({
      estimateGas: {},
      addToBlockchain,
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    act(() => {
      result.current.handleChange({ target: { value: "0xabc" } }, "addressTo");
      result.current.handleChange({ target: { value: "1.5" } }, "amount");
    });

    let tx;
    await act(async () => {
      tx = await result.current.sendTransaction();
    });

    expect(tx.hash).toBe("0xdeadbeef");
    expect(addToBlockchain).toHaveBeenCalledWith(
      "0xabc",
      expect.any(BigInt),
      "",
      "Transfer",
      [],
      {}
    );
  });

  it("sendTransaction rejects with a friendly message when MetaMask rejects the action", async () => {
    mockGetSignerContract.mockResolvedValue({
      estimateGas: {},
      addToBlockchain: vi.fn().mockRejectedValue(Object.assign(new Error("denied"), { code: "ACTION_REJECTED" })),
    });

    const { result } = renderHook(() => useContract(), { wrapper });
    act(() => {
      result.current.handleChange({ target: { value: "0xabc" } }, "addressTo");
      result.current.handleChange({ target: { value: "1" } }, "amount");
    });

    await expect(
      act(async () => {
        await result.current.sendTransaction();
      })
    ).rejects.toThrow("Transaction was rejected in MetaMask.");
  });

  it("sendBatchTransaction calls addToBlockchainBatch with parsed amounts and toggles isLoading", async () => {
    const wait = vi.fn().mockResolvedValue({});
    const addToBlockchainBatch = vi.fn().mockResolvedValue({ hash: "0xbatch", wait });
    mockGetSignerContract.mockResolvedValue({
      estimateGas: {},
      addToBlockchainBatch,
    });

    const { result } = renderHook(() => useContract(), { wrapper });
    expect(result.current.isLoading).toBe(false);

    let tx;
    await act(async () => {
      tx = await result.current.sendBatchTransaction(["0xa", "0xb"], ["1", "2"]);
    });

    expect(tx.hash).toBe("0xbatch");
    expect(wait).toHaveBeenCalled();
    expect(addToBlockchainBatch).toHaveBeenCalledWith(
      ["0xa", "0xb"],
      [expect.any(BigInt), expect.any(BigInt)],
      "",
      "Batch Transfer",
      [],
      {}
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("updateFeePercentage sends setFeePercentage in basis points and updates state on success", async () => {
    const wait = vi.fn().mockResolvedValue({});
    const setFeePercentage = vi.fn().mockResolvedValue({ hash: "0xfee", wait });
    mockGetSignerContract.mockResolvedValue({
      estimateGas: {},
      setFeePercentage,
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    let hash;
    await act(async () => {
      hash = await result.current.updateFeePercentage("2.5");
    });

    expect(hash).toBe("0xfee");
    expect(setFeePercentage).toHaveBeenCalledWith(250, {});
    expect(result.current.feePercentage).toBe("2.5");
  });

  it("checkAdminStatus sets isAdmin true only when the connected account matches the contract owner", async () => {
    mockGetSignerContract.mockResolvedValue({
      owner: vi.fn().mockResolvedValue("0xOwnerAddress"),
      feePercentage: vi.fn().mockResolvedValue(100n),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    await act(async () => {
      await result.current.checkAdminStatus("0xowneraddress");
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.contractOwner).toBe("0xOwnerAddress");
    expect(result.current.feePercentage).toBe("1"); // 100 basis points -> 1%
  });

  it("checkAdminStatus sets isAdmin false for a non-owner account", async () => {
    mockGetSignerContract.mockResolvedValue({
      owner: vi.fn().mockResolvedValue("0xOwnerAddress"),
      feePercentage: vi.fn().mockResolvedValue(100n),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    await act(async () => {
      await result.current.checkAdminStatus("0xsomeoneelse");
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it("resetAdminState clears isAdmin, contractOwner, and feePercentage", async () => {
    mockGetSignerContract.mockResolvedValue({
      owner: vi.fn().mockResolvedValue("0xOwnerAddress"),
      feePercentage: vi.fn().mockResolvedValue(100n),
    });

    const { result } = renderHook(() => useContract(), { wrapper });
    await act(async () => {
      await result.current.checkAdminStatus("0xowneraddress");
    });
    expect(result.current.isAdmin).toBe(true);

    act(() => {
      result.current.resetAdminState();
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.contractOwner).toBe("");
    expect(result.current.feePercentage).toBe("0");
  });

  it("getTransactionHistory reads from the server and maps the paginated shape", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { sender: "0xa", recipient: "0xb", amount: "1000000000000000000", message: "hi", timestamp: 1700000000, txHash: "0x1" },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false },
      },
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    let history;
    await act(async () => {
      history = await result.current.getTransactionHistory("0xa", { page: 1, limit: 20 });
    });

    expect(history.source).toBe("server");
    expect(history.transactions).toHaveLength(1);
    expect(history.transactions[0].amount).toBe("1.0");
    expect(history.pagination.total).toBe(1);
  });

  it("getTransactionHistory falls back to the on-chain read when the server call fails", async () => {
    axios.get.mockRejectedValueOnce(new Error("network down"));
    mockGetReadContract.mockReturnValue({
      getAllTransactions: vi.fn().mockResolvedValue([
        {
          sender: "0xAAA",
          receiver: "0xBBB",
          timestamp: 1700000000,
          message: "m",
          amount: 1000000000000000000n,
        },
      ]),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    let history;
    await act(async () => {
      history = await result.current.getTransactionHistory("0xaaa", { page: 1, limit: 20 });
    });

    expect(history.source).toBe("chain-fallback");
    expect(history.transactions).toHaveLength(1);
  });

  it("getAllTransactions reads and structures the contract's full transaction array", async () => {
    mockGetReadContract.mockReturnValue({
      getAllTransactions: vi.fn().mockResolvedValue([
        {
          sender: "0xAAA",
          receiver: "0xBBB",
          timestamp: 1700000000,
          message: "hello",
          amount: 2000000000000000000n,
        },
      ]),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    let txs;
    await act(async () => {
      txs = await result.current.getAllTransactions();
    });

    expect(txs).toHaveLength(1);
    expect(txs[0].addressFrom).toBe("0xAAA");
    expect(txs[0].amount).toBe(2);
    expect(result.current.transactions).toEqual(txs);
  });

  it("getAllTransactions returns [] and does not throw when the contract read fails", async () => {
    mockGetReadContract.mockReturnValue({
      getAllTransactions: vi.fn().mockRejectedValue(new Error("rpc down")),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    let txs;
    await act(async () => {
      txs = await result.current.getAllTransactions();
    });

    expect(txs).toEqual([]);
  });

  it("getContractInfo reads name/symbol/totalSupply/decimals from the read contract", async () => {
    mockGetReadContract.mockReturnValue({
      name: vi.fn().mockResolvedValue("MyToken"),
      symbol: vi.fn().mockResolvedValue("MTK"),
      totalSupply: vi.fn().mockResolvedValue(1000000000000000000000000n),
      decimals: vi.fn().mockResolvedValue(18n),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    let info;
    await act(async () => {
      info = await result.current.getContractInfo();
    });

    expect(info).toEqual(
      expect.objectContaining({ name: "MyToken", symbol: "MTK", decimals: 18n })
    );
  });

  it("getContractInfo rejects when the contract read throws", async () => {
    mockGetReadContract.mockReturnValue({
      name: vi.fn().mockRejectedValue(new Error("no contract")),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    await expect(
      act(async () => {
        await result.current.getContractInfo();
      })
    ).rejects.toThrow("no contract");
  });

  it("updateFeePercentage rejects and resets isLoading when the tx fails", async () => {
    mockGetSignerContract.mockResolvedValue({
      estimateGas: {},
      setFeePercentage: vi.fn().mockRejectedValue(new Error("execution reverted")),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    await expect(
      act(async () => {
        await result.current.updateFeePercentage("5");
      })
    ).rejects.toThrow("execution reverted");

    expect(result.current.isLoading).toBe(false);
  });

  it("sendBatchTransaction rejects and resets isLoading on failure", async () => {
    mockGetSignerContract.mockResolvedValue({
      estimateGas: {},
      addToBlockchainBatch: vi.fn().mockRejectedValue(new Error("batch reverted")),
    });

    const { result } = renderHook(() => useContract(), { wrapper });

    await expect(
      act(async () => {
        await result.current.sendBatchTransaction(["0xa"], ["1"]);
      })
    ).rejects.toThrow("batch reverted");

    expect(result.current.isLoading).toBe(false);
  });

  it("handleChange updates the named field on formData", () => {
    const { result } = renderHook(() => useContract(), { wrapper });

    act(() => {
      result.current.handleChange({ target: { value: "hello world" } }, "message");
    });

    expect(result.current.formData.message).toBe("hello world");
  });
});
