import { Header } from "../../sections/Header";
import { HeroSection } from "../../sections/HeroSection";
import { MenuSection } from "../../sections/MenuSection";
import { FeaturesSection } from "../../sections/FeaturesSection";
import { StatsSection } from "../../sections/StatsSection";
import { CTASection } from "../../sections/CTASection";
import { ReservationSection } from "../../sections/ReservationSection";
import { Footer } from "../../sections/Footer";

export const MainContent = () => {
  return (
    <div className="fixed box-border caret-transparent h-[952px] outline-[oklab(0.708_0_0_/_0.5)] overflow-auto inset-0">
      <div className="relative box-border caret-transparent basis-0 grow shrink-0 h-[952px] min-h-px min-w-px outline-[oklab(0.708_0_0_/_0.5)] w-full">
        <div className="box-border caret-transparent min-h-[952px] outline-[oklab(0.708_0_0_/_0.5)]">
          <Header />
          <HeroSection />
          <MenuSection />
          <FeaturesSection />
          <StatsSection />
          <CTASection />
          <ReservationSection />
          <Footer />
        </div>
      </div>
    </div>
  );
};
