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
          <p className="eyebrow">File integrity</p>
          <h3>Your original file stays untouched</h3>
          <p>
            Comments and edits are stored separately from your original file. We
            serve your HTML file exactly as written, preserving every tag,
            script, and style.
          </p>
          <p>
            Download your file anytime with or without suggested edits. Uploaded
            files run on an isolated domain for complete security and privacy.
          </p>
        </div>

        <div>
          <p className="eyebrow">Seamless workflow</p>
          <h3>Export feedback directly to your tools</h3>
          <p>
            Copy the entire comment thread and edit history as formatted
            markdown. Paste it directly into your AI coding assistant, issue
            tracker, or team notes.
          </p>
          <pre className="paste">{PASTED_THREAD}</pre>
        </div>
      </div>
    </section>
  );
}
