// One structured line per meaningful action, for Workers Logs. It carries only
// where a visit came from (the referrer's hostname, a utm_source tag) and the
// caller's product name, never a path, token, IP address or file content.

const FIELD_LIMIT = 60;

function referrerHost(request: Request): string | null {
  const referrer = request.headers.get("referer");
  if (referrer === null) {
    return null;
  }
  try {
    const { hostname } = new URL(referrer);
    return hostname === new URL(request.url).hostname ? null : hostname;
  } catch {
    return null;
  }
}

export function usageLine(
  event: string,
  request: Request,
  detail: Record<string, string> = {},
): Record<string, string | null> {
  const product = (request.headers.get("user-agent") ?? "").split("/")[0];
  return {
    usage: event,
    referrer: referrerHost(request),
    utm_source:
      new URL(request.url).searchParams
        .get("utm_source")
        ?.slice(0, FIELD_LIMIT) ?? null,
    client: product?.slice(0, FIELD_LIMIT) || null,
    ...detail,
  };
}

export function logUsage(
  event: string,
  request: Request,
  detail: Record<string, string> = {},
): void {
  console.log(JSON.stringify(usageLine(event, request, detail)));
}
