export function MediaSlot({ name, hint }: { name: string; hint: string }) {
  return (
    <figure className="slot">
      <figcaption className="slot__name">{name}</figcaption>
      <p className="slot__hint">{hint}</p>
    </figure>
  );
}
