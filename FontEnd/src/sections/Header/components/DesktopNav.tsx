export const DesktopNav = () => {
  return (
    <nav className="box-border caret-transparent hidden min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] md:flex md:min-h-[auto] md:min-w-[auto]">
      <a
        href="#restaurants"
        className="text-gray-300 hover:text-red-300 box-border caret-transparent inline min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] mr-6 md:block md:min-h-[auto] md:min-w-[auto] transition-colors font-medium"
      >
        Restaurants
      </a>
      <a
        href="#reservations"
        className="text-gray-300 hover:text-red-300 box-border caret-transparent inline min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] mr-6 md:block md:min-h-[auto] md:min-w-[auto] transition-colors font-medium"
      >
        Book Table
      </a>
      <a
        href="#contact"
        className="text-gray-300 hover:text-red-300 box-border caret-transparent inline min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] md:block md:min-h-[auto] md:min-w-[auto] transition-colors font-medium"
      >
        Support
      </a>
    </nav>
  );
};
