import { Logo } from "../../../sections/Header/components/Logo";
import { DesktopNav } from "../../../sections/Header/components/DesktopNav";
import { ContactInfo } from "../../../sections/Header/components/ContactInfo";

export const Navbar = () => {
  return (
    <div className="box-border caret-transparent max-w-6xl outline-[oklab(0.708_0_0_/_0.5)] mx-auto px-4 md:px-8">
      <div className="items-center box-border caret-transparent flex h-16 justify-between outline-[oklab(0.708_0_0_/_0.5)]">
        <div className="items-center box-border caret-transparent flex outline-[oklab(0.708_0_0_/_0.5)]">
          <Logo />
          <DesktopNav />
        </div>
        <ContactInfo />
      </div>
    </div>
  );
};
