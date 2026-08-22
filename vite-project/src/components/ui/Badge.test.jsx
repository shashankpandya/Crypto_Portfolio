import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "./Badge";

describe("Badge (P4-02 / P6-02)", () => {
  it("renders children with the neutral variant by default", () => {
    render(<Badge>Fallback</Badge>);
    expect(screen.getByText("Fallback")).toHaveClass("bg-white/[0.06]");
  });

  it.each(["positive", "negative", "cobalt"])("applies the %s variant classes", (variant) => {
    render(<Badge variant={variant}>Label</Badge>);
    expect(screen.getByText("Label").className).toContain(variant);
  });
});
