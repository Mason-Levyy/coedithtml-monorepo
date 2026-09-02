import { describe, expect, it } from "vitest";
import { FAKE_APP_HOST, FAKE_SANDBOX_HOST } from "@/lib/fakes";
import { isCrossOriginWrite } from "@/lib/request-origin";

const CONFIG = { APP_HOST: FAKE_APP_HOST };

function post(origin: string | null): Request {
  return new Request(`https://${FAKE_APP_HOST}/api/artifacts`, {
    method: "POST",
    headers: origin === null ? {} : { origin },
  });
}

describe("refusing a write that came from somewhere else", () => {
  it("allows the app's own origin", () => {
    expect(isCrossOriginWrite(post(`https://${FAKE_APP_HOST}`), CONFIG)).toBe(
      false,
    );
  });

  it("refuses the sandbox, which is where the untrusted scripts live", () => {
    expect(
      isCrossOriginWrite(post(`https://${FAKE_SANDBOX_HOST}`), CONFIG),
    ).toBe(true);
  });

  it("refuses an opaque origin, which is what a sandboxed frame sends", () => {
    expect(isCrossOriginWrite(post("null"), CONFIG)).toBe(true);
  });

  it("refuses a host that merely starts the same way", () => {
    expect(
      isCrossOriginWrite(post(`https://${FAKE_APP_HOST}.evil.example`), CONFIG),
    ).toBe(true);
  });

  it("allows a request with no Origin at all", () => {
    expect(isCrossOriginWrite(post(null), CONFIG)).toBe(false);
  });
});
