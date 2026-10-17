import { describe, expect, it } from "vitest";
import { usageLine } from "@/lib/usage-log";

const TOKEN = "0123456789abcdef0123456789abcdef";

function visit(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("a usage log line", () => {
  it("says which site sent the visit, but not which page", () => {
    const line = usageLine(
      "app_opened",
      visit("https://app.test/?utm_source=reddit", {
        referer: "https://news.example/item?id=42",
        "user-agent": "Mozilla/5.0 (X11)",
      }),
    );

    expect(line).toEqual({
      usage: "app_opened",
      referrer: "news.example",
      utm_source: "reddit",
      client: "Mozilla",
    });
  });

  it("does not count the app sending people to itself", () => {
    const line = usageLine(
      "artifact_uploaded",
      visit("https://app.test/api/artifacts", { referer: "https://app.test/" }),
    );

    expect(line.referrer).toBeNull();
  });

  it("never carries a viewer token", () => {
    const line = usageLine(
      "app_opened",
      visit(`https://app.test/a/${TOKEN}?unlock=${TOKEN}`, {
        referer: `https://other.test/a/${TOKEN}`,
      }),
    );

    expect(JSON.stringify(line)).not.toContain(TOKEN);
  });
});
