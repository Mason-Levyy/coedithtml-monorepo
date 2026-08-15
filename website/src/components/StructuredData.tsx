import { JsonLd } from "@/components/JsonLd";
import { APP_URL, SITE_URL } from "@/lib/links";

const PUBLISHER_ID = `${SITE_URL}/#publisher`;

export function StructuredData() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": PUBLISHER_ID,
            name: "coeditHTML",
            url: SITE_URL,
            logo: `${SITE_URL}/icon.svg`,
            founder: { "@type": "Person", name: "Mason Levy" },
            email: "support@coedithtml.com",
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: "coeditHTML",
            url: SITE_URL,
            publisher: { "@id": PUBLISHER_ID },
            inLanguage: "en-US",
          },
          {
            "@type": "SoftwareApplication",
            "@id": `${SITE_URL}/#app`,
            name: "coeditHTML",
            url: APP_URL,
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Document collaboration",
            operatingSystem: "Any web browser",
            browserRequirements: "Requires JavaScript",
            publisher: { "@id": PUBLISHER_ID },
            description:
              "coeditHTML turns a single HTML file into a shareable link that other people can read, comment on, and edit in their browser, without an account or an install.",
            featureList: [
              "Share a single HTML file as a link",
              "Comment on a selected sentence",
              "Drop sticky notes on charts and images",
              "Edit the text of the file in place",
              "Separate read, comment, and edit links",
              "Password protect a link",
              "Download the edited file as one HTML file",
            ],
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            },
          },
        ],
      }}
    />
  );
}
