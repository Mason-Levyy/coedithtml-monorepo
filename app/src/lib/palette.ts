export const PALETTE_COLUMNS = 8;

const LIGHT_ROW = [
  "#ffc9c9",
  "#ffdcab",
  "#fff3a3",
  "#c2f0c6",
  "#b5eee4",
  "#c3ddff",
  "#ded0f9",
  "#ffc6d9",
] as const;

const MID_ROW = [
  "#f06a5d",
  "#f79a3e",
  "#f2cb2f",
  "#63c26a",
  "#35b7a4",
  "#4f9ae8",
  "#9b7ad6",
  "#ec6ea0",
] as const;

const DEEP_ROW = [
  "#b4322c",
  "#b8681a",
  "#8f7512",
  "#2f7a3a",
  "#14706a",
  "#2456b5",
  "#5b3a9e",
  "#a62d63",
] as const;

const NEUTRAL_ROW = [
  "#ffffff",
  "#f2f2f0",
  "#d8d9d4",
  "#b0b2ad",
  "#7c7f7a",
  "#4d504c",
  "#2a2c2a",
  "#111111",
] as const;

export const READER_PALETTE: readonly string[] = [
  ...LIGHT_ROW,
  ...MID_ROW,
  ...DEEP_ROW,
  ...NEUTRAL_ROW,
];

export function readerColorFor(seed: string): string {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 4294967296;
  }
  return MID_ROW[hash % MID_ROW.length] ?? MID_ROW[0];
}
