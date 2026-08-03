import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtifactStatusBar } from "./ArtifactStatusBar";

describe("ArtifactStatusBar", () => {
  it("shows the artifact title, profile, and position", () => {
    render(
      <ArtifactStatusBar
        title="Q3 Review"
        profile="slides"
        activeIndex={2}
        slideCount={5}
        stageMode={false}
        onToggleStage={() => {}}
      />,
    );

    expect(() => screen.getByText("Q3 Review")).not.toThrow();
    expect(() => screen.getByText("Slides")).not.toThrow();
    expect(() => screen.getByText("3 of 5")).not.toThrow();
  });

  it("omits the position and toggle when there is only one slide", () => {
    render(
      <ArtifactStatusBar
        title="Calculator"
        profile="app"
        activeIndex={0}
        slideCount={1}
        stageMode={false}
        onToggleStage={() => {}}
      />,
    );

    expect(screen.queryByText(/of 1/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("calls onToggleStage when the stage button is clicked", () => {
    const onToggleStage = vi.fn();
    render(
      <ArtifactStatusBar
        title="Q3 Review"
        profile="slides"
        activeIndex={0}
        slideCount={3}
        stageMode={false}
        onToggleStage={onToggleStage}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onToggleStage).toHaveBeenCalledTimes(1);
  });

  it("labels the toggle with the current stage state", () => {
    render(
      <ArtifactStatusBar
        title="Q3 Review"
        profile="slides"
        activeIndex={0}
        slideCount={3}
        stageMode={true}
        onToggleStage={() => {}}
      />,
    );

    expect(() => screen.getByText("Stage on")).not.toThrow();
  });
});
