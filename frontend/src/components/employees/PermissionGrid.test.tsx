import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PermissionGrid } from "./PermissionGrid";
import type { ModulePermissions } from "@/types/employee";

describe("PermissionGrid", () => {
  it("reflects the checked state that matches the given permissions", () => {
    const value: ModulePermissions = { products: ["view"], orders: ["view", "manage"] };
    render(<PermissionGrid value={value} onChange={() => {}} />);

    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(3);
  });

  it("adds the action when an unchecked box is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<PermissionGrid value={{}} onChange={handleChange} />);

    const rows = screen.getAllByRole("row");
    const productsRow = rows.find((row) => row.textContent?.startsWith("Produtos"));
    const viewCheckbox = productsRow!.querySelectorAll('input[type="checkbox"]')[0];

    await user.click(viewCheckbox);

    expect(handleChange).toHaveBeenCalledWith({ products: ["view"] });
  });

  it("removes the action when an already-checked box is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<PermissionGrid value={{ orders: ["view", "manage"] }} onChange={handleChange} />);

    const rows = screen.getAllByRole("row");
    const ordersRow = rows.find((row) => row.textContent?.startsWith("Pedidos"));
    const manageCheckbox = ordersRow!.querySelectorAll('input[type="checkbox"]')[1];

    await user.click(manageCheckbox);

    expect(handleChange).toHaveBeenCalledWith({ orders: ["view"] });
  });

  it("disables every checkbox when disabled is true", () => {
    render(<PermissionGrid value={{}} onChange={() => {}} disabled />);

    screen.getAllByRole("checkbox").forEach((checkbox) => expect(checkbox).toBeDisabled());
  });
});
