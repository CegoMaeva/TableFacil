export const HeroContent = () => {
  return (
    <div className="relative text-white box-border caret-transparent max-w-4xl outline-[oklab(0.708_0_0_/_0.5)] text-center z-10 mx-auto px-4">
      <h2 className="text-5xl box-border caret-transparent tracking-[-1.2px] leading-[48px] outline-[oklab(0.708_0_0_/_0.5)] mb-6 md:text-7xl md:tracking-[-1.8px] md:leading-[72px]">
        <span className="text-white">Make Dining </span>
        <span className="text-emerald-300 font-bold">Easy & Fun</span>
      </h2>
      <p className="text-emerald-50 text-xl box-border caret-transparent leading-[32.5px] max-w-2xl outline-[oklab(0.708_0_0_/_0.5)] mb-8 mx-auto md:text-2xl md:leading-[39px]">
        Discover amazing restaurants, book instantly, and enjoy memorable dining experiences with friends and family. TableFacil makes it simple!
      </p>
      <div className="box-border caret-transparent gap-x-4 flex flex-col justify-center outline-[oklab(0.708_0_0_/_0.5)] gap-y-4 md:flex-row">
        <button className="text-white text-lg font-medium items-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 caret-transparent gap-x-2 flex shrink-0 h-10 justify-center leading-7 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 text-left text-nowrap px-8 py-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
          Explore Restaurants
        </button>
        <button className="text-emerald-600 text-lg font-medium items-center bg-white hover:bg-emerald-50 caret-transparent gap-x-2 flex shrink-0 h-10 justify-center leading-7 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 text-left text-nowrap border-2 border-emerald-400 hover:border-emerald-500 px-8 py-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl">
          Book Now
        </button>
      </div>
    </div>
  );
};
