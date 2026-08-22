import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("EmptyState (P4-02 / P6-02)", () => {
  it("renders without props (no title/description/action) without throwing", () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders title, description, icon, and action when provided", () => {
    render(
      <EmptyState
        icon="🪙"
        title="No coins watched"
        description="Add a coin to your watchlist to see it here."
        action={<button>Browse coins</button>}
      />
    );
    expect(screen.getByText("No coins watched")).toBeInTheDocument();
    expect(screen.getByText("Add a coin to your watchlist to see it here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse coins" })).toBeInTheDocument();
  });
});
