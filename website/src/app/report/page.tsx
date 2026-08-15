import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Report a File",
  description:
    "How to report abuse, malicious files, or send a formal DMCA copyright takedown notice to the designated agent for coeditHTML.",
  path: "/report/",
});

export default function ReportPage() {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">safety & copyright enforcement</p>
        <h1>Report a File</h1>
        <p className="lede">
          Anyone can upload here without an account, so anyone can misuse it.
          Reports and copyright notices are handled directly by our designated
          agent.
        </p>
      </header>

      <article className="prose">
        <div className="panel">
          <h3>Quick Contact Channels</h3>
          <p>
            <strong>Copyright & DMCA Notices:</strong>{" "}
            <a href="mailto:dmca@coedithtml.com">dmca@coedithtml.com</a>
          </p>
          <p>
            <strong>Malware, Phishing & General Abuse:</strong>{" "}
            <a href="mailto:abuse@coedithtml.com">abuse@coedithtml.com</a>
          </p>
          <p>
            <strong>Privacy & Data Deletions:</strong>{" "}
            <a href="mailto:privacy@coedithtml.com">privacy@coedithtml.com</a>
          </p>
        </div>

        <hr />

        <h2>DMCA Copyright Infringement & Takedown Notices</h2>
        <p>
          coeditHTML respects the intellectual property rights of others and
          complies with the notice-and-takedown procedures of the Digital
          Millennium Copyright Act (DMCA), 17 U.S.C. § 512.
        </p>

        <h3>Registered DMCA Designated Agent</h3>
        <p>
          Our designated agent to receive notifications of claimed infringement
          is registered with the United States Copyright Office under
          registration number <strong>DMCA-1078334</strong>:
        </p>
        <address>
          Copyright Agent, coeditHTML{"\n"}
          Mason Levy{"\n"}
          1460 Little Raven Street{"\n"}
          Denver, CO 80202{"\n"}
          United States{"\n\n"}
          Email: dmca@coedithtml.com
        </address>

        <h3>Requirements for a Valid DMCA Notice</h3>
        <p>
          To file a valid copyright infringement notification under 17 U.S.C. §
          512(c)(3), your written notice must include:
        </p>
        <ol>
          <li>
            <strong>Physical or Electronic Signature:</strong> A physical or
            electronic signature of a person authorized to act on behalf of the
            owner of the exclusive right that is allegedly infringed.
          </li>
          <li>
            <strong>Identification of the Copyrighted Work:</strong>{" "}
            Identification of the copyrighted work claimed to have been
            infringed (or, if multiple works at a single online site are covered
            by a single notification, a representative list of such works).
          </li>
          <li>
            <strong>Identification of the Infringing Material:</strong>{" "}
            Identification of the material that is claimed to be infringing or
            to be the subject of infringing activity and that is to be removed
            or access to which is to be disabled, and information reasonably
            sufficient to permit us to locate the material.{" "}
            <strong>
              Because coeditHTML does not have user accounts, the exact full
              artifact URL / link is required to locate the file.
            </strong>
          </li>
          <li>
            <strong>Contact Information:</strong> Information reasonably
            sufficient to permit us to contact you, such as your full name,
            physical address, telephone number, and email address.
          </li>
          <li>
            <strong>Good Faith Statement:</strong> A statement that you have a
            good faith belief that use of the material in the manner complained
            of is not authorized by the copyright owner, its agent, or the law.
          </li>
          <li>
            <strong>Accuracy Statement under Penalty of Perjury:</strong> A
            statement that the information in the notification is accurate, and
            under penalty of perjury, that you are authorized to act on behalf
            of the owner of an exclusive right that is allegedly infringed.
          </li>
        </ol>

        <p>
          <strong>Notice of Liability under 17 U.S.C. § 512(f):</strong> Please
          be aware that under Section 512(f) of the DMCA, any person who
          knowingly materially misrepresents that material or activity is
          infringing may be subject to liability for damages, including costs
          and attorneys&rsquo; fees. If you are unsure whether content on
          coeditHTML infringes your copyright, consider seeking legal advice
          before filing a notice.
        </p>

        <hr />

        <h2>Counter-Notification Procedures</h2>
        <p>
          If you uploaded an artifact that was removed or disabled as a result
          of a DMCA takedown notice, and you believe the removal was the result
          of a mistake or misidentification, you may submit a written
          counter-notification to our DMCA Agent at{" "}
          <a href="mailto:dmca@coedithtml.com">dmca@coedithtml.com</a>{" "}
          containing:
        </p>
        <ol>
          <li>Your physical or electronic signature.</li>
          <li>
            Identification of the material that has been removed or to which
            access has been disabled and the location at which the material
            appeared before it was removed or access was disabled.
          </li>
          <li>
            A statement under penalty of perjury that you have a good faith
            belief that the material was removed or disabled as a result of
            mistake or misidentification of the material to be removed or
            disabled.
          </li>
          <li>
            Your name, address, and telephone number, and a statement that you
            consent to the jurisdiction of Federal District Court for the
            judicial district in which your address is located (or if you are
            located outside the United States, for any judicial district in
            which coeditHTML may be found), and that you will accept service of
            process from the person who provided the original takedown notice or
            an agent of such person.
          </li>
        </ol>
        <p>
          Upon receipt of a valid counter-notification, we will forward a copy
          to the original complaining party. If the copyright owner does not
          notify us within 10 business days that they have filed a court action
          seeking a restraining order, we may restore the removed material.
        </p>

        <hr />

        <h2>Repeat Infringer Policy</h2>
        <p>
          In accordance with the DMCA and other applicable laws, coeditHTML
          maintains a policy of terminating access and disabling uploads from
          repeat infringers in appropriate circumstances. Because the service
          operates without accounts, this includes blocking IP addresses,
          disabling link tokens, and refusing future uploads.
        </p>

        <hr />

        <h2>Reporting Other Abuse & Malicious Content</h2>
        <p>
          For issues not involving copyright infringement, email{" "}
          <a href="mailto:abuse@coedithtml.com">abuse@coedithtml.com</a> with
          the artifact link and a brief explanation. Examples of actionable
          abuse:
        </p>
        <ul>
          <li>
            <strong>Phishing & Credential Harvesting:</strong> Pages imitating
            login portals or attempting to capture credentials or sensitive
            data.
          </li>
          <li>
            <strong>Malicious Code:</strong> Files containing keyloggers,
            malware, cryptominers, or browser exploits.
          </li>
          <li>
            <strong>Impersonation & Fraud:</strong> Files impersonating
            individuals or organizations to deceive viewers.
          </li>
          <li>
            <strong>Unlawful Content:</strong> Content violating applicable
            state or federal laws.
          </li>
        </ul>
        <p>
          Confirmed abusive files are taken down immediately and all associated
          links stop functioning.
        </p>

        <hr />

        <h2>If the File is Yours</h2>
        <p>If you uploaded an artifact and wish to remove it:</p>
        <ul>
          <li>
            <strong>Self-Service:</strong> Revoking or deleting the link from
            the app takes it out of service immediately.
          </li>
          <li>
            <strong>Expedited Deletion:</strong> Email{" "}
            <a href="mailto:privacy@coedithtml.com">privacy@coedithtml.com</a>{" "}
            or <a href="mailto:abuse@coedithtml.com">abuse@coedithtml.com</a>{" "}
            with the artifact URL, and we will purge the artifact and its
            overlay comments from active storage.
          </li>
        </ul>
        <p>
          For more details on service terms and data practices, see our{" "}
          <Link href="/terms/">Terms of Service</Link> and{" "}
          <Link href="/privacy/">Privacy Notice</Link>.
        </p>
      </article>
    </>
  );
}
