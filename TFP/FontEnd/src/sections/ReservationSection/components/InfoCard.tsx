export type InfoCardProps = {
  iconSrc: string;
  title: string;
  description: React.ReactNode;
};

export const InfoCard = (props: InfoCardProps) => {
  return (
    <div className="items-center box-border caret-transparent flex flex-col outline-[oklab(0.708_0_0_/_0.5)]">
      <img
        src={props.iconSrc}
        alt="Icon"
        className="text-gray-950 box-border caret-transparent h-8 outline-[oklab(0.708_0_0_/_0.5)] w-8 mb-3"
      />
      <h3 className="text-white box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] mb-3">
        {props.title}
      </h3>
      <p className="text-gray-300 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
        {props.description}
      </p>
    </div>
  );
};
