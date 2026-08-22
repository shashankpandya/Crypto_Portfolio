import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Input from "./Input";

describe("Input (P4-02 / P6-02)", () => {
  it("renders without an error message by default", () => {
    render(<Input id="amount" placeholder="0.0" />);
    expect(screen.getByPlaceholderText("0.0")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error message and links it via aria-describedby / aria-invalid", () => {
    render(<Input id="amount" error="Required field" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Required field");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
  });

  it("combines a caller-provided aria-describedby with the error id", () => {
    render(<Input id="amount" error="Bad" aria-describedby="hint" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toBe("hint amount-error");
  });
});
