import { FooterContent } from "../../sections/Footer/components/FooterContent";
import { FooterBottom } from "../../sections/Footer/components/FooterBottom";

export const Footer = () => {
  return (
    <footer className="text-[oklch(1_0_0)] bg-gray-950 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] py-16">
      <div className="box-border caret-transparent max-w-6xl outline-[oklab(0.708_0_0_/_0.5)] mx-auto px-4 md:px-8">
        <FooterContent />
        <div
          role="none"
          className="bg-[oklab(1_0_0_/_0.2)] box-border caret-transparent shrink-0 h-px outline-[oklab(0.708_0_0_/_0.5)] w-full my-8"
        ></div>
        <FooterBottom />
      </div>
    </footer>
  );
};
