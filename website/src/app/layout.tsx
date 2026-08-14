import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://coedithtml.com"),
  title: {
    default: "coeditHTML — share an HTML file people can comment on",
    template: "%s — coeditHTML",
  },
  description:
    "Upload a single HTML file and get a link. The people you send it to can read it, comment on it, or edit the text, without installing anything.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="shell">
          <div className="masthead">
            <Link href="/" className="wordmark">
              coedit<span>HTML</span>
            </Link>
            <nav>
              <Link href="/how-it-works/">How it works</Link>
              <Link href="/privacy/">Privacy</Link>
              <Link href="/report/">Report a file</Link>
              <a href="https://app.coedithtml.com">Open the app</a>
            </nav>
          </div>
        </header>

        <main className="shell">{children}</main>

        <footer className="shell">
          <nav>
            <Link href="/how-it-works/">How it works</Link>
            <Link href="/privacy/">Privacy</Link>
            <Link href="/terms/">Terms</Link>
            <Link href="/report/">Report a file</Link>
          </nav>
          <p>coeditHTML hosts files other tools made. It does not make them.</p>
        </footer>
      </body>
    </html>
  );
}
