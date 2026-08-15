import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";

const QUESTIONS = [
  {
    question: "What is coeditHTML?",
    answer:
      "coeditHTML turns a single HTML file into a link. Whoever opens the link sees the file running exactly as its author built it, and can leave comments on it, drop sticky notes on it, or edit its text in the browser. There is no account, no install, and no build step.",
  },
  {
    question: "What kind of file can I upload?",
    answer:
      "One self-contained HTML file up to 5MB, with its styling and scripts inside it. That is the format most AI tools hand you when they generate a deck, a dashboard, a report, or a one-pager. Project folders, JSX, and anything needing a build step are turned away at the door.",
  },
  {
    question: "Do the people I send it to need an account?",
    answer:
      "No. They open the link in a browser and start reading. They are asked for a name only when they leave their first comment, and that name is not an account.",
  },
  {
    question: "Can I control whether someone comments or edits?",
    answer:
      "Yes. Every upload produces three separate links: one to read, one to comment, and one to edit the words. You hand out whichever one fits, and each can be revoked on its own without disturbing the other two.",
  },
  {
    question: "Does uploading change my file?",
    answer:
      "No. The file is stored byte for byte and the editor is added at the moment it is served, never written into your markup. Comments and edits are kept alongside the file rather than inside it, so removing them all leaves the file exactly as it was uploaded.",
  },
  {
    question: "How do I get the feedback back out?",
    answer:
      "Every comment, sticky note, and edit appears in one panel in the order it was left. You can copy the lot as plain markdown, or download a single HTML file with the edits already applied.",
  },
  {
    question: "Is it safe to open a file somebody sent me?",
    answer:
      "Uploaded files are served from a different domain than the site and the app, so a file's own scripts can never reach a page holding your session. Files can also be locked behind a password before the link is sent.",
  },
  {
    question: "What does it cost?",
    answer:
      "Nothing while it is early. There is no billing, and no card is asked for at any point.",
  },
];

export function Faq() {
  return (
    <section className="band band--wash" id="faq">
      <div className="shell">
        <div className="band-head">
          <p className="eyebrow">The short version</p>
          <h2>Questions people ask first</h2>
          <p>
            Or skip the reading:{" "}
            <Link href="/tutorial/">take the three minute tutorial</Link> and
            use the thing itself.
          </p>
        </div>

        <dl className="faq">
          {QUESTIONS.map(({ question, answer }) => (
            <div key={question}>
              <dt>{question}</dt>
              <dd>{answer}</dd>
            </div>
          ))}
        </dl>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: QUESTIONS.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        }}
      />
    </section>
  );
}
