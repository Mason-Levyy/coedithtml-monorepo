export function clientIpOf(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
