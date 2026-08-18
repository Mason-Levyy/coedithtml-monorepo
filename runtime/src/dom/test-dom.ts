export function elementById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`the test fixture has no element with id "${id}"`);
  }
  return element;
}
