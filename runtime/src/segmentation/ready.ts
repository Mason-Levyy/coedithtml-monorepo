export type ReadyOptions = {
  quietMs?: number;
  maxWaitMs?: number;
};

const DEFAULT_QUIET_MS = 300;
const DEFAULT_MAX_WAIT_MS = 5000;

function waitForLoad(): Promise<void> {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

// maxWaitMs caps the wait, since a continuously-mutating page would never go quiet.
function waitForQuiet(
  target: Node,
  quietMs: number,
  maxWaitMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let quietTimer: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      resolve();
    };

    const observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, quietMs);
    });
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    quietTimer = setTimeout(finish, quietMs);
    const maxTimer = setTimeout(finish, maxWaitMs);
  });
}

export async function waitUntilReady(
  target: Node,
  options: ReadyOptions = {},
): Promise<void> {
  const quietMs = options.quietMs ?? DEFAULT_QUIET_MS;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;

  await waitForLoad();
  await waitForQuiet(target, quietMs, maxWaitMs);
}
