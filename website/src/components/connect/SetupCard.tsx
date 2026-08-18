type SetupCardProps = {
  client: string;
  where: string;
  action: { href: string; label: string };
  steps: string[];
  note: React.ReactNode;
  updated: string;
};

export function SetupCard({
  client,
  where,
  action,
  steps,
  note,
  updated,
}: SetupCardProps) {
  return (
    <section className="card setup-card">
      <h2>{client}</h2>
      <p className="note">{where}</p>

      <a
        className="btn btn--small setup-card__open"
        href={action.href}
        target="_blank"
        rel="noreferrer"
      >
        {action.label}
      </a>

      <ol className="steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <p className="setup-card__note">{note}</p>

      <p className="setup-card__updated">Updated {updated}</p>
    </section>
  );
}
