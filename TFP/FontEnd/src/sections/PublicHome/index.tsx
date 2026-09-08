import { useNavigate } from 'react-router-dom';
import { Header } from "../Header";
import { MenuSection } from "../MenuSection";
import { FeaturesSection } from "../FeaturesSection";
import { StatsSection } from "../StatsSection";
import { Footer } from "../Footer";
import { useAuth } from '../../contexts/AuthContext';

export const PublicHome = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const handleAuthRequired = () => {
    navigate('/login');
  };

  return (
    <div className="fixed box-border caret-transparent h-screen outline-[oklab(0.708_0_0_/_0.5)] overflow-auto inset-0">
      {/* Auth Button - Fixed in top right corner */}
        <div className="fixed top-6 right-6 z-50">
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login / Sign Up
        </button>
      </div>

      <div className="relative box-border caret-transparent basis-0 grow shrink-0 min-h-screen min-w-px outline-[oklab(0.708_0_0_/_0.5)] w-full">
        <div className="box-border caret-transparent min-h-screen outline-[oklab(0.708_0_0_/_0.5)]">
          <Header />
          
          {/* Modified Hero Section with Auth CTA */}
          <section className="relative items-center box-border caret-transparent flex h-[952px] justify-center outline-[oklab(0.708_0_0_/_0.5)] overflow-hidden">
            <div className="absolute box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] z-0 inset-0">
              <img
                src="https://th.bing.com/th/id/OIP.7jA04oYBOWTgeJ0Gk65oSwHaEK?w=305&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3"
                alt="Elegant restaurant interior"
                className="box-border caret-transparent h-full max-w-full object-cover outline-[oklab(0.708_0_0_/_0.5)] w-full"
              />
              <div className="absolute bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/80 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] inset-0"></div>
              <div className="absolute bg-gradient-to-r from-emerald-500/20 via-transparent to-teal-500/20 box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] inset-0"></div>
            </div>
            <div className="relative text-white box-border caret-transparent max-w-4xl outline-[oklab(0.708_0_0_/_0.5)] text-center z-10 mx-auto px-4">
              <h2 className="text-5xl box-border caret-transparent tracking-[-1.2px] leading-[48px] outline-[oklab(0.708_0_0_/_0.5)] mb-6 md:text-7xl md:tracking-[-1.8px] md:leading-[72px]">
                <span className="text-white">Make Dining</span>
                <span className="text-emerald-300 font-bold">Easy & Fun</span>
              </h2>
              <p className="text-emerald-50 text-xl box-border caret-transparent leading-[32.5px] max-w-2xl outline-[oklab(0.708_0_0_/_0.5)] mb-8 mx-auto md:text-2xl md:leading-[39px]">
                Discover amazing restaurants, book instantly, and enjoy memorable dining experiences with friends and family. TableFacil makes dining simple!
              </p>
              <div className="box-border caret-transparent gap-x-4 flex flex-col justify-center outline-[oklab(0.708_0_0_/_0.5)] gap-y-4 md:flex-row">
                <button 
                  onClick={handleAuthRequired}
                  className="text-white text-lg font-medium items-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 caret-transparent gap-x-2 flex shrink-0 h-10 justify-center leading-7 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 text-left text-nowrap px-8 py-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Explore Restaurants
                </button>
                <button 
                  onClick={handleAuthRequired}
                  className="text-emerald-600 text-lg font-medium items-center bg-white hover:bg-emerald-50 caret-transparent gap-x-2 flex shrink-0 h-10 justify-center leading-7 outline-[oklab(0.708_0_0_/_0.5)] gap-y-2 text-left text-nowrap border-2 border-emerald-400 hover:border-emerald-500 px-8 py-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Book Now
                </button>
              </div>
            </div>
          </section>
          
          {/* Menu Section with Auth Required Overlay */}
          <div className="relative">
            <MenuSection />
            {/* Overlay that prompts for authentication on important actions */}
            <div 
              className="absolute inset-0 bg-gray-900/0 hover:bg-gray-900/5 transition-all cursor-pointer z-10 pointer-events-none"
              style={{ pointerEvents: 'none' }}
            />
          </div>
          
          <FeaturesSection />
          <StatsSection />
          
          {/* Modified CTA Section with Auth Navigation */}
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
                  Ready to discover your next
                  <br />
                  <span className="text-emerald-200">Favorite Restaurant?</span>
                </h2>
                <p className="text-emerald-100 text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
                  Join TableFacil today and unlock a world of culinary adventures. Your perfect dining experience is just a click away!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <button
                  onClick={handleAuthRequired}
                  className="bg-white text-emerald-600 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-white/25 min-w-[200px]"
                >
                  🍽️ Order Now
                </button>
                <button
                  onClick={handleAuthRequired}
                  className="bg-transparent border-2 border-white text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-white hover:text-emerald-600 transition-all duration-300 transform hover:scale-105 min-w-[200px]"
                >
                  📅 Book a Table
                </button>
              </div>

              {/* App store badges removed per request */}
            </div>
          </section>
          
          {/* Modified Reservation Section with Auth Prompt (hidden when user is authenticated) */}
          {!authUser && (
            <section className="relative py-20 bg-gray-900">
              <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                      Reserve Your Table
                    </span>
                  </h2>
                  <p className="text-gray-400 text-lg">
                    Secure your spot at our restaurant
                  </p>
                </div>

                <div className="max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8">
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Login Required
                    </h3>
                    <p className="text-gray-400 mb-6">
                      To reserve a table you must be logged in to your account.
                    </p>
                    <button
                      onClick={handleAuthRequired}
                      className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg"
                    >
                      Login / Sign Up
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          <Footer />
        </div>
      </div>
    </div>
  );
};
