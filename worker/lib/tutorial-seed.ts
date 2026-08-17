import type {
  Author,
  CommentEntry,
  MarkColor,
  OverlayEntry,
  StickyEntry,
  TailTip,
} from "@coedithtml/protocol";

const YANA: Author = {
  id: "tutorial-yana",
  displayName: "Yana",
  source: "anonymous",
};

const MASON: Author = {
  id: "tutorial-mason",
  displayName: "Mason",
  source: "anonymous",
};

const JENNY: Author = {
  id: "tutorial-jenny",
  displayName: "Jenny",
  source: "anonymous",
};

const NORA: Author = {
  id: "tutorial-nora",
  displayName: "Nora",
  source: "anonymous",
};

const COEDIT_TEAM: Author = {
  id: "tutorial-coedit-team",
  displayName: "Coedit Team",
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
  width: number | null;
  height: number | null;
  tail: TailTip | null;
  body: string;
  author: Author;
  color: MarkColor;
};

export const EM_DASH_SENTENCE =
  "Our fourth quarter results — which were, on the whole, quite strong — came in ahead of the forecast we published in June.";

const ELABORATE: StickySeed = {
  id: "tutorial-elaborate",
  path: "main[1]",
  fractionX: 0.027006166952627676,
  fractionY: 0.6372820826895983,
  offsetX: -185.99998474121094,
  offsetY: 24,
  width: null,
  height: null,
  tail: { x: 205.76043701171875, y: 37.79166793823242 },
  body: "Can you elaborate here?",
  author: YANA,
  color: "blue",
};

const FAVORITE: StickySeed = {
  id: "tutorial-favorite",
  path: "main[1]/section[2]/div[2]",
  fractionX: 0.6674837037628772,
  fractionY: 0.5010630046351675,
  offsetX: -28.00006103515625,
  offsetY: -85.3333740234375,
  width: null,
  height: null,
  tail: { x: -28, y: 66.6666259765625 },
  body: "This is my favorite part",
  author: MASON,
  color: "purple",
};

const LOOKS_GREAT: StickySeed = {
  id: "tutorial-looks-great",
  path: "main[1]/section[4]",
  fractionX: 0.8488562527824851,
  fractionY: 0.2749845412014403,
  offsetX: -218,
  offsetY: 140,
  width: null,
  height: null,
  tail: null,
  body: "I think it looks great!",
  author: JENNY,
  color: "orange",
};

const FIX_THIS: StickySeed = {
  id: "tutorial-fix-this",
  path: "main[1]/section[4]/figure[1]/svg[1]/rect[1]",
  fractionX: 0.988677290330246,
  fractionY: 0.18734987604907372,
  offsetX: 0,
  offsetY: 0,
  width: null,
  height: null,
  tail: { x: -100, y: 2.66650390625 },
  body: "FIX THIS!",
  author: MASON,
  color: "purple",
};

const ORDER: CommentSeed = {
  id: "tutorial-order",
  quote: "a comment attaches to a sentence you highlight.",
  prefix: "places anywhere, and ",
  suffix: " Both carry the name of whoeve",
  path: "main[1]/section[4]/p[1]",
  body: "Can we change the order here?",
  author: NORA,
  color: "yellow",
};

const EM_DASHES: StickySeed = {
  id: "tutorial-em-dashes",
  path: "main[1]/section[5]",
  fractionX: 0.11111111734427657,
  fractionY: 0.5867066129424509,
  offsetX: 391.7779235839844,
  offsetY: -47.52099609375,
  width: null,
  height: null,
  tail: { x: 56.666656494140625, y: -24.031326293945312 },
  body: "Get rid of these stupid em dashes!",
  author: MASON,
  color: "purple",
};

const TRY_IT: StickySeed = {
  id: "tutorial-try-it",
  path: "main[1]/section[5]",
  fractionX: 0.08674098830334034,
  fractionY: 0.6690821780591205,
  offsetX: 64.4444580078125,
  offsetY: 19.65283203125,
  width: null,
  height: null,
  tail: { x: 138.2222900390625, y: 82.12841796875 },
  body: "Try it for yourself!",
  author: COEDIT_TEAM,
  color: "yellow",
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
    stickyFrom(ELABORATE, revision, stampedAt(now, 0)),
    stickyFrom(FAVORITE, revision, stampedAt(now, 1)),
    stickyFrom(LOOKS_GREAT, revision, stampedAt(now, 2)),
    stickyFrom(FIX_THIS, revision, stampedAt(now, 3)),
    commentFrom(ORDER, revision, stampedAt(now, 4)),
    stickyFrom(EM_DASHES, revision, stampedAt(now, 5)),
    stickyFrom(TRY_IT, revision, stampedAt(now, 6)),
  ];
}
