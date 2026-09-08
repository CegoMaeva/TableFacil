import { HeroContent } from "../../sections/HeroSection/components/HeroContent";

export const HeroSection = () => {
  return (
    <section className="relative items-center box-border caret-transparent flex h-[952px] justify-center outline-[oklab(0.708_0_0_/_0.5)] overflow-hidden">
      <div className="absolute box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] z-0 inset-0">
        <img
          src="https://c.animaapp.com/mfzpkcotK2EDpP/assets/1.jpg"
          alt="Elegant restaurant interior"
          className="box-border caret-transparent h-full max-w-full object-cover outline-[oklab(0.708_0_0_/_0.5)] w-full"
        />
        <div className="absolute bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/80 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] inset-0"></div>
        <div className="absolute bg-gradient-to-r from-emerald-500/20 via-transparent to-teal-500/20 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] inset-0"></div>
      </div>
      <HeroContent />
    </section>
  );
};
