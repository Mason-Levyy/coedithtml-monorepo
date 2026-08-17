import { ClosingCta } from "@/components/home/ClosingCta";
import { Faq } from "@/components/home/Faq";
import { Hero } from "@/components/home/Hero";
import { Permissions } from "@/components/home/Permissions";
import { Walkthrough } from "@/components/home/Walkthrough";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Walkthrough />
      <Permissions />
      <Faq />
      <ClosingCta />
    </>
  );
}
