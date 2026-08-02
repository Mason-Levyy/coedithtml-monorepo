import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactFrame } from "./ArtifactFrame";

describe("ArtifactFrame", () => {
  it("renders an iframe with the sandbox and src it was given", () => {
    const { container } = render(
      <ArtifactFrame src="https://sandbox.example.com/abc123" title="Deck" />,
    );

    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(
      "https://sandbox.example.com/abc123",
    );
    expect(iframe?.getAttribute("title")).toBe("Deck");
  });

  it("grants exactly allow-scripts and allow-same-origin, nothing else", () => {
    const { container } = render(
      <ArtifactFrame src="https://sandbox.example.com/abc123" title="Deck" />,
    );

    const sandbox = container.querySelector("iframe")?.getAttribute("sandbox");
    expect(sandbox).toBe("allow-scripts allow-same-origin");
  });

  it("never grants allow-top-navigation or allow-popups", () => {
    const { container } = render(
      <ArtifactFrame src="https://sandbox.example.com/abc123" title="Deck" />,
    );

    const sandbox =
      container.querySelector("iframe")?.getAttribute("sandbox") ?? "";
    expect(sandbox).not.toContain("allow-top-navigation");
    expect(sandbox).not.toContain("allow-popups");
  });
});
