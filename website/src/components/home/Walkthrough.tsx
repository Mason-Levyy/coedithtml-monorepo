import { MediaSlot } from "@/components/MediaSlot";

const STEPS = [
  {
    title: "Upload your file",
    body: "Drop in any self-contained HTML file up to 5MB, including embedded styles and scripts. No build steps or configuration required.",
    slot: "upload.gif",
    hint: "File dragged onto the upload panel, link appears.",
  },
  {
    title: "Choose permissions",
    body: "Set access to view, comment, or edit. You can also add an optional password to protect sensitive files.",
    slot: "share.gif",
    hint: "Permission picked in the share menu, link copied.",
  },
  {
    title: "Share the link",
    body: "Collaborators open the live file directly in their browser. They can highlight text to comment, drop sticky notes anywhere, or edit copy in place.",
    slot: "markup.gif",
    hint: "Sentence highlighted, comment written, sticky note dropped.",
  },
  {
    title: "Collect feedback and edits",
    body: "Review all comments and edits in an organized sidebar. Copy everything as clean markdown or download the updated HTML file with changes applied.",
    slot: "export.gif",
    hint: "Rail scrolled, thread copied, file downloaded.",
  },
];

export function Walkthrough() {
  return (
    <section className="band band--wash" id="walkthrough">
      <div className="shell">
        <div className="band-head">
          <h2>Simple collaboration in four easy steps</h2>
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
