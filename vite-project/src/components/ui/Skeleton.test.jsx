import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Skeleton from "./Skeleton";

describe("Skeleton (P4-02 / P6-02)", () => {
  it("renders with no props with an accessible loading status role", () => {
    render(<Skeleton />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-label", "Loading");
    expect(el).toHaveClass("animate-pulse");
  });

  it("merges a custom className", () => {
    render(<Skeleton className="h-4 w-full" />);
    expect(screen.getByRole("status")).toHaveClass("h-4", "w-full");
  });
});
