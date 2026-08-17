import { APP_URL } from "@/lib/links";

export function ClosingCta() {
  return (
    <section className="closing">
      <div className="shell">
        <h2>Ready to collaborate on your HTML file?</h2>
        <p>
          Free to use with nothing to install or configure. Upload your file and
          start collaborating immediately.
        </p>
        <a className="btn" href={APP_URL}>
          Upload a file
        </a>
      </div>
    </section>
  );
}
