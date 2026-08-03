import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Filmstrip } from "./Filmstrip";

const SLIDES = [
  { index: 0, startChild: 0, endChild: 1, label: "Intro" },
  { index: 1, startChild: 2, endChild: 2, label: "Details" },
  { index: 2, startChild: 3, endChild: 4, label: "Wrap up" },
];

describe("Filmstrip", () => {
  it("renders one tab per slide with its 1-based number and label", () => {
    render(
      <Filmstrip slides={SLIDES} activeIndex={0} onSelectSlide={() => {}} />,
    );

    expect(() => screen.getByText("01")).not.toThrow();
    expect(() => screen.getByText("Intro")).not.toThrow();
    expect(() => screen.getByText("03")).not.toThrow();
    expect(() => screen.getByText("Wrap up")).not.toThrow();
  });

  it("marks only the active slide's tab as selected", () => {
    render(
      <Filmstrip slides={SLIDES} activeIndex={1} onSelectSlide={() => {}} />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[2]?.getAttribute("aria-selected")).toBe("false");
  });

  it("calls onSelectSlide with the clicked slide's index", () => {
    const onSelectSlide = vi.fn();
    render(
      <Filmstrip
        slides={SLIDES}
        activeIndex={0}
        onSelectSlide={onSelectSlide}
      />,
    );

    fireEvent.click(screen.getByText("Wrap up"));

    expect(onSelectSlide).toHaveBeenCalledWith(2);
  });

  it("gives only the active tab a tab stop, the rest are removed from tab order", () => {
    render(
      <Filmstrip slides={SLIDES} activeIndex={1} onSelectSlide={() => {}} />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]?.getAttribute("tabindex")).toBe("-1");
    expect(tabs[1]?.getAttribute("tabindex")).toBe("0");
    expect(tabs[2]?.getAttribute("tabindex")).toBe("-1");
  });

  it("moves selection to the next tab on ArrowRight", () => {
    const onSelectSlide = vi.fn();
    render(
      <Filmstrip
        slides={SLIDES}
        activeIndex={0}
        onSelectSlide={onSelectSlide}
      />,
    );

    fireEvent.keyDown(screen.getByText("Intro"), { key: "ArrowRight" });

    expect(onSelectSlide).toHaveBeenCalledWith(1);
  });

  it("moves selection to the previous tab on ArrowLeft", () => {
    const onSelectSlide = vi.fn();
    render(
      <Filmstrip
        slides={SLIDES}
        activeIndex={1}
        onSelectSlide={onSelectSlide}
      />,
    );

    fireEvent.keyDown(screen.getByText("Details"), { key: "ArrowLeft" });

    expect(onSelectSlide).toHaveBeenCalledWith(0);
  });

  it("clamps at the last tab instead of wrapping on ArrowRight", () => {
    const onSelectSlide = vi.fn();
    render(
      <Filmstrip
        slides={SLIDES}
        activeIndex={2}
        onSelectSlide={onSelectSlide}
      />,
    );

    fireEvent.keyDown(screen.getByText("Wrap up"), { key: "ArrowRight" });

    expect(onSelectSlide).toHaveBeenCalledWith(2);
  });

  it("clamps at the first tab instead of wrapping on ArrowLeft", () => {
    const onSelectSlide = vi.fn();
    render(
      <Filmstrip
        slides={SLIDES}
        activeIndex={0}
        onSelectSlide={onSelectSlide}
      />,
    );

    fireEvent.keyDown(screen.getByText("Intro"), { key: "ArrowLeft" });

    expect(onSelectSlide).toHaveBeenCalledWith(0);
  });

  it("jumps to the last tab on End and the first on Home", () => {
    const onSelectSlide = vi.fn();
    render(
      <Filmstrip
        slides={SLIDES}
        activeIndex={1}
        onSelectSlide={onSelectSlide}
      />,
    );

    fireEvent.keyDown(screen.getByText("Details"), { key: "End" });
    expect(onSelectSlide).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(screen.getByText("Details"), { key: "Home" });
    expect(onSelectSlide).toHaveBeenLastCalledWith(0);
  });
});
