import { originFor } from "@/lib/origins";

export function isCrossOriginWrite(
  request: Request,
  config: { APP_HOST: string },
): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return false;
  }
  return origin !== originFor(config.APP_HOST);
}
