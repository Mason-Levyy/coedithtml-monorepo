import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthoringSession, StartAuthoring } from "./contract";
import { loadAuthoring } from "./load";

const NOTHING = {} as AuthoringSession;

const REGISTERED: StartAuthoring = () => NOTHING;

function injectedScript(): HTMLScriptElement {
  const script = document.head.querySelector("script");
  if (script === null) {
    throw new Error("nothing was asked for");
  }
  return script;
}

beforeEach(() => {
  document.head.replaceChildren();
  window.__coedit__ = { version: "test", config: { revision: "r1" } };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.__coedit__;
});

describe("loadAuthoring", () => {
  it("hands back a module that is already here without asking again", async () => {
    window.__coedit__ = {
      version: "test",
      config: { revision: "r1" },
      author: REGISTERED,
    };

    await expect(loadAuthoring()).resolves.toBe(REGISTERED);
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("asks for the chunk that sits beside this revision", () => {
    void loadAuthoring();

    expect(injectedScript().getAttribute("src")).toBe("/__coedit/r1/author.js");
  });

  it("gives back what the chunk registered once it lands", async () => {
    const loading = loadAuthoring();
    const script = injectedScript();

    if (window.__coedit__ !== undefined) {
      window.__coedit__.author = REGISTERED;
    }
    script.dispatchEvent(new Event("load"));

    await expect(loading).resolves.toBe(REGISTERED);
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("gives up quietly when the chunk never arrives", async () => {
    const loading = loadAuthoring();

    injectedScript().dispatchEvent(new Event("error"));

    await expect(loading).resolves.toBeNull();
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("gives up quietly when the chunk lands but registers nothing", async () => {
    const loading = loadAuthoring();

    injectedScript().dispatchEvent(new Event("load"));

    await expect(loading).resolves.toBeNull();
  });
});
