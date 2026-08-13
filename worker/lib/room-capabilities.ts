export const TOKEN_KINDS = ["view", "suggest", "edit"] as const;

export type TokenKind = (typeof TOKEN_KINDS)[number];

export type RoomCapabilities = { canWrite: boolean; canEdit: boolean };

const NOTHING: RoomCapabilities = { canWrite: false, canEdit: false };

export function capabilitiesFor(kind: TokenKind): RoomCapabilities {
  return {
    canWrite: kind === "suggest" || kind === "edit",
    canEdit: kind === "edit",
  };
}

export function capabilitiesInHeader(value: string | null): RoomCapabilities {
  const kind = TOKEN_KINDS.find((known) => known === value);
  return kind === undefined ? NOTHING : capabilitiesFor(kind);
}
