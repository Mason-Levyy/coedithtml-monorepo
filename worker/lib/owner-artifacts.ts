import { z } from "zod";
import { ownerArtifactsKey } from "./storage-keys";

export const ownerArtifactItemSchema = z.object({
  artifactId: z.string().min(1),
  fileName: z.string().min(1),
  size: z.number().int().positive(),
  uploadedAt: z.string().datetime(),
  published: z.boolean().default(true),
  hasPassword: z.boolean().default(false),
  expiresAt: z.string().optional(),
  viewToken: z.string().optional(),
  suggestToken: z.string().optional(),
  editToken: z.string().optional(),
});

export type OwnerArtifactItem = z.infer<typeof ownerArtifactItemSchema>;

const ownerArtifactsListSchema = z.array(ownerArtifactItemSchema);

const MAX_OWNED_ARTIFACTS = 100;

export async function listOwnerArtifacts(
  kv: KVNamespace,
  ownerId: string,
): Promise<OwnerArtifactItem[]> {
  try {
    const raw = await kv.get(ownerArtifactsKey(ownerId));
    if (raw === null) {
      return [];
    }
    const parsed = ownerArtifactsListSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return [];
    }
    return parsed.data;
  } catch {
    return [];
  }
}

async function mutateOwnerArtifacts(
  kv: KVNamespace,
  ownerId: string,
  transform: (current: OwnerArtifactItem[]) => OwnerArtifactItem[] | null,
): Promise<boolean> {
  try {
    const updated = transform(await listOwnerArtifacts(kv, ownerId));
    if (updated === null) {
      return false;
    }
    await kv.put(ownerArtifactsKey(ownerId), JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export async function addOwnerArtifact(
  kv: KVNamespace,
  ownerId: string,
  item: OwnerArtifactItem,
): Promise<boolean> {
  return mutateOwnerArtifacts(kv, ownerId, (current) =>
    [item, ...current.filter((a) => a.artifactId !== item.artifactId)].slice(
      0,
      MAX_OWNED_ARTIFACTS,
    ),
  );
}

export async function updateOwnerArtifact(
  kv: KVNamespace,
  ownerId: string,
  artifactId: string,
  updates: Partial<Omit<OwnerArtifactItem, "artifactId">>,
): Promise<boolean> {
  return mutateOwnerArtifacts(kv, ownerId, (current) => {
    const existing = current.find((a) => a.artifactId === artifactId);
    if (existing === undefined) {
      return null;
    }
    return current.map((item) =>
      item.artifactId === artifactId ? { ...item, ...updates } : item,
    );
  });
}

export async function removeOwnerArtifact(
  kv: KVNamespace,
  ownerId: string,
  artifactId: string,
): Promise<boolean> {
  return mutateOwnerArtifacts(kv, ownerId, (current) =>
    current.filter((a) => a.artifactId !== artifactId),
  );
}
