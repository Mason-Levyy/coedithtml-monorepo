import type { Anchor, MarkTool, StickyEntry } from "@coedithtml/protocol";
import type { TextIndex } from "../dom/text-index";
import type { OverlayLayer } from "../overlay/layer";
import type { StickyOverride, StickyView } from "../overlay/sticky-controller";
import type { RuntimeToAppMessage } from "../transport/messages";

export type AuthoringHost = {
  layer: OverlayLayer;
  view: StickyView;
  revision: string;
  index(): TextIndex;
  stickyById(markId: string): StickyEntry | null;
  canWrite(): boolean;
  setOverride(override: StickyOverride | null): void;
  repaint(): void;
  send(message: RuntimeToAppMessage): void;
  holdIndex(held: boolean): void;
  replayEdits(): void;
  editMadeHere(anchor: Anchor, body: string): void;
};

export type AuthoringSession = {
  arm(tool: MarkTool | null, color: string | null): void;
  placeAt(x: number, y: number): void;
  editMark(markId: string): void;
  setCapabilities(canWrite: boolean, canEdit: boolean): void;
  isEditingText(): boolean;
  afterPaint(): void;
  stop(): void;
};

export type StartAuthoring = (host: AuthoringHost) => AuthoringSession;
