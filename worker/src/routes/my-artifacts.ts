import type { WorkerEnv } from "@/lib/env";
import { listOwnerArtifacts } from "@/lib/owner-artifacts";
import { ownerIdFrom } from "@/lib/owner-cookie";
import { jsonResponse } from "@/lib/responses";
import { TOKEN_FIELD, TOKEN_KINDS } from "@/lib/room-capabilities";
import { viewerUrl } from "@/lib/share-links";

const URL_FIELD = {
  view: "viewUrl",
  suggest: "suggestUrl",
  edit: "editUrl",
} as const;

export async function handleListMyArtifacts(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const ownerId = ownerIdFrom(request);
  if (ownerId === null) {
    return jsonResponse({ artifacts: [] }, 200);
  }

  const items = await listOwnerArtifacts(env.ARTIFACT_METADATA, ownerId);
  const artifacts = items.map((item) => ({
    ...item,
    ...Object.fromEntries(
      TOKEN_KINDS.flatMap((kind) => {
        const token = item[TOKEN_FIELD[kind]];
        return token === undefined
          ? []
          : [[URL_FIELD[kind], viewerUrl(env, token)]];
      }),
    ),
  }));

  return jsonResponse({ artifacts }, 200);
}
