import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Select from "./Select";

describe("Select (P4-02 / P6-02)", () => {
  it("renders its option children and forwards onChange", () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="range" onChange={onChange} defaultValue="7">
        <option value="1">1d</option>
        <option value="7">7d</option>
      </Select>
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("7");
    fireEvent.change(select, { target: { value: "1" } });
    expect(onChange).toHaveBeenCalled();
  });
});
