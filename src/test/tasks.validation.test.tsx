import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Tasks from "@/pages/Tasks";

describe("Tasks form validation", () => {
  it("shows errors and blocks completion when required fields are missing", () => {
    render(<Tasks />);

    fireEvent.click(screen.getByRole("button", { name: /complete task/i }));

    const errors = screen.getAllByText("This field is required.");
    expect(errors).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 1, name: "Physician Assessment" })).toBeInTheDocument();
  });
});
