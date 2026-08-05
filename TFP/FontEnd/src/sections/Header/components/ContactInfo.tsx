export const ContactInfo = () => {
  return (
    <div className="items-center box-border caret-transparent flex outline-[oklab(0.708_0_0_/_0.5)]">
      <div className="text-gray-400 text-sm items-center box-border caret-transparent hidden leading-5 min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] mr-4 md:flex md:min-h-[auto] md:min-w-[auto]">
        <img
          src="https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-4.svg"
          alt="Icon"
          className="box-border caret-transparent h-4 outline-[oklab(0.708_0_0_/_0.5)] w-4 mr-2 filter brightness-0 invert opacity-70"
        />
        <span className="box-border caret-transparent inline min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] md:block md:min-h-[auto] md:min-w-[auto]">
          (555) 123-4567
        </span>
      </div>
      <div className="text-gray-400 text-sm items-center box-border caret-transparent hidden leading-5 min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] mr-4 md:flex md:min-h-[auto] md:min-w-[auto]">
        <img
          src="https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-5.svg"
          alt="Icon"
          className="box-border caret-transparent h-4 outline-[oklab(0.708_0_0_/_0.5)] w-4 mr-2 filter brightness-0 invert opacity-70"
        />
        <span className="box-border caret-transparent inline min-h-0 min-w-0 outline-[oklab(0.708_0_0_/_0.5)] md:block md:min-h-[auto] md:min-w-[auto]">
          456 Tech Avenue
        </span>
      </div>
      <button className="text-white text-sm font-medium items-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 caret-transparent gap-x-2 flex shrink-0 h-9 justify-center leading-5 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 text-nowrap px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
        Book Table
      </button>
    </div>
  );
};
