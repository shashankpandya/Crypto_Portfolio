/**
 * Smoke tests — verify the test harness itself works.
 * These tests must pass without a network connection, MetaMask, or MongoDB.
 * They prove the test runner is wired up correctly; actual component tests live elsewhere.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// Trivial component — no external deps
function Hello({ name }) {
  return <p data-testid="hello">Hello {name}</p>;
}

describe("smoke", () => {
  it("renders a trivial component", () => {
    render(<Hello name="World" />);
    expect(screen.getByTestId("hello")).toHaveTextContent("Hello World");
  });

  it("vitest globals are available", () => {
    expect(1 + 1).toBe(2);
  });
});
