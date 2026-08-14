// A file somebody uploaded, with the markup this product leaves on top of it:
// a highlighted sentence answered by a comment, a word swapped in place, and a
// sticky note on the chart that has no text to select.
export function ArtifactMock() {
  return (
    <div className="mock">
      <div className="mock__chrome">
        <div className="mock__dots">
          <i />
          <i />
          <i />
        </div>
        <span className="mock__url">coedithtml.com/f/j8x2qv</span>
      </div>

      <div className="mock__bar">
        <span>q3-launch-plan.html</span>
        <span className="mock__tool mock__tool--on" aria-hidden="true">
          <PenIcon />
        </span>
        <span className="mock__tool" aria-hidden="true">
          <NoteIcon />
        </span>
        <span className="mock__who" aria-hidden="true">
          P
        </span>
        <span className="mock__who" aria-hidden="true">
          R
        </span>
      </div>

      <div className="mock__page">
        <p className="mock__kicker">Product · Q3</p>
        <h4>Q3 Launch Plan</h4>
        <p>
          We ship the editor to everyone in week six.{" "}
          <span className="mark">Pricing lands the same week</span>, once the
          billing work clears review.
        </p>
        <p>
          Support headcount goes from <span className="edit-out">four</span>{" "}
          <span className="edit-in">six</span> before launch week.
        </p>
        <div className="mock__bars" aria-hidden="true">
          <i style={{ height: "42%" }} />
          <i style={{ height: "68%" }} />
          <i style={{ height: "31%" }} />
          <i style={{ height: "88%" }} />
          <i style={{ height: "55%" }} />
        </div>

        <svg className="tether" viewBox="0 0 96 44" aria-hidden="true">
          <path d="M92 4C74 6 66 24 44 30 30 34 16 36 5 38" />
          <path d="M14 30 5 38.4 16 42" />
        </svg>

        <div className="note-card">
          <b>Priya</b>
          Can pricing wait a week? Legal has not signed the tiers off.
        </div>

        <div className="sticky">
          Where is churn on this?
          <small>Rowan</small>
        </div>
      </div>
    </div>
  );
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M11.4 1.9a1.6 1.6 0 0 1 2.3 2.3L5.4 12.5 2 13.5l1-3.4 8.4-8.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 2.5h11v7l-4 4h-7v-11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13.5 9.5h-4v4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
