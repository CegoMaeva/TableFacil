export const FooterBottom = () => {
  return (
    <div className="text-[oklab(1_0_0_/_0.6)] items-center box-border caret-transparent flex flex-col justify-between outline-[oklab(0.708_0_0_/_0.5)] md:flex-row">
      <p className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)]">
        © 2025 TableFacil. All rights reserved.
      </p>
      <div className="box-border caret-transparent flex outline-[oklab(0.708_0_0_/_0.5)] mt-4 md:mt-0">
        <a
          href="#"
          className="box-border caret-transparent block outline-[oklab(0.708_0_0_/_0.5)] mr-6"
        >
          Privacy Policy
        </a>
        <a
          href="#"
          className="box-border caret-transparent block outline-[oklab(0.708_0_0_/_0.5)]"
        >
          Terms of Service
        </a>
      </div>
    </div>
  );
};
