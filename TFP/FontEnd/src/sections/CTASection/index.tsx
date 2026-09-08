export const CTASection = () => {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 text-center">
        <div className="mb-8">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ready to Discover Your Next
            <br />
            <span className="text-emerald-200">Favorite Restaurant?</span>
          </h2>
          <p className="text-emerald-100 text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            Join TableFacil today and unlock a world of culinary adventures. Your perfect dining experience is just one click away!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button className="bg-white text-emerald-600 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-white/25 min-w-[200px]">
            🍽️ Start Exploring
          </button>
          <button className="bg-transparent border-2 border-white text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-white hover:text-emerald-600 transition-all duration-300 transform hover:scale-105 min-w-[200px]">
            📱 Download App
          </button>
        </div>

        {/* App store badges removed per request */}
      </div>
    </section>
  );
};
