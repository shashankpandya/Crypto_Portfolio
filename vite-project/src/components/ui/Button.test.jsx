import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./Button";

describe("Button (P4-02 / P6-02)", () => {
  it("renders children and fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Send
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Send" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the primary variant class by default", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-signal");
  });

  it("applies the secondary variant class when requested", () => {
    render(<Button variant="secondary">Go</Button>);
    expect(screen.getByRole("button")).not.toHaveClass("bg-signal");
  });

  it("merges a custom className with the base classes", () => {
    render(<Button className="w-full">Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });
});
