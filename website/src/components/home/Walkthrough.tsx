import Image from "next/image";

const STEPS = [
  {
    title: "Upload your file",
    body: "Drop in any self-contained HTML file up to 5MB, including embedded styles and scripts. No build steps or configuration required.",
    src: "/gifs/first.gif",
    alt: "Drag and drop an HTML file onto the upload panel",
  },
  {
    title: "Choose permissions",
    body: "Set access to view, comment, or edit. You can also add an optional password to protect sensitive files.",
    src: "/gifs/second.gif",
    alt: "Configure file permissions and optional password protection",
  },
  {
    title: "Share the link",
    body: "Collaborators open the live file directly in their browser. They can highlight text to comment, drop sticky notes anywhere, or edit copy in place.",
    src: "/gifs/third.gif",
    alt: "Collaborate live in browser with highlights, comments, and sticky notes",
  },
  {
    title: "Collect feedback and edits",
    body: "Review all comments and edits in an organized sidebar. Copy everything as clean markdown or download the updated HTML file with changes applied.",
    src: "/gifs/forth.gif",
    alt: "Review feedback in sidebar and export markdown or updated HTML",
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
            <div className="walk__row" key={step.src}>
              <div>
                <span className="walk__step">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <div className="walk__media">
                <div className="walk__frame">
                  <Image
                    src={step.src}
                    alt={step.alt}
                    width={1920}
                    height={1080}
                    className="walk__image"
                    unoptimized
                    priority={index === 0}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
