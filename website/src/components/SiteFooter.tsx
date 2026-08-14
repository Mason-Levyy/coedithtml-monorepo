import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__cols">
          <div>
            <Wordmark />
            <p className="site-footer__blurb">
              One HTML file in, one link out. The people you send it to need
              nothing but a browser.
            </p>
          </div>

          <div>
            <h2>Product</h2>
            <ul>
              <li>
                <a href="https://app.coedithtml.com">Open the app</a>
              </li>
              <li>
                <Link href="/how-it-works/">How it works</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Legal</h2>
            <ul>
              <li>
                <Link href="/privacy/">Privacy</Link>
              </li>
              <li>
                <Link href="/terms/">Terms</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Contact</h2>
            <ul>
              <li>
                <Link href="/report/">Report a file</Link>
              </li>
              <li>
                <a href="mailto:hello@coedithtml.com">hello@coedithtml.com</a>
              </li>
            </ul>
          </div>
        </div>

        <p className="site-footer__base">
          coeditHTML hosts files other tools made. It does not make them.
        </p>
      </div>
    </footer>
  );
}
