const KINDS = [
  "Decks",
  "Dashboards",
  "One-pagers",
  "Reports",
  "Prototypes",
  "Landing pages",
];

export function FileKinds() {
  return (
    <section className="kinds">
      <div className="shell kinds__row">
        <p className="kinds__label">If it is one HTML file, it works here:</p>
        {KINDS.map((kind) => (
          <span className="chip" key={kind}>
            {kind}
          </span>
        ))}
      </div>
    </section>
  );
}
