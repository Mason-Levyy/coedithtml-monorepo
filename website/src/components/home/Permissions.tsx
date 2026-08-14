const LEVELS = [
  {
    tone: "read",
    title: "Read",
    body: "They open it and use it. Every link is a working copy of your file, so a prototype still clicks and a dashboard still filters.",
  },
  {
    tone: "comment",
    title: "Comment",
    body: "They highlight a sentence and say what is wrong with it, or drop a sticky note anywhere on the page, including on a chart with no text to select.",
  },
  {
    tone: "edit",
    title: "Edit",
    body: "They fix the typo themselves. Only words change; structure, attributes, and scripts are left alone. Every change is listed, and any of them can go back.",
  },
];

export function Permissions() {
  return (
    <section className="band band--wash">
      <div className="shell">
        <div className="band-head">
          <p className="eyebrow">one link, one permission</p>
          <h2>You choose what the other person can do</h2>
          <p>
            Set it when you make the link, and hand out a different one later. A
            read link cannot be used to comment, and a comment link cannot be
            used to edit.
          </p>
        </div>

        <div className="perms">
          {LEVELS.map((level) => (
            <article
              className={`card perm perm--${level.tone}`}
              key={level.tone}
            >
              <h3>{level.title}</h3>
              <p>{level.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
