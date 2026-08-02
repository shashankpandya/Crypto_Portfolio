import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TokenTransfer from "./TokenTransfer";
import { TransactionContext } from "../context/TransactionContext";

const mockContext = {
  currentAccount: "0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc",
  formData: { addressTo: "", amount: "", message: "" },
  handleChange: vi.fn(),
  sendTransaction: vi.fn(),
  sendBatchTransaction: vi.fn(),
};

describe("TokenTransfer (P1-13 — No Hardcoded USD/Gas)", () => {
  it("renders recipient and amount inputs without fabricated USD rate or static gas text", () => {
    render(
      <TransactionContext.Provider value={mockContext}>
        <TokenTransfer />
      </TransactionContext.Provider>
    );

    expect(screen.getByLabelText(/Recipient Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount \(MTK\)/i)).toBeInTheDocument();

    // Verify static fake text is absent
    expect(screen.queryByText(/45,000 Gwei/i)).toBeNull();
    expect(screen.queryByText(/\$0\.12/i)).toBeNull();
    expect(screen.queryByText(/\$0\.50/i)).toBeNull();
  });

  it("hides network fee estimate row when input values are incomplete or estimate is unavailable", () => {
    render(
      <TransactionContext.Provider value={mockContext}>
        <TokenTransfer />
      </TransactionContext.Provider>
    );

    expect(screen.queryByText(/Network Fee \(Estimate\):/i)).toBeNull();
  });
});
