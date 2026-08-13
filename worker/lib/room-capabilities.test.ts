import { describe, expect, it } from "vitest";
import { capabilitiesFor, capabilitiesInHeader } from "./room-capabilities";

describe("capabilitiesFor", () => {
  it("lets a view link read and nothing else", () => {
    expect(capabilitiesFor("view")).toEqual({
      canWrite: false,
      canEdit: false,
    });
  });

  it("lets a suggest link mark up without touching the text", () => {
    expect(capabilitiesFor("suggest")).toEqual({
      canWrite: true,
      canEdit: false,
    });
  });

  it("lets an edit link do both", () => {
    expect(capabilitiesFor("edit")).toEqual({ canWrite: true, canEdit: true });
  });
});

describe("capabilitiesInHeader", () => {
  it("reads a kind the room recognises", () => {
    expect(capabilitiesInHeader("suggest")).toEqual({
      canWrite: true,
      canEdit: false,
    });
  });

  it("grants nothing for a kind it does not recognise", () => {
    for (const unknown of [null, "", "admin", "Edit"]) {
      expect(capabilitiesInHeader(unknown)).toEqual({
        canWrite: false,
        canEdit: false,
      });
    }
  });
});
