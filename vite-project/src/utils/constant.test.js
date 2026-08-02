import { describe, it, expect } from "vitest";
import { approveAllowance, checkAllowance } from "./constant";

describe("Allowance Helpers (P1-11 Unit Contract)", () => {
  describe("approveAllowance", () => {
    it("throws TypeError if amountWei is a string", async () => {
      await expect(
        approveAllowance("0x1111111111111111111111111111111111111111", "1000000000000000000")
      ).rejects.toThrow(TypeError);
    });

    it("throws TypeError if amountWei is a number", async () => {
      await expect(
        approveAllowance("0x1111111111111111111111111111111111111111", 1000)
      ).rejects.toThrow(TypeError);
    });

    it("errorMessage mentions expected bigint and ethers.parseEther guidance", async () => {
      try {
        await approveAllowance("0x1111111111111111111111111111111111111111", "1.0");
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toContain("approveAllowance expects amountWei to be a bigint");
        expect(err.message).toContain("ethers.parseEther()");
      }
    });

    it("fails with Ethereum object not found error (not TypeError) when passed a valid bigint", async () => {
      await expect(
        approveAllowance("0x1111111111111111111111111111111111111111", 1000000000000000000n)
      ).rejects.toThrow("Ethereum object not found");
    });
  });

  describe("checkAllowance", () => {
    it("fails with Ethereum object not found error when window.ethereum is not present", async () => {
      await expect(
        checkAllowance("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222")
      ).rejects.toThrow("Ethereum object not found");
    });
  });
});
