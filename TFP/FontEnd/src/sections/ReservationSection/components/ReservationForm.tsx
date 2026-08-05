import { ContactForm } from "../../../sections/ReservationSection/components/ContactForm";

export const ReservationForm = () => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm shadow-2xl shadow-emerald-500/10 box-border caret-transparent gap-x-6 flex flex-col outline-[oklab(0.708_0_0_/_0.5)] gap-y-6 border rounded-2xl border-solid border-gray-700/50">
      <div className="items-start box-border caret-transparent gap-x-1.5 grid auto-rows-min grid-rows-[auto_auto] outline-[oklab(0.708_0_0_/_0.5)] gap-y-1.5 pt-6 px-6">
        <h4 className="items-center text-emerald-400 font-semibold box-border caret-transparent gap-x-2 flex leading-4 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2">
          <img
            src="https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-6.svg"
            alt="Icon"
            className="box-border caret-transparent h-5 outline-[oklab(0.708_0_0_/_0.5)] w-5"
          />
          Quick & Easy Booking
        </h4>
      </div>
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] pb-6 px-6">
        <ContactForm />
      </div>
    </div>
  );
};
