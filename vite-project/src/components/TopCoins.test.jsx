import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import TopCoins from "./TopCoins";

describe("TopCoins (P1-14 — Real 7d Sparklines & Market Cap Rank)", () => {
  const mockCoins = [
    {
      id: "ethereum",
      name: "Ethereum",
      symbol: "eth",
      market_cap_rank: 2, // Out-of-order array position 0, rank should display 2
      current_price: 3500,
      price_change_percentage_24h: 1.5,
      sparkline_in_7d: {
        price: [3400, 3450, 3480, 3500],
      },
    },
    {
      id: "no-sparkline-coin",
      name: "No Sparkline Token",
      symbol: "nst",
      market_cap_rank: 99,
      current_price: 1.0,
      price_change_percentage_24h: -2.0,
      // sparkline_in_7d absent
    },
  ];

  it("uses coin.market_cap_rank regardless of array index order", () => {
    render(
      <MemoryRouter>
        <TopCoins coins={mockCoins} />
      </MemoryRouter>
    );

    // Ethereum is at index 0 in array but market_cap_rank is 2
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("renders real SVG path from sparkline_in_7d.price data and renders nothing when absent", () => {
    const { container } = render(
      <MemoryRouter>
        <TopCoins coins={mockCoins} />
      </MemoryRouter>
    );

    // Should have exactly 1 SVG for Ethereum, 0 SVG for no-sparkline-coin
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);

    const path = container.querySelector("svg path");
    expect(path).not.toBeNull();
    // Verify path d starts with "M 0.0," derived from 4 price points
    expect(path.getAttribute("d")).toMatch(/^M 0\.0,/);
  });
});
