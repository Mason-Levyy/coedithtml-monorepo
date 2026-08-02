export function resolvePrimaryContainer(doc: Document): Element {
  return doc.querySelector("main") ?? doc.body;
}
