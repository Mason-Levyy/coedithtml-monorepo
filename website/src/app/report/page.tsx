import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a file",
  description:
    "How to report a file hosted on coeditHTML, and what happens after you do.",
};

export default function ReportPage() {
  return (
    <>
      <h1>Report a file</h1>
      <p className="lede">
        Anyone can upload here without an account, so anyone can misuse it.
        Reports are read by a person.
      </p>

      <div className="panel">
        <p className="contact">abuse@coedithtml.com</p>
        <p className="note">
          Send the link, and a line about what is wrong with it. That is enough.
        </p>
      </div>

      <h2>What is worth reporting</h2>
      <p>
        A page pretending to be a login screen for something else. A file
        designed to attack whoever opens it. Impersonation of a real person or
        company. Anything illegal. Your own file, if it went out and should not
        have.
      </p>

      <h2>What happens next</h2>
      <p>
        Confirmed abuse is taken down and the links stop working for everyone
        holding them. Where a file is clearly built to harm the people opening
        it, it comes down first and the uploader is told afterwards.
      </p>

      <h2>If the file is yours</h2>
      <p>
        You do not need to wait for anyone. Revoking the link from the app takes
        it out of service immediately. Write to the same address if you want it
        deleted rather than unreachable.
      </p>
    </>
  );
}
