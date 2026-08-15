import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { APP_URL } from "@/lib/links";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__cols">
          <div>
            <Wordmark />
            <p className="site-footer__blurb">
              Fast, simple collaboration on standalone HTML files. No accounts
              or installation needed.
            </p>
          </div>

          <div>
            <h2>Product</h2>
            <ul>
              <li>
                <a href={APP_URL}>Open the app</a>
              </li>
              <li>
                <Link href="/tutorial/">Take the tutorial</Link>
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
                <a href="mailto:team@coedithtml.com">team@coedithtml.com</a>
              </li>
            </ul>
          </div>
        </div>

        <p className="site-footer__base">
          coeditHTML is a lightweight collaboration tool for standalone HTML
          files.
        </p>
      </div>
    </footer>
  );
}
