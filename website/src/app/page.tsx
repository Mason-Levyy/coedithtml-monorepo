import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <h1>Send the file, not a screenshot.</h1>
      <p>
        You have an HTML file — a deck, a dashboard, a one-pager — and three
        people who need to react to it. Upload it here and you get a link. It
        opens in their browser and works the way you built it.
      </p>

      <a className="cta" href="https://app.coedithtml.com">
        Upload a file
      </a>
      <p className="note">No account. No install. One file, one link.</p>

      <h2>What the other person can do</h2>
      <p>
        You choose this when you make the link, and you can hand out a different
        one later.
      </p>
      <div className="panel">
        <p>
          <strong>Read.</strong> They open it and use it. Nothing else.
        </p>
        <p>
          <strong>Comment.</strong> They highlight a sentence and say what is
          wrong with it, or drop a sticky note anywhere on the page.
        </p>
        <p>
          <strong>Edit.</strong> They fix the typo themselves. You can see every
          change in a list, and put any of them back.
        </p>
      </div>

      <h2>Your file is not touched</h2>
      <p>
        Comments and edits are stored next to your file, never inside it. The
        bytes you upload are the bytes served back — the same markup, the same
        scripts, the same styling. Download it whenever you want, with or
        without the changes people made.
      </p>

      <h2>When the feedback is in</h2>
      <p>
        Copy the whole thread as text and paste it back into whatever wrote the
        file in the first place. Every quote, every comment, every change,
        already in order.
      </p>

      <p className="note">
        <Link href="/how-it-works/">See how it works</Link>
      </p>
    </>
  );
}
