import { InfoCard } from "../../../sections/ReservationSection/components/InfoCard";

export const InfoCards = () => {
  return (
    <div className="box-border caret-transparent gap-x-8 grid grid-cols-[repeat(1,minmax(0px,1fr))] outline-[oklab(0.708_0_0_/_0.5)] gap-y-8 text-center mt-16 md:grid-cols-[repeat(3,minmax(0px,1fr))]">
      <InfoCard
        iconSrc="https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-8.svg"
        title="Opening Hours"
        description={
          <>
            Monday - Thursday: 5:00 PM - 10:00 PM
            <br />
            Friday - Saturday: 5:00 PM - 11:00 PM
            <br />
            Sunday: 4:00 PM - 9:00 PM
          </>
        }
      />
      <InfoCard
        iconSrc="https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-9.svg"
        title="Private Events"
        description="Perfect for special occasions, corporate events, and celebrations. Contact us for custom arrangements."
      />
      <InfoCard
        iconSrc="https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-10.svg"
        title="Wine Pairing"
        description="Our sommelier will recommend the perfect wine to complement your dining experience."
      />
    </div>
  );
};
