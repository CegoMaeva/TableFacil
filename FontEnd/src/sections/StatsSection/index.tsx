import { useEffect, useState } from 'react';
import { getReviews, Review } from '../../services/api';

export const StatsSection = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getReviews();
        // Show only restaurant-level approved reviews (no recipeId)
        const restaurantReviews = (data || []).filter((r: Review) => !r.recipeId && (r.status === 'approved' || !r.status));
        setReviews(restaurantReviews);
      } catch (err) {
        console.error('Failed to load reviews for stats section:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Trusted by <span className="text-red-900">Food Lovers</span>
          </h2>
          <p className="text-gray-200 text-xl max-w-2xl mx-auto">
            Real feedback from diners who tried our service — latest verified reviews.
          </p>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="text-gray-300 text-center">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-gray-300 text-center">No reviews yet. Be the first to leave feedback!</div>
          ) : (
            <div className="relative">
              <div className="overflow-x-auto py-4">
                <div className="flex gap-8 justify-center items-start px-4 md:px-8 snap-x snap-mandatory">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="snap-center flex-shrink-0 bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-8 w-80 shadow-2xl hover:shadow-2xl transition-shadow duration-300 flex flex-col items-center text-center">
                      {/* Profile Image - Top */}
                      <div className="w-20 h-20 bg-gradient-to-r from-red-700 to-red-900 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-6 flex-shrink-0">
                        {r.clientName ? r.clientName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      
                      {/* Client Name */}
                      <div className="text-white font-bold text-lg mb-1">{r.clientName || 'Anonymous'}</div>
                      
                      {/* Stars Rating */}
                      <div className="text-yellow-400 text-base mb-4 flex justify-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>
                            {i < Math.round(r.rating) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      
                      {/* Comment Text */}
                      <p className="text-gray-200 text-sm leading-relaxed mb-6 min-h-[72px] flex items-center justify-center line-clamp-3">
                        "{r.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
