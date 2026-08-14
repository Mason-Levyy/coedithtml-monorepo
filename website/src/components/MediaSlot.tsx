// Every recording on this page is a blank until someone screen-captures the
// app. The slot holds the space at the right shape and says what belongs in it.
export function MediaSlot({ name, hint }: { name: string; hint: string }) {
  return (
    <figure className="slot">
      <figcaption className="slot__name">{name}</figcaption>
      <p className="slot__hint">{hint}</p>
    </figure>
  );
}
