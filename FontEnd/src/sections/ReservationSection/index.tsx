import { ReservationForm } from "../../sections/ReservationSection/components/ReservationForm";
import { InfoCards } from "../../sections/ReservationSection/components/InfoCards";

export const ReservationSection = () => {
  return (
    <section className="bg-gray-900 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] py-20">
      <div className="box-border caret-transparent max-w-6xl outline-[oklab(0.708_0_0_/_0.5)] mx-auto px-4 md:px-8">
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] text-center mb-16">
          <h2 className="text-4xl text-white box-border caret-transparent leading-10 outline-[oklab(0.708_0_0_/_0.5)] mb-4">
            <span className="text-red-900">Easy</span> Reservations
          </h2>
          <p className="text-gray-300 text-xl box-border caret-transparent leading-7 max-w-2xl outline-[oklab(0.708_0_0_/_0.5)] mx-auto">
            Book your perfect dining experience in just a few clicks. Choose your restaurant, pick your time, and get ready for amazing food!
          </p>
        </div>
        <div className="items-center box-border caret-transparent gap-x-12 grid grid-cols-[repeat(1,minmax(0px,1fr))] outline-[oklab(0.708_0_0_/_0.5)] gap-y-12 md:grid-cols-[repeat(2,minmax(0px,1fr))]">
          <div className="relative box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
            <img
              src="https://c.animaapp.com/mfzpkcotK2EDpP/assets/6.jpg"
              alt="Wine glass at restaurant table"
              className="shadow-[rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0)_0px_0px_0px_0px,rgba(0,0,0,0.1)_0px_10px_15px_-3px,rgba(0,0,0,0.1)_0px_4px_6px_-4px] box-border caret-transparent h-96 max-w-full object-cover outline-[oklab(0.708_0_0_/_0.5)] w-full rounded-[10px]"
            />
            <div className="absolute bg-[linear-gradient(to_top,oklab(0_0_0_/_0.3)_0%,rgba(0,0,0,0)_100%)] box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] rounded-[10px] inset-0"></div>
          </div>
          <ReservationForm />
        </div>
        <InfoCards />
      </div>
    </section>
  );
};
