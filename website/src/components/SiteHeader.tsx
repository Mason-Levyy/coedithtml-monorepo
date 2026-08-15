import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { APP_URL } from "@/lib/links";

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="masthead__inner shell">
        <Wordmark />
        <nav>
          <Link href="/tutorial/">Tutorial</Link>
          <Link href="/privacy/">Privacy</Link>
          <Link href="/report/">Report a File</Link>
          <a className="btn btn--small" href={APP_URL}>
            Open the app
          </a>
        </nav>
      </div>
    </header>
  );
}
