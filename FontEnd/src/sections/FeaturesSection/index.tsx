export const FeaturesSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 py-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-red-900/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-800/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Why Choose <span className="text-emerald-400">TableFacil</span>?
          </h2>
          <p className="text-gray-300 text-xl max-w-2xl mx-auto">
            We make dining out effortless and exciting with features designed for food lovers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-emerald-400 text-4xl mb-4 group-hover:scale-110 transition-transform">⚡</div>
            <h3 className="text-white text-xl font-bold mb-3">Instant Booking</h3>
            <p className="text-gray-300">Book your table in seconds with real-time availability and instant confirmation</p>
          </div>

          {/* Feature 2 */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-emerald-400 text-4xl mb-4 group-hover:scale-110 transition-transform">🎯</div>
            <h3 className="text-white text-xl font-bold mb-3">Smart Recommendations</h3>
            <p className="text-gray-300">Discover new favorites with AI-powered suggestions based on your taste preferences</p>
          </div>

          {/* Feature 3 */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-emerald-400 text-4xl mb-4 group-hover:scale-110 transition-transform">💎</div>
            <h3 className="text-white text-xl font-bold mb-3">Exclusive Perks</h3>
            <p className="text-gray-300">Enjoy special discounts, priority seating, and exclusive access to events</p>
          </div>

          {/* Feature 4 */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-emerald-400 text-4xl mb-4 group-hover:scale-110 transition-transform">📱</div>
              <h3 className="text-white text-xl font-bold mb-3">Order with one tap</h3>
              <p className="text-gray-300">Browse the menu, order and pay directly from your phone — fast preparation, secure payment and real-time tracking of your order.</p>
          </div>

          {/* Feature 5 */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-emerald-400 text-4xl mb-4 group-hover:scale-110 transition-transform">🌟</div>
            <h3 className="text-white text-xl font-bold mb-3">Verified Reviews</h3>
            <p className="text-gray-300">Read authentic reviews from real diners to make informed choices</p>
          </div>

          {/* Feature 6 */}
          <div className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="text-emerald-400 text-4xl mb-4 group-hover:scale-110 transition-transform">🎉</div>
            <h3 className="text-white text-xl font-bold mb-3">Event Planning</h3>
            <p className="text-gray-300">Perfect for celebrations, dates, and business meetings with special arrangements</p>
          </div>
        </div>
      </div>
    </section>
  );
};
