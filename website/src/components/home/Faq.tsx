import { JsonLd } from "@/components/JsonLd";
import { TutorialLink } from "@/components/TutorialLink";

const QUESTIONS = [
  {
    question: "What is coeditHTML?",
    answer:
      "coeditHTML lets you share standalone HTML files using a single link. Anyone with the link can view the file running live, leave comments, drop sticky notes, or edit text directly in their browser with no accounts or installation required.",
  },
  {
    question: "What kind of file can I upload?",
    answer:
      "Any self-contained HTML file up to 5MB with embedded styles and scripts. This includes AI-generated prototypes, dashboards, presentations, and reports. Multi-file project folders or files requiring a build step are not currently supported.",
  },
  {
    question: "Do the people I send it to need an account?",
    answer:
      "No. Anyone with the link can view and interact with the file immediately. When leaving a comment, reviewers simply enter a display name so others know who wrote it.",
  },
  {
    question: "Can I control whether someone comments or edits?",
    answer:
      "Yes. You can generate separate links for viewing, commenting, or editing. You choose which link to share, and you can revoke individual links at any time.",
  },
  {
    question: "Does uploading change my file?",
    answer:
      "No. Your original file is stored untouched. Collaboration tools and overlays are applied dynamically in the browser, keeping your source code clean.",
  },
  {
    question: "How do I export the feedback?",
    answer:
      "All comments, sticky notes, and text edits are organized in a feedback panel. You can copy everything as clean markdown or download an updated HTML file with accepted changes applied.",
  },
  {
    question: "Is it safe to open a file somebody sent me?",
    answer:
      "Yes. Uploaded files are served from an isolated domain with sandboxing protections so scripts cannot access your session or sensitive data. Creators can also password-protect links for added security.",
  },
  {
    question: "What does it cost?",
    answer:
      "Free for individual use. No credit card or account is required. Rolling it out across a company or building it into a product needs an agreement first — get in touch.",
  },
];

export function Faq() {
  return (
    <section className="band band--wash" id="faq">
      <div className="shell">
        <div className="band-head">
          <h2>Frequently asked questions</h2>
          <p>
            Prefer a hands-on walkthrough?{" "}
            <TutorialLink>Try our interactive 3-minute tutorial</TutorialLink>.
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
