import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card from "./Card";

describe("Card (P4-02 / P6-02)", () => {
  it("renders children", () => {
    render(<Card>Contents</Card>);
    expect(screen.getByText("Contents")).toBeInTheDocument();
  });

  it("adds interactive hover classes only when interactive is true", () => {
    const { container: plain } = render(<Card>A</Card>);
    const { container: interactive } = render(<Card interactive>B</Card>);
    expect(plain.firstChild.className).not.toContain("hover:-translate-y-px");
    expect(interactive.firstChild.className).toContain("hover:-translate-y-px");
  });
});
