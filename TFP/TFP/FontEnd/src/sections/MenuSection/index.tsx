import { MenuGrid } from "../../sections/MenuSection/components/MenuGrid";

export const MenuSection = () => {
  return (
    <section className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.05)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.05)_0%,transparent_50%)]"></div>
      <div className="box-border caret-transparent max-w-6xl outline-[oklab(0.708_0_0_/_0.5)] mx-auto px-4 md:px-8">
        <div className="box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] text-center mb-16 relative z-10">
          <h2 className="text-4xl text-white box-border caret-transparent leading-10 outline-[oklab(0.708_0_0_/_0.5)] mb-4">
            <span className="text-emerald-400">Popular</span> Dishes
          </h2>
          <p className="text-gray-300 text-xl box-border caret-transparent leading-7 max-w-2xl outline-[oklab(0.708_0_0_/_0.5)] mx-auto">
            Discover our most-loved creations — house recipes, fresh ingredients and must-try flavors. Browse and order your favorites.
          </p>
        </div>
        <MenuGrid />
        {/* Removed the bottom promotional block per request */}
      </div>
    </section>
  );
};
