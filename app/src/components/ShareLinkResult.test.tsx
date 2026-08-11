import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareLinkResult } from "./ShareLinkResult";

const SHARE_URL = "https://sandbox.test/" + "a".repeat(32);

describe("ShareLinkResult", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the share URL", () => {
    render(<ShareLinkResult shareUrl={SHARE_URL} onUploadAnother={() => {}} />);

    expect(() => screen.getByText(SHARE_URL)).not.toThrow();
  });

  it("copies the link to the clipboard and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<ShareLinkResult shareUrl={SHARE_URL} onUploadAnother={() => {}} />);

    fireEvent.click(screen.getByText("Copy link"));
    await vi.waitFor(() => {
      expect(() => screen.getByText("Copied")).not.toThrow();
    });

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
  });

  it("tells the reader to copy by hand when the clipboard is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<ShareLinkResult shareUrl={SHARE_URL} onUploadAnother={() => {}} />);

    fireEvent.click(screen.getByText("Copy link"));
    await vi.waitFor(() => {
      expect(() => screen.getByText("Press Ctrl+C")).not.toThrow();
    });
  });

  it("calls onUploadAnother when clicked", () => {
    const onUploadAnother = vi.fn();
    render(
      <ShareLinkResult
        shareUrl={SHARE_URL}
        onUploadAnother={onUploadAnother}
      />,
    );

    fireEvent.click(screen.getByText("Upload another"));

    expect(onUploadAnother).toHaveBeenCalledTimes(1);
  });
});
