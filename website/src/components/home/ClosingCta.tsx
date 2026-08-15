import { APP_URL } from "@/lib/links";

export function ClosingCta() {
  return (
    <section className="closing">
      <div className="shell">
        <p className="eyebrow">Takes about a minute</p>
        <h2>Put your file somewhere people can answer it</h2>
        <p>
          Free while it is early. Nothing to install, nothing to sign up for,
          and nothing to explain to the people you send it to.
        </p>
        <a className="btn" href={APP_URL}>
          Upload a file
        </a>
      </div>
    </section>
  );
}
