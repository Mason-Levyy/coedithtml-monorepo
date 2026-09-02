const COMMENT_BUBBLE =
  "M8,0L176,0A8,8 0 0 1 184,8L184,80A8,8 0 0 1 176,88L8,88A8,8 0 0 1 0,80" +
  "L0,67.55Q-20,61.69 -40,62Q-20,56.85 0,45.55L0,8A8,8 0 0 1 8,0Z";

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

        <div className="note-card">
          <svg
            className="note-card__shape"
            viewBox="-44 -3 232 94"
            aria-hidden="true"
          >
            <path d={COMMENT_BUBBLE} />
          </svg>
          <div className="note-card__content">
            <b>Priya</b>
            Can pricing wait a week? Legal has not signed the tiers off.
          </div>
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
