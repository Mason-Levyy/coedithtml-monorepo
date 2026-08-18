import { CopyField } from "@/components/CopyField";
import { SetupCard } from "@/components/connect/SetupCard";
import {
  CHATGPT_URL,
  CLAUDE_CONNECTORS_URL,
  GEMINI_APPS_URL,
  MCP_URL,
} from "@/lib/links";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Connect your AI Chatbot",
  description:
    "Paste the URL to add the coeditHTML MCP connector to any chatbot. Your chat publishes an HTML file to a shareable link, reads the feedback, and publishes the revision.",
  path: "/connect/",
});

const CHECKED_ON = "17 August 2026";

const CLIENT_CONFIG = `{
  "mcpServers": {
    "coedit": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

const TOOLS = [
  {
    name: "coedit_share_artifact",
    what: "Puts the HTML file your chat just wrote on a link, set to view, comment, or edit, with an optional password.",
  },
  {
    name: "coedit_read_feedback",
    what: "Reads back every comment, sticky note, and text edit people left on that link.",
  },
  {
    name: "coedit_update_artifact",
    what: "Publishes the revision to the same link, so nobody has to be re-sent anything.",
  },
  {
    name: "coedit_get_upload_link",
    what: "Hands you a direct upload link when a file is too large to pass through the chat.",
  },
];

export default function ConnectPage() {
  return (
    <>
      <header className="page-head page-head--wide">
        <p className="eyebrow">mcp connector</p>
        <h1>Add Coedit to any chatbot</h1>
        <p className="lede">
          Your chatbot can publish your HTML file to a link and enable
          collaboration. Then it can read what people said, and publish the
          revision.
        </p>
      </header>

      <div className="prose connect">
        <CopyField label="MCP server URL" value={MCP_URL} />
        <p className="note connect__reassure">
          No API key. No OAuth. Nothing to install. Free.
        </p>

        <div className="setup-cards">
          <SetupCard
            client="Claude"
            where="claude.ai, Claude Desktop, and Cowork"
            action={{ href: CLAUDE_CONNECTORS_URL, label: "Open connectors" }}
            steps={[
              "In Claude, open Customize, then Connectors.",
              "Click the + button and choose Add custom connector.",
              "Paste the URL above, name it Coedit, and leave Advanced settings empty.",
              "Click Add. Four coedit_ tools appear in the connector.",
            ]}
            note={
              <>
                Custom connectors are available on free and paid plans. You can
                add Coedit in any Claude client using the{" "}
                <a
                  href="https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities"
                  target="_blank"
                  rel="noreferrer"
                >
                  official connector guide
                </a>
                .
              </>
            }
            updated={CHECKED_ON}
          />

          <SetupCard
            client="ChatGPT"
            where="chatgpt.com, developer mode"
            action={{ href: CHATGPT_URL, label: "Open ChatGPT" }}
            steps={[
              "Open Settings, then Apps, then Advanced settings, and turn Developer mode on.",
              "Back under Apps, click Create, and name it Coedit.",
              "Paste the URL above as the MCP server URL, leave authentication on none, and save.",
              "In the composer, open the developer mode tool and switch Coedit on for the chat.",
            ]}
            note={
              <>
                To use this on ChatGPT, you need a paid ChatGPT account, then
                enable developer mode in the{" "}
                <a
                  href="https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenAI documentation
                </a>
                .
              </>
            }
            updated={CHECKED_ON}
          />

          <SetupCard
            client="Gemini"
            where="gemini.google.com, custom apps for Spark"
            action={{ href: GEMINI_APPS_URL, label: "Open connected apps" }}
            steps={[
              "In Gemini, open Settings & help, then Connected Apps. If you do not see it, open Personal Intelligence first.",
              "Under Custom apps for Spark, click Add a custom app.",
              "Paste the URL above and click Next. Leave Advanced features alone.",
              "In a chat, type @ and pick Coedit so Gemini reaches for it.",
            ]}
            note={
              <>
                Google gates custom apps behind{" "}
                <a
                  href="https://support.google.com/gemini/table/17434654?hl=en-YE&ref_topic=15157994"
                  target="_blank"
                  rel="noreferrer"
                >
                  Spark eligibility
                </a>
                .
              </>
            }
            updated={CHECKED_ON}
          />
        </div>

        <h2>What it can do once connected</h2>
        <dl className="tool-list">
          {TOOLS.map(({ name, what }) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>

        <h2>Any other MCP client</h2>
        <p>
          The endpoint is streamable HTTP and takes no credentials, so most
          clients need only the URL. Claude Code adds it in one line:
        </p>
        <CopyField
          label="Command"
          value={`claude mcp add --transport http coedit ${MCP_URL}`}
          block
        />
        <p>
          You can also use this on Cursor, Windsurf, VS Code, your own agent
          using roughly this:
        </p>
        <CopyField label="Config" value={CLIENT_CONFIG} block />

        <h2>What we can see</h2>
        <p>
          Only the file your chat hands us and the feedback people leave on it.
          The connector reads nothing else in your conversation, and every link
          it mints can be revoked from the app. Files are served from a separate
          domain from the app, so a file&rsquo;s own scripts cannot reach a page
          holding somebody&rsquo;s session.
        </p>
      </div>
    </>
  );
}
