import { describe, expect, it } from "vitest";
import { appendRuntimeScript, RUNTIME_SCRIPT_PATH } from "./artifact-render";

function encode(source: string): ArrayBuffer {
  return new Uint8Array(new TextEncoder().encode(source)).buffer;
}

describe("appendRuntimeScript", () => {
  it("keeps every original byte unchanged and in place", () => {
    const original = new Uint8Array(
      encode("<!doctype html><html><body>Hi</body></html>"),
    );
    const served = new Uint8Array(appendRuntimeScript(original.buffer));

    expect(served.subarray(0, original.byteLength)).toEqual(original);
  });

  it("appends exactly one script tag referencing the runtime path", () => {
    const original = "<html></html>";
    const served = new TextDecoder().decode(
      appendRuntimeScript(encode(original)),
    );
    const appended = served.slice(original.length);

    expect(appended).toBe(
      `\n<script src="${RUNTIME_SCRIPT_PATH}" defer></script>\n`,
    );
    expect(served.match(/<script/g)).toHaveLength(1);
  });

  it("does not require a closing </html> tag to be present", () => {
    const original = "<html><body>no closing tag";
    const served = new TextDecoder().decode(
      appendRuntimeScript(encode(original)),
    );

    expect(served.startsWith(original)).toBe(true);
  });

  it("does not treat </html> inside the artifact's own script as a splice point", () => {
    const original =
      '<html><body><script>const s = "</html>";</script></body></html>';
    const served = new TextDecoder().decode(
      appendRuntimeScript(encode(original)),
    );

    expect(served.startsWith(original)).toBe(true);
    expect(served.match(/<script/g)).toHaveLength(2);
  });
});
