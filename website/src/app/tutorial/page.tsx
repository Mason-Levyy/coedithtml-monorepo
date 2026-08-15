import { TourLauncher } from "@/components/TourLauncher";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Take the tutorial",
  description:
    "See how coeditHTML works by using it. Open a private copy of the app and try comments, sticky notes, editing the text, share links, and downloading the file.",
  path: "/tutorial/",
});

export default function TutorialPage() {
  return (
    <>
      <header className="page-head">
        <h1>Take the tutorial</h1>
        <p className="lede">
          A file is already open, with notes on it asking you to reply to them,
          drag them, and change the words underneath.
        </p>
        <TourLauncher />
      </header>
    </>
  );
}
