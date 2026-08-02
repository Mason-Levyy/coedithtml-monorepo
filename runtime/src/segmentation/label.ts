const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const MAX_LABEL_LENGTH = 80;

function truncate(text: string): string {
  const collapsed = text.trim().replace(/\s+/g, " ");
  return collapsed.length > MAX_LABEL_LENGTH
    ? `${collapsed.slice(0, MAX_LABEL_LENGTH - 1)}…`
    : collapsed;
}

export function deriveLabel(range: Element[], index: number): string {
  for (const element of range) {
    const heading = element.matches(HEADING_SELECTOR)
      ? element
      : element.querySelector(HEADING_SELECTOR);
    const text = heading?.textContent?.trim();
    if (text) {
      return truncate(text);
    }
  }
  for (const element of range) {
    const text = element.textContent?.trim();
    if (text) {
      return truncate(text);
    }
  }
  return `Slide ${index + 1}`;
}
