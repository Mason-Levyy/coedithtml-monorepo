import { ClosingCta } from "@/components/home/ClosingCta";
import { Faq } from "@/components/home/Faq";
import { FileKinds } from "@/components/home/FileKinds";
import { Hero } from "@/components/home/Hero";
import { Permissions } from "@/components/home/Permissions";
import { Promises } from "@/components/home/Promises";
import { Walkthrough } from "@/components/home/Walkthrough";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FileKinds />
      <Walkthrough />
      <Permissions />
      <Promises />
      <Faq />
      <ClosingCta />
    </>
  );
}
