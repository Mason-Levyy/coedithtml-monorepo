import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolvePrimaryContainer } from "./container";
import { FIXTURE_MANIFEST } from "./fixture-manifest";
import { segmentWithProfile } from "./segment";

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures",
);

// getBoundingClientRect is always zero in happy-dom (no real layout engine),
// so layout-strategy fixtures declare a height per child to test against.
function applyTestHeights(container: Element): void {
  for (const child of [...container.children]) {
    const declared = child.getAttribute("data-test-height");
    if (declared !== null) {
      child.getBoundingClientRect = () =>
        ({ height: Number(declared) }) as unknown as DOMRect;
    }
  }
}

describe("segmentation fixture corpus", () => {
  it.each(FIXTURE_MANIFEST)(
    "$file segments into $expectedSlideCount slide(s), profile $expectedProfile",
    ({ file, expectedSlideCount, expectedProfile }) => {
      const source = readFileSync(path.join(fixturesDir, file), "utf-8");
      const doc = new DOMParser().parseFromString(source, "text/html");
      const container = resolvePrimaryContainer(doc);
      applyTestHeights(container);

      const result = segmentWithProfile(container);

      expect(result.slides).toHaveLength(expectedSlideCount);
      expect(result.profile).toBe(expectedProfile);
    },
  );

  it("has at least 20 fixtures", () => {
    expect(FIXTURE_MANIFEST.length).toBeGreaterThanOrEqual(20);
  });

  it("spans documents, dashboards/games, and long-scroll pages", () => {
    const categories = new Set(
      FIXTURE_MANIFEST.map((fixture) => fixture.category),
    );
    expect(categories).toEqual(
      new Set(["markers", "semantic", "layout", "app"]),
    );
  });
});
