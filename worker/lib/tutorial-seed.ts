import type {
  Author,
  CommentEntry,
  MarkColor,
  OverlayEntry,
  StickyEntry,
  TailTip,
} from "@coedithtml/protocol";

const ADA: Author = {
  id: "tutorial-ada",
  displayName: "Ada from the tour",
  source: "anonymous",
};

const MARCUS: Author = {
  id: "tutorial-marcus",
  displayName: "Marcus from the tour",
  source: "anonymous",
};

type CommentSeed = {
  id: string;
  quote: string;
  prefix: string;
  suffix: string;
  path: string;
  body: string;
  author: Author;
  color: MarkColor;
};

type StickySeed = {
  id: string;
  path: string;
  fractionX: number;
  fractionY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  tail: TailTip | null;
  body: string;
  author: Author;
  color: MarkColor;
};

export const EM_DASH_SENTENCE =
  "Our fourth quarter results — which were, on the whole, quite strong — came in ahead of the forecast we published in June.";

const PRAISE: StickySeed = {
  id: "tutorial-praise",
  path: "main[1]/section[4]/figure[1]",
  fractionX: 0.46,
  fractionY: 0.1,
  offsetX: 0,
  offsetY: 0,
  width: 190,
  height: 96,
  tail: null,
  body: "Wow this looks great",
  author: ADA,
  color: "green",
};

const ORDER: CommentSeed = {
  id: "tutorial-order",
  quote:
    "first you upload the file, then you send the link, then you read what came back.",
  prefix: "in the same order every time: ",
  suffix: " Do this: reply to both notes,",
  path: "main[1]/section[4]/p[2]",
  body: "Can we change the order here?",
  author: MARCUS,
  color: "yellow",
};

const EM_DASHES: StickySeed = {
  id: "tutorial-em-dashes",
  path: "main[1]/section[5]/p[2]",
  fractionX: 0.02,
  fractionY: 1,
  offsetX: 0,
  offsetY: 20,
  width: 250,
  height: 110,
  tail: { x: 72, y: -30 },
  body: "Get rid of those pesky em dashes.",
  author: MARCUS,
  color: "pink",
};

function stampedAt(start: Date, position: number): string {
  return new Date(start.getTime() + position * 1000).toISOString();
}

function commentFrom(
  seed: CommentSeed,
  revision: string,
  createdAt: string,
): CommentEntry {
  return {
    kind: "comment",
    id: seed.id,
    parentId: null,
    anchor: {
      kind: "text",
      quote: seed.quote,
      prefix: seed.prefix,
      suffix: seed.suffix,
      path: seed.path,
      revision,
    },
    body: seed.body,
    author: seed.author,
    color: seed.color,
    fill: null,
    status: "open",
    createdAt,
  };
}

function stickyFrom(
  seed: StickySeed,
  revision: string,
  createdAt: string,
): StickyEntry {
  return {
    kind: "sticky",
    id: seed.id,
    parentId: null,
    anchor: {
      kind: "region",
      path: seed.path,
      fractionX: seed.fractionX,
      fractionY: seed.fractionY,
      revision,
    },
    body: seed.body,
    author: seed.author,
    color: seed.color,
    fill: null,
    status: "open",
    createdAt,
    offsetX: seed.offsetX,
    offsetY: seed.offsetY,
    width: seed.width,
    height: seed.height,
    tail: seed.tail,
  };
}

export function tutorialEntries(options: {
  revision: string;
  now: Date;
}): OverlayEntry[] {
  const { revision, now } = options;
  return [
    stickyFrom(PRAISE, revision, stampedAt(now, 0)),
    commentFrom(ORDER, revision, stampedAt(now, 1)),
    stickyFrom(EM_DASHES, revision, stampedAt(now, 2)),
  ];
}
