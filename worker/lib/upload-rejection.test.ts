import { describe, expect, it } from "vitest";
import {
  rejectionCopy,
  rejectionResponse,
  type UploadRejectionReason,
} from "@/lib/upload-rejection";

const EVERY_REASON: UploadRejectionReason[] = [
  "needs-build-step",
  "not-html",
  "no-closing-html-tag",
  "has-own-csp",
  "wrong-extension",
  "several-files",
  "too-large",
  "empty-file",
  "not-form",
];

describe("what a refused upload is told", () => {
  it("gives every reason a headline and an explanation of its own", () => {
    for (const reason of EVERY_REASON) {
      const copy = rejectionCopy(reason);
      expect(copy.headline.length).toBeGreaterThan(0);
      expect(copy.detail.length).toBeGreaterThan(0);
    }
  });

  it("never says the same thing twice under two different reasons", () => {
    const headlines = EVERY_REASON.map(
      (reason) => rejectionCopy(reason).headline,
    );

    expect(new Set(headlines).size).toBe(headlines.length);
  });

  it("tells a nearly-right file what to change", () => {
    const nearlyRight: UploadRejectionReason[] = [
      "needs-build-step",
      "no-closing-html-tag",
      "has-own-csp",
      "too-large",
    ];

    for (const reason of nearlyRight) {
      expect(rejectionCopy(reason).remedy).not.toBeNull();
    }
  });

  it("carries the reason as a code, so nothing has to read the prose", async () => {
    const response = rejectionResponse("needs-build-step", 415);
    const body: unknown = await response.json();

    expect(response.status).toBe(415);
    expect(body).toMatchObject({
      reason: "needs-build-step",
      headline: "This is source, not a page",
    });
  });

  it("keeps error as the sentence, so an older reader still gets words", async () => {
    const body = (await rejectionResponse("not-html", 415).json()) as {
      error: string;
    };

    expect(body.error).toBe(rejectionCopy("not-html").detail);
  });
});
