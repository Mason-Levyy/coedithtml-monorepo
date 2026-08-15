import { TourLauncher } from "@/components/TourLauncher";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Interactive Tutorial",
  description:
    "Explore an interactive demo of coeditHTML. Practice replying to comments, placing sticky notes, editing text, and downloading updated files.",
  path: "/tutorial/",
});

export default function TutorialPage() {
  return (
    <>
      <header className="page-head">
        <h1>Interactive Tutorial</h1>
        <p className="lede">
          Explore an interactive demo with sample comments, sticky notes, and
          editable text. See how easy it is to collaborate on live HTML files.
        </p>
        <TourLauncher />
      </header>
    </>
  );
}
