import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "What happens when you upload an HTML file, what the people you send it to can do, and what happens to the file itself.",
};

export default function HowItWorksPage() {
  return (
    <>
      <header className="page-head">
        <h1>How it works</h1>
      </header>

      <article className="prose">
        <h2>Commenting</h2>
        <p>
          Select a sentence and leave a note against it. The highlight is drawn
          over the page rather than written into it, so it cannot disturb the
          layout. Sticky notes work anywhere, including on a chart with no text
          to select.
        </p>
        <p>
          Comments follow the words they were left on. Replace the file with a
          new version and the notes find their sentences again. You get a plain
          count of how many carried over and how many need another look.
        </p>

        <h2>Editing</h2>
        <p>
          Double-click any text to change it, or press the pen in the bar and
          click once. Only words change: structure, attributes, and scripts are
          left alone, and pasted formatting is stripped to plain text.
        </p>
        <p>
          Every change is listed in the panel with the name of whoever made it.
          Remove one and the original wording comes back. Remove them all and
          the file reads as it did when you uploaded it.
        </p>

        <h2>Where the file lives</h2>
        <p>
          Files are served from a different domain than the site you are reading
          now. That separation is deliberate: an uploaded file runs its own
          scripts, and it must never share an origin with a page holding your
          session.
        </p>

        <h2>What it will not do</h2>
        <p>
          It does not take multiple files, project folders, or anything needing
          a build step. It does not rewrite your markup to make a feature work.
          If something would need us to understand how your file is put
          together, it is not built.
        </p>
      </article>
    </>
  );
}
