import { MenuCard } from "./MenuCard";
import { useEffect, useState } from 'react';
import { getReviews } from '../../../services/api';

const API_BASE_URL = 'http://127.0.0.1:5000';

export const MenuGrid = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // Load public recipes
        const resp = await fetch(`${API_BASE_URL}/api/recipes?available=true`);
        if (!resp.ok) throw new Error('Erreur chargement recettes');
        const recipes = await resp.json();

        // Load reviews and compute per-recipe averages
        let reviews = [];
        try {
          reviews = await getReviews();
        } catch (e) {
          console.warn('Unable to load reviews', e);
        }

        const map: Record<string, { total: number; count: number }> = {};
        reviews.forEach((r: any) => {
          const rid = r.recipeId;
          if (!rid) return;
          if (!map[rid]) map[rid] = { total: 0, count: 0 };
          map[rid].total += Number(r.rating || 0);
          map[rid].count += 1;
        });

        // Attach avg to recipes
        const withStats = recipes.map((rec: any) => {
          const stats = map[rec.id];
          const avg = stats ? Math.round((stats.total / stats.count) * 10) / 10 : 0;
          return { ...rec, avg, reviewsCount: stats ? stats.count : 0 };
        });

        // Select top-rated recipes (top 3 for homepage)
        const rated = withStats.filter((r: any) => r.reviewsCount > 0).sort((a: any, b: any) => b.avg - a.avg);
        let selected = rated.slice(0, 3);

        // Fallback to specials if no rated items
        if (selected.length === 0) {
          const sresp = await fetch(`${API_BASE_URL}/api/recipes?section=specials&available=true`);
          if (sresp.ok) {
            const specials = await sresp.json();
            selected = specials.slice(0, 3).map((rec: any) => ({ ...rec, avg: 0, reviewsCount: 0 }));
          }
        }

        setItems(selected);
      } catch (err) {
        console.error('Error loading popular dishes:', err);
      }
    };

    load();
  }, []);

  return (
    <div className="relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {items.length > 0 ? (
          items.map((it, idx) => (
            <div key={it.id} className={idx === 0 ? 'lg:row-span-2' : ''}>
              <MenuCard
                imageUrl={it.image || 'https://via.placeholder.com/800x600?text=Dish'}
                title={it.name}
                category={it.category || 'Plat'}
                price={it.avg && it.avg > 0 ? `${it.avg}★` : (it.price || '')}
                description={it.description || ''}
                hasChefSpecial={it.section === 'specials' || it.avg >= 4.5}
                isLarge={idx === 0}
                isCompact={idx > 0}
              />
            </div>
          ))
        ) : (
          <div className="text-gray-300">Loading popular dishes...</div>
        )}
      </div>

      <div className="flex justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-gray-300 mb-6 text-lg">See our full menu or discover specials.</p>
          <a href="/client/menu" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-6 py-3 rounded-xl transition-all">View menu</a>
        </div>
      </div>

      <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl"></div>
    </div>
  );
};
