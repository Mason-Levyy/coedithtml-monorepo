import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublishStep } from "./PublishStep";

describe("PublishStep", () => {
  it("renders draft file details and default view permission", () => {
    const onPublish = vi.fn();
    const onCancel = vi.fn();

    render(
      <PublishStep
        fileName="report.html"
        onPublish={onPublish}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("report.html")).toBeDefined();
    expect(screen.getByText("Step 2 of 2")).toBeDefined();
  });

  it("submits configured password and chosen permission", () => {
    const onPublish = vi.fn();
    const onCancel = vi.fn();

    render(
      <PublishStep
        fileName="report.html"
        onPublish={onPublish}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Edit directly"));
    fireEvent.change(
      screen.getByPlaceholderText("Leave blank for no password"),
      {
        target: { value: "secret123" },
      },
    );

    fireEvent.click(screen.getByText("Publish link"));

    expect(onPublish).toHaveBeenCalledWith({
      password: "secret123",
      permission: "edit",
    });
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onPublish = vi.fn();
    const onCancel = vi.fn();

    render(
      <PublishStep
        fileName="report.html"
        onPublish={onPublish}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
