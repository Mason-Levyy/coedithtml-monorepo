import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What coeditHTML stores when you upload a file, who can reach it, and how to have it removed.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p className="lede">
        Written to be read. If something here is unclear, that is a fault worth
        reporting.
      </p>

      <h2>There are no accounts</h2>
      <p>
        You do not sign up and you do not give an email address. Whoever opens
        your link can type a name so their comments are attributable, and that
        name is stored with those comments and kept in their own browser. It is
        not verified and it is not an identity.
      </p>

      <h2>What is stored when you upload</h2>
      <p>
        The file itself, exactly as you sent it. Its name and size. The time it
        was uploaded. If you set a password, a scrambled form of it that cannot
        be turned back into the password.
      </p>
      <p>
        Alongside the file: the comments, sticky notes, and text changes people
        leave, each with the name its author gave.
      </p>

      <h2>Who can reach your file</h2>
      <p>
        Anyone holding the link, and nobody else. Links are long random strings
        that cannot be guessed or listed, and each one carries its own
        permission. A read link cannot be used to comment or edit.
      </p>
      <p>
        Treat a link like the file. Forwarded, it works for whoever received it.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Until it is removed. Revoking a link takes it out of service
        immediately, for everyone holding it. Nothing is deleted on a schedule
        today; automatic clean-up of files nobody has opened in a long time is
        planned, and this page will say so plainly before it starts.
      </p>
      <p>
        To have a file deleted outright, write to the address below with the
        link and it will be removed.
      </p>

      <h2>What is not collected</h2>
      <p>
        No analytics, no advertising, no third-party trackers, and no record of
        who read what. Uploaded files may load resources from elsewhere on the
        internet, because they are somebody else&rsquo;s file and they run as
        their author wrote them — those requests are between the reader&rsquo;s
        browser and whoever the file reaches out to.
      </p>

      <h2>Getting in touch</h2>
      <p className="contact">privacy@coedithtml.com</p>
    </>
  );
}
