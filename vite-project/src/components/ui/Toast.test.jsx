import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, act, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

describe("Toast / ToastProvider (P4-02 / P6-02)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("useToast throws when used outside a ToastProvider", () => {
    const { result } = renderHook(() => {
      try {
        return useToast();
      } catch (err) {
        return err;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect(result.current.message).toContain("must be used within a ToastProvider");
  });

  it("notify announces a toast with the correct role for its variant", async () => {
    function Trigger() {
      const { notify } = useToast();
      return (
        <button onClick={() => notify({ variant: "success", message: "Saved!", duration: 0 })}>
          fire
        </button>
      );
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "fire" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Saved!");
  });

  it("error variant toasts render with role=alert", async () => {
    function Trigger() {
      const { notify } = useToast();
      return (
        <button onClick={() => notify({ variant: "error", message: "Failed!", duration: 0 })}>
          fire
        </button>
      );
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "fire" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Failed!");
  });

  it("toasts are manually dismissible via the dismiss button", async () => {
    function Trigger() {
      const { notify } = useToast();
      return (
        <button onClick={() => notify({ message: "Hi", duration: 0 })}>fire</button>
      );
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "fire" }));
    });
    expect(screen.getByText("Hi")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    });
    expect(screen.queryByText("Hi")).not.toBeInTheDocument();
  });

  it("auto-dismisses a toast after its duration elapses", async () => {
    function Trigger() {
      const { notify } = useToast();
      return <button onClick={() => notify({ message: "Bye", duration: 3000 })}>fire</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByRole("button", { name: "fire" }).click();
    });
    expect(screen.getByText("Bye")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("Bye")).not.toBeInTheDocument();
  });
});
