export type FooterColumnProps = {
  type: string;
  title?: string;
  description?: string;
  socialIcons?: Array<{
    src: string;
    alt: string;
    className: string;
  }>;
  contactItems?: Array<{
    iconSrc: string;
    iconAlt: string;
    text: React.ReactNode;
    className?: string;
  }>;
  scheduleItems?: Array<{
    days: string;
    hours: string;
    className?: string;
  }>;
  links?: Array<{
    href: string;
    text: string;
  }>;
};

export const FooterColumn = (props: FooterColumnProps) => {
  if (props.type === "brand") {
    return (
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
        <h3 className="text-xl font-bold text-emerald-400 box-border caret-transparent leading-7 outline-[oklab(0.708_0_0_/_0.5)] mb-4">
          {props.title}
        </h3>
        <p className="text-[oklab(1_0_0_/_0.8)] box-border caret-transparent leading-[26px] outline-[oklab(0.708_0_0_/_0.5)] mb-4">
          {props.description}
        </p>
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] flex">
          {props.socialIcons?.map((icon, index) => (
            <img
              key={index}
              src={icon.src}
              alt={icon.alt}
              className={icon.className}
            />
          ))}
        </div>
      </div>
    );
  }

  if (props.type === "contact") {
    return (
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
        <h4 className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] mb-4">
          {props.title}
        </h4>
        <div className="text-[oklab(1_0_0_/_0.8)] box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          {props.contactItems?.map((item, index) => (
            <div
              key={index}
              className={`items-center box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] flex mb-3 ${item.className || ""}`}
            >
              <img
                src={item.iconSrc}
                alt={item.iconAlt}
                className="box-border caret-transparent h-4 outline-[oklab(0.708_0_0_/_0.5)] w-4 mr-3"
              />
              <span className="box-border caret-transparent block outline-[oklab(0.708_0_0_/_0.5)]">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (props.type === "hours") {
    return (
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
        <h4 className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] mb-4">
          {props.title}
        </h4>
        <div className="text-[oklab(1_0_0_/_0.8)] box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          {props.scheduleItems?.map((item, index) => (
            <div
              key={index}
              className={`box-border caret-transparent flex outline-[oklab(0.708_0_0_/_0.5)] ${item.className || "justify-between mb-2"}`}
            >
              <span className="box-border caret-transparent block outline-[oklab(0.708_0_0_/_0.5)]">
                {item.days}
              </span>
              <span className="box-border caret-transparent block outline-[oklab(0.708_0_0_/_0.5)]">
                {item.hours}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (props.type === "links") {
    return (
      <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
        <h4 className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] mb-4">
          {props.title}
        </h4>
        <div className="text-[oklab(1_0_0_/_0.8)] box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
          {props.links?.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="box-border caret-transparent block outline-[oklab(0.708_0_0_/_0.5)] mb-2"
            >
              {link.text}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
