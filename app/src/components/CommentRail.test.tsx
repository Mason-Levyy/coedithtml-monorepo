import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactViewer } from "@/components/ArtifactViewer";
import { FakeWebSocket } from "@/lib/fakes";
import type { CommentEntry, OverlayEntry, StickyEntry } from "@/lib/protocol";

const SANDBOX_ORIGIN = "https://sandbox.example.com";
const TOKEN = "a".repeat(32);

const ANCHOR = {
  kind: "text" as const,
  quote: "Revenue grew 18%",
  prefix: "",
  suffix: " this quarter.",
  path: "p[1]",
  revision: "r1",
};

function comment(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    kind: "comment",
    id: "c1",
    parentId: null,
    anchor: ANCHOR,
    body: "Net or gross?",
    author: { id: "reader-9", displayName: "Priya", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
    ...overrides,
  };
}

function renderViewer() {
  render(
    <ArtifactViewer
      token={TOKEN}
      src={`${SANDBOX_ORIGIN}/${TOKEN}`}
      sandboxOrigin={SANDBOX_ORIGIN}
      fileName="q3-review.html"
    />,
  );
}

function room(): FakeWebSocket {
  const socket = FakeWebSocket.last();
  if (socket === undefined) {
    throw new Error("the viewer never dialled a room");
  }
  return socket;
}

function openRoomWith(entries: OverlayEntry[], canWrite = true): void {
  act(() => {
    room().accept();
  });
  act(() => {
    room().deliver({
      version: 1,
      type: "snapshot",
      overlay: { version: 1, artifactRevision: "r1", entries },
      readers: [],
      canWrite,
    });
  });
}

function nameSelf(displayName = "Mason"): void {
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: displayName },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

function selectText(): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: SANDBOX_ORIGIN,
        data: { version: 1, type: "selection", anchor: ANCHOR, rect: null },
      }),
    );
  });
}

function sentTypes(): unknown[] {
  return room()
    .parsedSends()
    .map((message) => (message as { type: unknown }).type);
}

function lastSentOfType(type: string): Record<string, unknown> | undefined {
  return room()
    .parsedSends()
    .filter(
      (message): message is Record<string, unknown> =>
        (message as { type: unknown }).type === type,
    )
    .at(-1);
}

describe("the comment rail", () => {
  it("announces the reader as soon as the room opens", () => {
    renderViewer();
    openRoomWith([]);

    expect(sentTypes()).toContain("hello");
  });

  it("shows a thread the room already had", () => {
    renderViewer();
    openRoomWith([comment()]);

    expect(screen.getByText("Net or gross?")).toBeTruthy();
    expect(screen.getByText("Priya")).toBeTruthy();
  });

  it("counts what is still open", () => {
    renderViewer();
    openRoomWith([
      comment(),
      comment({
        id: "c2",
        status: "resolved",
        createdAt: "2026-08-04T13:00:00.000Z",
      }),
    ]);

    expect(screen.getByText("1 open")).toBeTruthy();
  });

  it("quotes the selection while a comment is being written", () => {
    renderViewer();
    openRoomWith([]);
    nameSelf();
    selectText();

    expect(screen.getByText("Revenue grew 18%")).toBeTruthy();
  });

  it("sends the comment the reader wrote against the selection", () => {
    renderViewer();
    openRoomWith([]);
    nameSelf();
    selectText();

    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "Is this net or gross?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));

    const sent = lastSentOfType("add-entry");
    expect(sent?.entry).toMatchObject({
      kind: "comment",
      body: "Is this net or gross?",
      anchor: { quote: "Revenue grew 18%" },
    });
  });

  it("resolves a thread without deleting it", () => {
    renderViewer();
    openRoomWith([comment()]);
    nameSelf();

    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));

    expect(lastSentOfType("patch-entry")).toMatchObject({
      id: "c1",
      patch: { status: "resolved" },
    });
  });

  it("replies into the thread it was written in", () => {
    renderViewer();
    openRoomWith([comment()]);
    nameSelf();

    fireEvent.change(screen.getByLabelText("Reply to Priya"), {
      target: { value: "Gross." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(lastSentOfType("add-entry")?.entry).toMatchObject({
      kind: "reply",
      parentId: "c1",
      body: "Gross.",
    });
  });

  // A view link is a distinct capability, and the rail must not pretend otherwise.
  it("offers no way to write on a read-only link", () => {
    renderViewer();
    openRoomWith([comment()], false);
    selectText();

    expect(screen.queryByLabelText("Comment")).toBeNull();
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add a sticky" })).toBeNull();
    expect(screen.getByText("Net or gross?")).toBeTruthy();
  });

  it("says so when the room refuses a change", () => {
    renderViewer();
    openRoomWith([]);
    act(() => {
      room().deliver({ version: 1, type: "rejected", reason: "read-only" });
    });

    expect(
      screen.getByText("This link can read comments but not write them."),
    ).toBeTruthy();
  });

  // Silently hiding an orphan loses the feedback somebody took time to write.
  it("admits when a mark's target is gone", () => {
    renderViewer();
    openRoomWith([comment()]);
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: SANDBOX_ORIGIN,
          data: { version: 1, type: "orphans", markIds: ["c1"] },
        }),
      );
    });

    expect(screen.getByText("The text this points at is gone")).toBeTruthy();
  });

  it("places a sticky where the reader clicked the artifact", () => {
    renderViewer();
    openRoomWith([]);
    nameSelf();

    fireEvent.click(screen.getByRole("button", { name: "Add a sticky" }));
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: SANDBOX_ORIGIN,
          data: {
            version: 1,
            type: "placement",
            anchor: {
              kind: "region",
              path: "div[2]/canvas[1]",
              fractionX: 0.5,
              fractionY: 0.25,
              revision: "r1",
            },
          },
        }),
      );
    });

    expect(lastSentOfType("add-entry")?.entry).toMatchObject({
      kind: "sticky",
      tail: null,
      anchor: { kind: "region", path: "div[2]/canvas[1]" },
    });
  });

  // Attribution is the whole point of the name, so it gates writing, not reading.
  it("withholds every way to write until the reader says who they are", () => {
    renderViewer();
    openRoomWith([comment()]);
    selectText();

    expect(screen.getByText(/Put your name in to comment/)).toBeTruthy();
    expect(screen.queryByLabelText("Comment")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add a sticky" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
    expect(screen.getByText("Net or gross?")).toBeTruthy();
  });

  it("opens writing up the moment a name is saved", () => {
    renderViewer();
    openRoomWith([comment()]);
    selectText();
    nameSelf();

    expect(screen.queryByText(/Put your name in to comment/)).toBeNull();
    expect(screen.getByLabelText("Comment")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a sticky" })).toBeTruthy();
  });

  // A view link cannot write at any name, so the prompt would be a dead end.
  it("does not ask a read-only reader for a name", () => {
    renderViewer();
    openRoomWith([comment()], false);

    expect(screen.queryByText(/Put your name in to comment/)).toBeNull();
  });

  describe("the sticky properties panel", () => {
    function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
      return {
        ...comment(),
        kind: "sticky",
        id: "s1",
        parentId: null,
        body: "Swap this chart",
        offsetX: 0,
        offsetY: 0,
        width: null,
        height: null,
        tail: null,
        ...overrides,
      };
    }

    function activate(markId: string): void {
      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: SANDBOX_ORIGIN,
            data: { version: 1, type: "mark-activated", markId },
          }),
        );
      });
    }

    it("opens when the runtime says a sticky was clicked", () => {
      renderViewer();
      openRoomWith([sticky()]);
      nameSelf();
      activate("s1");

      expect(screen.getByLabelText("Sticky text")).toBeTruthy();
    });

    it("stays shut for a comment, which has no geometry to edit", () => {
      renderViewer();
      openRoomWith([comment()]);
      nameSelf();
      activate("c1");

      expect(screen.queryByLabelText("Sticky text")).toBeNull();
    });

    it("rewrites the body without touching anything else", () => {
      renderViewer();
      openRoomWith([sticky()]);
      nameSelf();
      activate("s1");

      fireEvent.change(screen.getByLabelText("Sticky text"), {
        target: { value: "Use the cohort view" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save text" }));

      expect(lastSentOfType("patch-entry")).toMatchObject({
        id: "s1",
        patch: { body: "Use the cohort view" },
      });
    });

    // The name is what a client too old to read `fill` will paint.
    it("sends a wheel colour with the nearest preset alongside it", () => {
      renderViewer();
      openRoomWith([sticky()]);
      nameSelf();
      activate("s1");

      fireEvent.change(screen.getByLabelText("Any colour"), {
        target: { value: "#0b1f4d" },
      });

      expect(lastSentOfType("patch-entry")).toMatchObject({
        id: "s1",
        patch: { fill: "#0b1f4d", color: "blue" },
      });
    });

    it("clears the fill again when a preset is picked", () => {
      renderViewer();
      openRoomWith([sticky({ fill: "#0b1f4d", color: "blue" })]);
      nameSelf();
      activate("s1");

      fireEvent.click(screen.getByRole("button", { name: "pink" }));

      expect(lastSentOfType("patch-entry")).toMatchObject({
        patch: { fill: null, color: "pink" },
      });
    });

    it("offers a way back to sizing itself once it has been resized", () => {
      renderViewer();
      openRoomWith([sticky({ width: 300, height: 200 })]);
      nameSelf();
      activate("s1");

      fireEvent.click(screen.getByRole("button", { name: "Fit to text" }));

      expect(lastSentOfType("patch-entry")).toMatchObject({
        patch: { width: null, height: null },
      });
    });

    it("shows the move a drag inside the artifact reported", () => {
      renderViewer();
      openRoomWith([sticky()]);
      nameSelf();
      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: SANDBOX_ORIGIN,
            data: {
              version: 1,
              type: "patch-mark",
              markId: "s1",
              patch: { offsetX: 120, offsetY: 40 },
            },
          }),
        );
      });

      expect(lastSentOfType("patch-entry")).toMatchObject({
        id: "s1",
        patch: { offsetX: 120, offsetY: 40 },
      });
    });

    it("ignores a drag reported on a read-only link", () => {
      renderViewer();
      openRoomWith([sticky()], false);
      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: SANDBOX_ORIGIN,
            data: {
              version: 1,
              type: "patch-mark",
              markId: "s1",
              patch: { offsetX: 120 },
            },
          }),
        );
      });

      expect(lastSentOfType("patch-entry")).toBeUndefined();
    });
  });

  it("names the reader on what they write once they say who they are", () => {
    renderViewer();
    openRoomWith([]);

    nameSelf();
    selectText();
    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "Tighten this." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));

    expect(lastSentOfType("add-entry")?.entry).toMatchObject({
      author: { displayName: "Mason", source: "anonymous" },
    });
  });
});
