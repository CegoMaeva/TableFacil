import { FooterColumn } from "@/sections/Footer/components/FooterColumn";

export const FooterContent = () => {
  return (
    <div className="box-border caret-transparent gap-x-8 grid grid-cols-[repeat(1,minmax(0px,1fr))] outline-[oklab(0.708_0_0_/_0.5)] gap-y-8 md:grid-cols-[repeat(4,minmax(0px,1fr))]">
      <FooterColumn
        type="brand"
        title="TableFacil"
        description="Making dining reservations simple and fun! Connect with amazing restaurants and create unforgettable memories with every meal."
        socialIcons={[
          {
            src: "https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-11.svg",
            alt: "Icon",
            className:
              "box-border caret-transparent h-5 outline-[oklab(0.708_0_0_/_0.5)] w-5 mr-4",
          },
          {
            src: "https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-12.svg",
            alt: "Icon",
            className:
              "box-border caret-transparent h-5 outline-[oklab(0.708_0_0_/_0.5)] w-5 mr-4",
          },
          {
            src: "https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-13.svg",
            alt: "Icon",
            className:
              "box-border caret-transparent h-5 outline-[oklab(0.708_0_0_/_0.5)] w-5",
          },
        ]}
      />
      <FooterColumn
        type="contact"
        title="Contact Information"
        contactItems={[
          {
            iconSrc: "https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-14.svg",
            iconAlt: "Icon",
            text: "(555) 123-4567",
            className: "mb-3",
          },
          {
            iconSrc: "https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-15.svg",
            iconAlt: "Icon",
            text: "hello@tablefacil.com",
            className: "mb-3",
          },
          {
            iconSrc: "https://c.animaapp.com/mfzpkcotK2EDpP/assets/icon-16.svg",
            iconAlt: "Icon",
            text: (
              <>
                456 Tech Avenue
                <br />
                Innovation District
                <br />
                San Francisco, CA 94105
              </>
            ),
            className: "items-start mt-0.5",
          },
        ]}
      />
      <FooterColumn
        type="hours"
        title="Opening Hours"
        scheduleItems={[
          {
            days: "Monday - Thursday",
            hours: "5:00 PM - 10:00 PM",
            className: "justify-between mb-2",
          },
          {
            days: "Friday - Saturday",
            hours: "5:00 PM - 11:00 PM",
            className: "justify-between mb-2",
          },
          { days: "Sunday", hours: "4:00 PM - 9:00 PM" },
        ]}
      />
      <FooterColumn
        type="links"
        title="Quick Links"
        links={[
          { href: "#restaurants", text: "Find Restaurants" },
          { href: "#reservations", text: "Make Reservation" },
          { href: "#", text: "For Restaurants" },
          { href: "#", text: "Gift Cards" },
          { href: "#", text: "About TableFacil" },
          { href: "#", text: "Join Our Team" },
        ]}
      />
    </div>
  );
};
