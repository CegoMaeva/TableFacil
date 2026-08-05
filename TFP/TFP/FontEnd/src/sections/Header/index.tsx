import { Navbar } from "../../sections/Header/components/Navbar";

export const Header = () => {
  return (
    <header className="sticky backdrop-blur bg-gray-900/95 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] z-50 border-b border-solid border-gray-700/50 top-0">
      <Navbar />
    </header>
  );
};
