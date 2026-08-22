import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TokenTransfer from "./TokenTransfer";
import { WalletContext } from "../context/WalletContext";
import { ContractContext } from "../context/ContractContext";

const mockWalletContext = {
  currentAccount: "0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc",
};

const mockContractContext = {
  formData: { addressTo: "", amount: "", message: "" },
  handleChange: vi.fn(),
  sendTransaction: vi.fn(),
  sendBatchTransaction: vi.fn(),
};

const renderWithProviders = () =>
  render(
    <WalletContext.Provider value={mockWalletContext}>
      <ContractContext.Provider value={mockContractContext}>
        <TokenTransfer />
      </ContractContext.Provider>
    </WalletContext.Provider>
  );

describe("TokenTransfer (P1-13 — No Hardcoded USD/Gas)", () => {
  it("renders recipient and amount inputs without fabricated USD rate or static gas text", () => {
    renderWithProviders();

    expect(screen.getByLabelText(/Recipient Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount \(MTK\)/i)).toBeInTheDocument();

    // Verify static fake text is absent
    expect(screen.queryByText(/45,000 Gwei/i)).toBeNull();
    expect(screen.queryByText(/\$0\.12/i)).toBeNull();
    expect(screen.queryByText(/\$0\.50/i)).toBeNull();
  });

  it("hides network fee estimate row when input values are incomplete or estimate is unavailable", () => {
    renderWithProviders();

    expect(screen.queryByText(/Network Fee \(Estimate\):/i)).toBeNull();
  });
});
