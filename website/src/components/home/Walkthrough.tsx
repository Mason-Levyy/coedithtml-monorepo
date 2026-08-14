import { MediaSlot } from "@/components/MediaSlot";

const STEPS = [
  {
    title: "Drop the file in",
    body: "One HTML file with its styling and scripts inside it — the kind an AI tool hands you, up to 5MB. Anything that needs a build step first is turned away, with a note saying so.",
    slot: "upload.gif",
    hint: "File dragged onto the upload panel, link appears.",
  },
  {
    title: "Decide what the link allows",
    body: "Read, comment, or edit. Add a password if the file should not be opened by whoever finds the link. Hand out a different link later and the first one still means what it meant.",
    slot: "share.gif",
    hint: "Permission picked in the share menu, link copied.",
  },
  {
    title: "Send it to whoever needs it",
    body: "They open your file running in their browser, with a thin bar along the top. They highlight a sentence and say what is wrong with it, drop a sticky note on a chart, or fix the typo themselves. No account, just a name.",
    slot: "markup.gif",
    hint: "Sentence highlighted, comment written, sticky note dropped.",
  },
  {
    title: "Take the feedback back",
    body: "Comments, sticky notes, and changes land in one panel in the order they were left. Copy the lot as text, or download the file with the changes already in it.",
    slot: "export.gif",
    hint: "Rail scrolled, thread copied, file downloaded.",
  },
];

export function Walkthrough() {
  return (
    <section className="band" id="walkthrough">
      <div className="shell">
        <div className="band-head">
          <p className="eyebrow">Start to finish</p>
          <h2>Four steps, and the file comes out unchanged</h2>
        </div>

        <div className="walk__rows">
          {STEPS.map((step, index) => (
            <div className="walk__row" key={step.slot}>
              <div>
                <span className="walk__step">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <div className="walk__media">
                <MediaSlot name={step.slot} hint={step.hint} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
