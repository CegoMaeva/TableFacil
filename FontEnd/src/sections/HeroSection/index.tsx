import { HeroContent } from "../../sections/HeroSection/components/HeroContent";

export const HeroSection = () => {
  return (
    <section className="relative items-center box-border caret-transparent flex h-[952px] justify-center outline-[oklab(0.708_0_0_/_0.5)] overflow-hidden">
      <div className="absolute box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] z-0 inset-0">
        <img
          src="https://wallpaperaccess.com/full/3692558.jpg"
          alt="Elegant restaurant interior"
          className="box-border caret-transparent h-full max-w-full object-cover outline-[oklab(0.708_0_0_/_0.5)] w-full"
        />
      </div>
      <HeroContent />
    </section>
  );
};
