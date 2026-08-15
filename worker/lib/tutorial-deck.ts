import type { WorkerEnv } from "@/lib/env";

export const TUTORIAL_DECK_ASSET_PATH = "/tutorial-deck.html";

export const TUTORIAL_FILE_NAME = "a-tour-of-coedithtml.html";

export async function readTutorialDeck(
  request: Request,
  env: WorkerEnv,
): Promise<ArrayBuffer | null> {
  try {
    const response = await env.ASSETS.fetch(
      new Request(new URL(TUTORIAL_DECK_ASSET_PATH, request.url)),
    );
    if (!response.ok) {
      console.error(`Tutorial deck asset returned ${response.status}`);
      return null;
    }
    return await response.arrayBuffer();
  } catch (cause) {
    console.error("Failed to read the tutorial deck asset", cause);
    return null;
  }
}
