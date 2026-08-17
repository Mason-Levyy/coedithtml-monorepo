const LEVELS = [
  {
    tone: "read",
    title: "View",
    body: "View-only access. Viewers interact with your live file normally (buttons click, charts filter, and animations run) without making edits.",
  },
  {
    tone: "comment",
    title: "Comment",
    body: "Leave feedback. Reviewers can highlight text to start comment threads or drop sticky notes anywhere on the page, including charts and images.",
  },
  {
    tone: "edit",
    title: "Edit",
    body: "Direct text editing. Collaborators can update copy in place. Your layout, styles, and scripts remain intact, and all changes can be reviewed or reverted.",
  },
];

export function Permissions() {
  return (
    <section className="band">
      <div className="shell">
        <div className="band-head">
          <h2>Control how people interact with your file</h2>
          <p>
            Create unique links for viewing, commenting, or editing. You can
            share different access levels with different collaborators at any
            time.
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
