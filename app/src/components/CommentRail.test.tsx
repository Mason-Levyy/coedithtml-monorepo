import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtifactViewer } from "@/components/ArtifactViewer";
import { FakeWebSocket, renderWithQueryClient } from "@/lib/fakes";
import type {
  CommentEntry,
  OverlayEntry,
  StickyEntry,
  ViewportRect,
} from "@/lib/protocol";

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

function renderViewer({ named = true }: { named?: boolean } = {}) {
  if (named) {
    window.localStorage.setItem(
      "coedit:reader",
      JSON.stringify({
        id: "reader-1",
        displayName: "Mason",
        color: "#e8c547",
      }),
    );
  }
  renderWithQueryClient(
    <ArtifactViewer
      token={TOKEN}
      src={`${SANDBOX_ORIGIN}/${TOKEN}`}
      sandboxOrigin={SANDBOX_ORIGIN}
      fileName="q3-review.html"
      revision="9f2c1a04b7e35d68"
      shareLinks={{ view: `https://app.example.com/a/${TOKEN}` }}
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

function writeComment(body: string, displayName?: string): void {
  fireEvent.change(screen.getByLabelText("Comment"), {
    target: { value: body },
  });
  if (displayName !== undefined) {
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: displayName },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: "Comment" }));
}

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

function watchRuntimeMessages(): { type: unknown }[] {
  const posted: { type: unknown }[] = [];
  const frame = screen.getByTitle("q3-review.html");
  Object.defineProperty(frame, "contentWindow", {
    configurable: true,
    value: {
      postMessage: (message: { type: unknown }) => posted.push(message),
    },
  });
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: SANDBOX_ORIGIN,
        data: { version: 1, type: "ready", title: "Q3" },
      }),
    );
  });
  return posted;
}

function frameAt(box: {
  left: number;
  top: number;
  right: number;
  bottom: number;
}): void {
  screen.getByTitle("q3-review.html").getBoundingClientRect = () =>
    ({
      ...box,
      width: box.right - box.left,
      height: box.bottom - box.top,
    }) as DOMRect;
}

function grabPad(): HTMLElement {
  const pad = screen.getByRole("button", { name: "Add a sticky" });
  pad.setPointerCapture = () => {};
  fireEvent.pointerDown(pad, { clientX: 20, clientY: 400 });
  return pad;
}

function dragPadTo(point: { x: number; y: number }): void {
  const pad = grabPad();
  fireEvent.pointerMove(pad, { clientX: point.x, clientY: point.y });
  fireEvent.pointerUp(pad, { clientX: point.x, clientY: point.y });
}

function pressPad(): void {
  fireEvent.pointerUp(grabPad(), { clientX: 20, clientY: 400 });
}

const CHOSEN_COLOUR = "#2456b5";

function pickColour(): void {
  fireEvent.click(screen.getByRole("button", { name: "Your name and colour" }));
  fireEvent.click(screen.getByRole("button", { name: CHOSEN_COLOUR }));
}

function reportPlacement(): void {
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

function selectTextAt(rect: ViewportRect): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: SANDBOX_ORIGIN,
        data: { version: 1, type: "selection", anchor: ANCHOR, rect },
      }),
    );
  });
}

function selectionAction(): HTMLElement {
  return screen.getByRole("button", { name: "Comment on the selected text" });
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
    selectText();

    expect(screen.getByText("Revenue grew 18%")).toBeTruthy();
  });

  it("sends the comment the reader wrote against the selection", () => {
    renderViewer();
    openRoomWith([]);
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

    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));

    expect(lastSentOfType("patch-entry")).toMatchObject({
      id: "c1",
      patch: { status: "resolved" },
    });
  });

  it("replies into the thread it was written in", () => {
    renderViewer();
    openRoomWith([comment()]);

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

  function reportPlaced(placement: {
    offscreen?: string[];
    hidden?: string[];
    orphaned?: string[];
  }): void {
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: SANDBOX_ORIGIN,
          data: {
            version: 1,
            type: "placed",
            offscreen: [],
            hidden: [],
            orphaned: [],
            ...placement,
          },
        }),
      );
    });
  }

  it("admits when a mark's target is gone", () => {
    renderViewer();
    openRoomWith([comment()]);
    reportPlaced({ orphaned: ["c1"] });

    expect(screen.getByText("The text this points at is gone")).toBeTruthy();
  });

  it("distinguishes a target the artifact is not showing from a lost one", () => {
    renderViewer();
    openRoomWith([comment()]);
    reportPlaced({ hidden: ["c1"] });

    expect(
      screen.getByText("The artifact is not showing this right now"),
    ).toBeTruthy();
    expect(screen.queryByText("The text this points at is gone")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
  });

  it("offers to scroll a target that is only out of view", () => {
    renderViewer();
    const posted = watchRuntimeMessages();
    openRoomWith([comment()]);
    reportPlaced({ offscreen: ["c1"] });

    act(() => {
      screen.getByRole("button", { name: "Show me" }).click();
    });

    expect(posted.at(-1)).toMatchObject({
      type: "reveal-mark",
      markId: "c1",
    });
  });

  it("says nothing about a mark that is on screen", () => {
    renderViewer();
    openRoomWith([comment()]);
    reportPlaced({});

    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
    expect(screen.queryByText("The text this points at is gone")).toBeNull();
  });

  describe("copying feedback for an AI tool", () => {
    function copyFeedback(): string[] {
      const written: string[] = [];
      vi.stubGlobal("navigator", {
        clipboard: {
          writeText: (text: string) => {
            written.push(text);
            return Promise.resolve();
          },
        },
      });
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Copy feedback for AI tool" }),
      );
      return written;
    }

    it("renders what the room is actually holding", async () => {
      renderViewer();
      openRoomWith([comment()]);

      const written = copyFeedback();

      await waitFor(() => expect(written).toHaveLength(1));
      expect(written[0]).toContain("# Feedback on q3-review.html");
      expect(written[0]).toContain('## On "Revenue grew 18%"');
      expect(written[0]).toContain("**Priya:** Net or gross?");
    });

    it("separates threads the runtime reported as orphaned", async () => {
      renderViewer();
      openRoomWith([comment()]);
      reportPlaced({ orphaned: ["c1"] });

      const written = copyFeedback();

      await waitFor(() => expect(written).toHaveLength(1));
      expect(written[0]).toContain("## Unplaced");
    });

    it("cannot be copied when the room is empty", () => {
      renderViewer();
      openRoomWith([]);

      fireEvent.click(screen.getByRole("button", { name: "Share" }));

      expect(
        screen.getByRole("button", { name: "Copy feedback for AI tool" }),
      ).toHaveProperty("disabled", true);
    });
  });

  describe("dropping a sticky", () => {
    it("places one where the runtime resolved the drop", () => {
      renderViewer();
      openRoomWith([]);
      reportPlacement();

      expect(lastSentOfType("add-entry")?.entry).toMatchObject({
        kind: "sticky",
        tail: null,
        anchor: { kind: "region", path: "div[2]/canvas[1]" },
      });
    });

    it("leaves the note empty and asks the artifact to open it for typing", () => {
      renderViewer();
      const posted = watchRuntimeMessages();
      openRoomWith([]);
      reportPlacement();

      const entry = lastSentOfType("add-entry")?.entry as { id: string };
      expect(entry).toMatchObject({ body: "" });
      expect(posted).toContainEqual(
        expect.objectContaining({ type: "edit-mark", markId: entry.id }),
      );
    });

    it("hands the runtime the point the pad was dragged to", () => {
      renderViewer();
      const posted = watchRuntimeMessages();
      openRoomWith([]);
      frameAt({ left: 40, top: 100, right: 840, bottom: 700 });

      dragPadTo({ x: 240, y: 300 });

      expect(posted).toContainEqual(
        expect.objectContaining({ type: "place-at", x: 200, y: 200 }),
      );
    });

    it("drops nothing when the pad is released off the artifact", () => {
      renderViewer();
      const posted = watchRuntimeMessages();
      openRoomWith([]);
      frameAt({ left: 40, top: 100, right: 840, bottom: 700 });

      dragPadTo({ x: 900, y: 300 });

      expect(posted.map((message) => message.type)).not.toContain("place-at");
    });

    it("arms the artifact when the pad is pressed without dragging", () => {
      renderViewer();
      const posted = watchRuntimeMessages();
      openRoomWith([]);

      pressPad();

      expect(posted).toContainEqual(
        expect.objectContaining({ type: "set-tool", tool: "sticky" }),
      );
    });

    it("stands the pad down when the artifact reports the tool cancelled", () => {
      renderViewer();
      openRoomWith([]);
      pressPad();
      expect(screen.getByText("Click page")).toBeTruthy();

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: SANDBOX_ORIGIN,
            data: { version: 1, type: "tool-cancelled" },
          }),
        );
      });

      expect(screen.queryByText("Click page")).toBeNull();
    });
  });

  it("deletes the sticky the reader threw away from inside the artifact", () => {
    renderViewer();
    openRoomWith([sticky()]);
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: SANDBOX_ORIGIN,
          data: { version: 1, type: "remove-mark", markId: "s1" },
        }),
      );
    });

    expect(lastSentOfType("remove-entry")).toMatchObject({ id: "s1" });
  });

  it("ignores a delete reported on a read-only link", () => {
    renderViewer();
    openRoomWith([sticky()], false);
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: SANDBOX_ORIGIN,
          data: { version: 1, type: "remove-mark", markId: "s1" },
        }),
      );
    });

    expect(lastSentOfType("remove-entry")).toBeUndefined();
  });

  it("shows the move a drag inside the artifact reported", () => {
    renderViewer();
    openRoomWith([sticky()]);
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

  describe("the reader's colour", () => {
    it("paints what the reader writes without asking them per mark", () => {
      renderViewer();
      openRoomWith([]);
      pickColour();
      selectText();

      fireEvent.change(screen.getByLabelText("Comment"), {
        target: { value: "Tighten this." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Comment" }));

      expect(lastSentOfType("add-entry")?.entry).toMatchObject({
        fill: CHOSEN_COLOUR,
      });
    });

    it("names the nearest preset alongside the exact colour", () => {
      renderViewer();
      openRoomWith([]);
      pickColour();
      reportPlacement();

      expect(lastSentOfType("add-entry")?.entry).toMatchObject({
        fill: CHOSEN_COLOUR,
        color: "blue",
      });
    });

    it("keeps the colour for the next visit", () => {
      renderViewer();
      openRoomWith([]);
      pickColour();

      expect(window.localStorage.getItem("coedit:reader")).toContain(
        CHOSEN_COLOUR,
      );
    });
  });

  describe("commenting from the selection", () => {
    const RECT = { x: 10, y: 20, width: 100, height: 16 };
    const FRAME = { left: 40, top: 100, right: 840, bottom: 700 };

    it("offers the action without disturbing the rail", () => {
      renderViewer();
      openRoomWith([]);
      fireEvent.click(screen.getByRole("button", { name: "Hide comments" }));
      frameAt(FRAME);

      selectTextAt(RECT);

      expect(selectionAction()).toBeTruthy();
      expect(screen.queryByLabelText("Comment")).toBeNull();
    });

    it("places the action against the text it belongs to", () => {
      renderViewer();
      openRoomWith([]);
      frameAt(FRAME);

      selectTextAt(RECT);

      expect(selectionAction().style.left).toBe("50px");
      expect(selectionAction().style.top).toBe("136px");
    });

    it("opens the composer only once the reader asks", () => {
      renderViewer();
      openRoomWith([]);
      frameAt(FRAME);
      selectTextAt(RECT);

      fireEvent.click(selectionAction());

      expect(screen.getByLabelText("Comment")).toBeTruthy();
      expect(screen.getByText("Revenue grew 18%")).toBeTruthy();
    });

    it("stands down once the composer has the selection", () => {
      renderViewer();
      openRoomWith([]);
      frameAt(FRAME);
      selectTextAt(RECT);

      fireEvent.click(selectionAction());

      expect(
        screen.queryByRole("button", { name: "Comment on the selected text" }),
      ).toBeNull();
    });

    it("offers nothing to a reader who cannot write", () => {
      renderViewer();
      openRoomWith([], false);
      frameAt(FRAME);

      selectTextAt(RECT);

      expect(
        screen.queryByRole("button", { name: "Comment on the selected text" }),
      ).toBeNull();
    });

    it("falls back to the rail when the artifact reports no rect", () => {
      renderViewer();
      openRoomWith([]);
      fireEvent.click(screen.getByRole("button", { name: "Hide comments" }));

      selectText();

      expect(screen.getByLabelText("Comment")).toBeTruthy();
    });
  });

  describe("the rail", () => {
    it("folds away and comes back on the count", () => {
      renderViewer();
      openRoomWith([comment()]);

      fireEvent.click(screen.getByRole("button", { name: "Hide comments" }));
      expect(screen.queryByText("Net or gross?")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Show comments" }));
      expect(screen.getByText("Net or gross?")).toBeTruthy();
    });

    it("comes back on its own when a selection needs the composer", () => {
      renderViewer();
      openRoomWith([]);
      fireEvent.click(screen.getByRole("button", { name: "Hide comments" }));

      selectText();

      expect(screen.getByLabelText("Comment")).toBeTruthy();
    });

    it("comes back for a selection even before the reader is named", () => {
      renderViewer({ named: false });
      openRoomWith([]);
      fireEvent.click(screen.getByRole("button", { name: "Hide comments" }));

      selectText();

      expect(screen.getByLabelText("Comment")).toBeTruthy();
    });
  });

  describe("a reader who has not said who they are", () => {
    it("is asked for nothing until they arrive", () => {
      renderViewer({ named: false });
      openRoomWith([comment()]);

      expect(screen.queryByLabelText("Your name")).toBeNull();
      expect(screen.getByText("Net or gross?")).toBeTruthy();
    });

    it("can still mark the artifact up", () => {
      renderViewer({ named: false });
      openRoomWith([comment()]);

      expect(screen.getByRole("button", { name: "Add a sticky" })).toBeTruthy();
    });

    it("is asked for a name inside the composer, not before it", () => {
      renderViewer({ named: false });
      openRoomWith([]);

      selectText();

      expect(screen.getByLabelText("Comment")).toBeTruthy();
      expect(screen.getByLabelText("Your name")).toBeTruthy();
    });

    it("names themselves and posts in one action", () => {
      renderViewer({ named: false });
      openRoomWith([]);
      selectText();

      writeComment("Tighten this.", "Priya");

      expect(lastSentOfType("add-entry")?.entry).toMatchObject({
        body: "Tighten this.",
        author: { displayName: "Priya", source: "anonymous" },
      });
    });

    it("cannot post a comment with no name against it", () => {
      renderViewer({ named: false });
      openRoomWith([]);
      selectText();

      fireEvent.change(screen.getByLabelText("Comment"), {
        target: { value: "Tighten this." },
      });

      expect(screen.getByRole("button", { name: "Comment" })).toHaveProperty(
        "disabled",
        true,
      );
    });

    it("is asked for a name when they reach for a sticky", () => {
      renderViewer({ named: false });
      const posted = watchRuntimeMessages();
      openRoomWith([]);

      pressPad();

      expect(screen.getByText(/Put your name in/)).toBeTruthy();
      expect(posted).not.toContainEqual(
        expect.objectContaining({ type: "set-tool", tool: "sticky" }),
      );
    });

    it("reaches the sticky once they have named themselves in the bar", () => {
      renderViewer({ named: false });
      const posted = watchRuntimeMessages();
      openRoomWith([]);
      pressPad();

      fireEvent.change(screen.getByLabelText("Your name"), {
        target: { value: "Priya" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      pressPad();

      expect(posted).toContainEqual(
        expect.objectContaining({ type: "set-tool", tool: "sticky" }),
      );
    });
  });

  it("does not ask a read-only reader for a name", () => {
    renderViewer({ named: false });
    openRoomWith([comment()], false);
    selectText();

    expect(screen.queryByLabelText("Your name")).toBeNull();
  });

  it("names the reader it already knows without asking again", () => {
    renderViewer();
    openRoomWith([]);

    selectText();
    writeComment("Tighten this.");

    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(screen.getByText("Mason")).toBeTruthy();
    expect(lastSentOfType("add-entry")?.entry).toMatchObject({
      author: { displayName: "Mason", source: "anonymous" },
    });
  });
});
