# coeditHTML

Share and collaborate on standalone HTML files in real time. Leave comments, drop sticky notes, and edit files directly in your browser.

## What is coeditHTML?

Coedit turns a single HTML file into a shareable link that other people can read, comment on, and edit in their browser, with no account and no build step required.

It is built for the self-contained HTML files AI tools produce: decks, dashboards, reports, and interactive one-pagers.

## How it works

1. **Upload HTML**: Drag and drop any self-contained HTML file (up to 5MB).
2. **Share links**: Get three separate links:
   - **View link**: For read-only sharing.
   - **Suggest link**: For stakeholders to leave comments and sticky notes.
   - **Edit link**: For editing copy and text directly in the browser.
3. **Export feedback**: Download the edited HTML file with feedback and revisions preserved.

## Security & Architecture

- We never parse or rewrite your artifact. We store the uploaded HTML byte-for-byte and inject a minimal editor runtime at serve time.
- Uploaded files are served from an isolated sandbox domain (`sandbox`), completely separated from the authenticated application origin.
- Each link can be password-protected and independently revoked at any time.

## Agent & Developer APIs

- API Catalog: `/.well-known/api-catalog`
- Agent-to-Agent Manifest: `/.well-known/agent-card.json`
- Agent Authentication & Guide: `/auth.md`
- OpenAPI Specification: `/openapi.json`
- LLM Context: `/llms.txt`
