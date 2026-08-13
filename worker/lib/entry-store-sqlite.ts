import { parseOverlayEntry, type OverlayEntry } from "@coedithtml/protocol";
import type { EntryStore } from "./overlay-log";

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
)`;

const UPSERT = `INSERT INTO entries (id, created_at, payload) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`;

function decodeEntry(payload: unknown): OverlayEntry | null {
  if (typeof payload !== "string") {
    return null;
  }
  try {
    return parseOverlayEntry(JSON.parse(payload));
  } catch {
    return null;
  }
}

export function createEntryStore(sql: SqlStorage): EntryStore {
  sql.exec(CREATE_TABLE);

  return {
    list(): OverlayEntry[] {
      const rows = sql
        .exec("SELECT payload FROM entries ORDER BY created_at, id")
        .toArray();
      const entries: OverlayEntry[] = [];
      for (const row of rows) {
        const entry = decodeEntry(row.payload);
        if (entry === null) {
          console.error("Skipped an overlay entry that no longer parses");
          continue;
        }
        entries.push(entry);
      }
      return entries;
    },

    get(id: string): OverlayEntry | null {
      const row = sql
        .exec("SELECT payload FROM entries WHERE id = ?", id)
        .toArray()[0];
      return row === undefined ? null : decodeEntry(row.payload);
    },

    put(entry: OverlayEntry): void {
      sql.exec(UPSERT, entry.id, entry.createdAt, JSON.stringify(entry));
    },

    remove(id: string): void {
      sql.exec("DELETE FROM entries WHERE id = ?", id);
    },

    count(): number {
      const row = sql
        .exec("SELECT COUNT(*) AS total FROM entries")
        .toArray()[0];
      const total = row?.total;
      return typeof total === "number" ? total : 0;
    },
  };
}
