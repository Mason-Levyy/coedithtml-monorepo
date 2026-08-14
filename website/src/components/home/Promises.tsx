const PASTED_THREAD = `## q3-launch-plan.html

> Pricing lands the same week
Priya — Can pricing wait a week? Legal has
not signed the tiers off.

Rowan — Where is churn on this? (sticky, on
the chart)

Changed by Rowan: "four" -> "six"`;

export function Promises() {
  return (
    <section className="band">
      <div className="shell promise">
        <div>
          <p className="eyebrow">byte for byte</p>
          <h3>Your file is not touched</h3>
          <p>
            Comments and edits are stored next to your file, never inside it.
            The bytes you upload are the bytes served back — the same markup,
            the same scripts, the same styling, down to the whitespace.
          </p>
          <p>
            Download it whenever you want, with or without the changes people
            made. Files are served from a different domain than this one, so a
            file running its own scripts never shares an origin with a page
            holding your session.
          </p>
        </div>

        <div>
          <p className="eyebrow">back where it came from</p>
          <h3>When the feedback is in</h3>
          <p>
            Copy the whole thread as text and paste it into whatever wrote the
            file in the first place. Every quote, every comment, every change,
            already in order.
          </p>
          <pre className="paste">{PASTED_THREAD}</pre>
        </div>
      </div>
    </section>
  );
}
