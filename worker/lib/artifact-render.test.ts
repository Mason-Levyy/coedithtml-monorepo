import { describe, expect, it } from "vitest";
import {
  appendRuntimeScript,
  sandboxScriptIn,
  runtimeScriptPath,
} from "./artifact-render";

const REVISION = "9f2c1a04b7e35d68";

function encode(source: string): ArrayBuffer {
  return new Uint8Array(new TextEncoder().encode(source)).buffer;
}

function render(source: string): string {
  return new TextDecoder().decode(
    appendRuntimeScript(encode(source), REVISION),
  );
}

describe("appendRuntimeScript", () => {
  it("keeps every original byte unchanged and in place", () => {
    const original = new Uint8Array(
      encode("<!doctype html><html><body>Hi</body></html>"),
    );
    const served = new Uint8Array(
      appendRuntimeScript(original.buffer, REVISION),
    );

    expect(served.subarray(0, original.byteLength)).toEqual(original);
  });

  it("appends exactly one script tag referencing the revision's runtime path", () => {
    const original = "<html></html>";
    const served = render(original);
    const appended = served.slice(original.length);

    expect(appended).toBe(
      `\n<script src="${runtimeScriptPath(REVISION)}" defer></script>\n`,
    );
    expect(appended).toContain(REVISION);
    expect(served.match(/<script/g)).toHaveLength(1);
  });

  it("does not require a closing </html> tag to be present", () => {
    const original = "<html><body>no closing tag";

    expect(render(original).startsWith(original)).toBe(true);
  });

  it("does not treat </html> inside the artifact's own script as a splice point", () => {
    const original =
      '<html><body><script>const s = "</html>";</script></body></html>';
    const served = render(original);

    expect(served.startsWith(original)).toBe(true);
    expect(served.match(/<script/g)).toHaveLength(2);
  });
});

describe("sandboxScriptIn", () => {
  it("round-trips the revision the runtime path was built with", () => {
    expect(sandboxScriptIn(runtimeScriptPath(REVISION))).toEqual({
      revision: REVISION,
      assetPath: "/runtime.js",
    });
  });

  it("serves the authoring chunk that sits beside the runtime", () => {
    expect(sandboxScriptIn(`/__coedit/${REVISION}/author.js`)).toEqual({
      revision: REVISION,
      assetPath: "/author.js",
    });
  });

  it("rejects paths that ask for no script we ship", () => {
    const paths = [
      "/__coedit/runtime.js",
      "/__coedit//runtime.js",
      `/__coedit/${REVISION}/runtime.js.map`,
      `/__coedit/${REVISION}/index.html`,
      `/${REVISION}/runtime.js`,
      "/runtime.js",
    ];

    for (const path of paths) {
      expect(sandboxScriptIn(path)).toBeNull();
    }
  });

  it("refuses a revision that tries to reach further down the path", () => {
    expect(sandboxScriptIn("/__coedit/a/b/runtime.js")).toBeNull();
    expect(sandboxScriptIn("/__coedit/../../author.js")).toBeNull();
  });
});
