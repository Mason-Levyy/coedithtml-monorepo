// The shape overlayToMarkdown() in protocol/src/export-markdown.ts actually
// produces, trimmed to fit the panel.
const PASTED_THREAD = `# Feedback on q3-launch-plan.html

2 threads, 1 still open. 1 text change
already made.

## On "Pricing lands the same week"

**Priya:** Can pricing wait a week? Legal
has not signed the tiers off.

## Sticky note

**Rowan:** Where is churn on this?

## Text already changed

### "four" → "six"

Changed by Rowan.`;

export function Promises() {
  return (
    <section className="band">
      <div className="shell promise">
        <div>
          <p className="eyebrow">byte for byte</p>
          <h3>Your file is not touched</h3>
          <p>
            Comments and edits are stored next to your file, never inside it.
            The bytes you upload are the bytes served back. Same markup, same
            scripts, same styling, down to the whitespace.
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
