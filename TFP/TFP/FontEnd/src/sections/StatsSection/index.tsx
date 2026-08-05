import React, { useEffect, useState } from 'react';
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
            Trusted by <span className="text-emerald-400">Food Lovers</span>
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
                <div className="flex gap-6 items-start px-4 md:px-8 snap-x snap-mandatory">
                  {reviews.slice(0, 10).map((r) => (
                    <div key={r.id} className="snap-center flex-shrink-0 bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-3xl p-8 w-80 md:w-96 shadow-2xl">
                      <div className="text-emerald-400 text-6xl mb-3 text-center">“</div>
                      <p className="text-gray-200 italic mb-6 text-lg leading-relaxed text-center">{r.comment}</p>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {r.clientName ? r.clientName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="text-white font-semibold text-lg">{r.clientName || 'Anonymous'}</div>
                            <div className="text-gray-400 text-sm">{new Date(r.createdAt || '').toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="text-yellow-400 font-bold text-lg">{r.rating}★</div>
                      </div>
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
