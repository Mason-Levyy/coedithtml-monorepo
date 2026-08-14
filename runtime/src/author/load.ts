import { authorScriptUrl } from "../config";
import type { StartAuthoring } from "./contract";

export function loadAuthoring(): Promise<StartAuthoring | null> {
  const registered = window.__coedit__?.author;
  if (registered !== undefined) {
    return Promise.resolve(registered);
  }

  try {
    return fetchAuthoring(authorScriptUrl());
  } catch (error) {
    console.error("[coedit] could not ask for the authoring tools", error);
    return Promise.resolve(null);
  }
}

function fetchAuthoring(url: string): Promise<StartAuthoring | null> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = url;

    script.addEventListener("load", () => {
      script.remove();
      resolve(window.__coedit__?.author ?? null);
    });
    script.addEventListener("error", () => {
      script.remove();
      resolve(null);
    });
    document.head.appendChild(script);
  });
}
