import { describe, it, expect, vi } from "vitest";
import { getTxOptions } from "./ContractContext";

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
