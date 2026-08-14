import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The short version: upload what you have the right to upload, expect no guarantees, and anything can be removed.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms</h1>
      <p className="lede">
        coeditHTML is early and free. These terms are short because the service
        is.
      </p>

      <h2>What you may upload</h2>
      <p>
        Files you have the right to share. Not malware, not phishing pages, not
        anything that impersonates somebody else, and nothing illegal where you
        or the reader is.
      </p>
      <p>
        Files run their own scripts when opened. Uploading something built to
        harm whoever opens it is the one thing that will get an upload removed
        without warning.
      </p>

      <h2>What is yours</h2>
      <p>
        Your file stays yours. Hosting it grants no ownership and no licence
        beyond storing it and serving it to whoever holds your link.
      </p>

      <h2>What is not promised</h2>
      <p>
        No uptime guarantee, no promise the service continues, and no warranty
        of any kind. Keep your own copy of anything that matters — this is a way
        to pass a file around, not a place to store the only copy.
      </p>

      <h2>Removal</h2>
      <p>
        Any file can be removed, and any link revoked, if it breaks the rules
        above or is reported and found to. Where there is a way to give notice
        first, notice is given first.
      </p>

      <h2>Getting in touch</h2>
      <p className="contact">hello@coedithtml.com</p>
    </>
  );
}
