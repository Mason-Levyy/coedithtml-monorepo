import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthoringSession, StartAuthoring } from "./contract";
import { loadAuthoring } from "./load";

const NOTHING = {} as AuthoringSession;

const REGISTERED: StartAuthoring = () => NOTHING;

let asked: HTMLScriptElement[] = [];

function onlyAsk(): HTMLScriptElement {
  const script = asked[0];
  if (script === undefined) {
    throw new Error("nothing was asked for");
  }
  return script;
}

function register(): void {
  if (window.__coedit__ !== undefined) {
    window.__coedit__.author = REGISTERED;
  }
}

beforeEach(() => {
  asked = [];
  window.__coedit__ = { version: "test", config: { revision: "r1" } };
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    if (node instanceof HTMLScriptElement) {
      asked.push(node);
    }
    return node;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.__coedit__;
});

describe("loadAuthoring", () => {
  it("hands back a module that is already here without asking again", async () => {
    register();

    await expect(loadAuthoring()).resolves.toBe(REGISTERED);
    expect(asked).toHaveLength(0);
  });

  it("asks for the chunk that sits beside this revision", () => {
    void loadAuthoring();

    expect(onlyAsk().getAttribute("src")).toBe("/__coedit/r1/author.js");
  });

  it("gives back what the chunk registered once it lands", async () => {
    const loading = loadAuthoring();

    register();
    onlyAsk().dispatchEvent(new Event("load"));

    await expect(loading).resolves.toBe(REGISTERED);
  });

  it("gives up quietly when the chunk never arrives", async () => {
    const loading = loadAuthoring();

    onlyAsk().dispatchEvent(new Event("error"));

    await expect(loading).resolves.toBeNull();
  });

  it("gives up quietly when the chunk lands but registers nothing", async () => {
    const loading = loadAuthoring();

    onlyAsk().dispatchEvent(new Event("load"));

    await expect(loading).resolves.toBeNull();
  });
});
