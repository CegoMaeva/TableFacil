export type MenuCardProps = {
  imageUrl: string;
  title: string;
  category: string;
  price: string;
  description: string;
  hasChefSpecial?: boolean;
  isLarge?: boolean;
  isCompact?: boolean;
};

import { useNavigate } from 'react-router-dom';

export const MenuCard = (props: MenuCardProps) => {
  const cardHeight = props.isLarge ? "h-full min-h-[600px]" : props.isCompact ? "h-[320px]" : "h-[450px]";
  const imageHeight = props.isLarge ? "h-[350px]" : props.isCompact ? "h-[180px]" : "h-[250px]";
  const navigate = useNavigate();
  
  return (
    <div className={`group bg-gray-800/90 backdrop-blur-lg border border-gray-700/30 hover:border-emerald-400/60 box-border caret-transparent flex flex-col outline-[oklab(0.708_0_0_/_0.5)] overflow-hidden rounded-2xl transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/25 shadow-xl ${cardHeight}`}>
      
      {/* Image Section */}
      <div className={`relative ${imageHeight} box-border caret-transparent outline-[oklab(0.708_0_0_/_0.5)] overflow-hidden`}>
        <img
          src={props.imageUrl}
          alt={props.title}
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=No+Image'; }}
          className="box-border caret-transparent h-full max-w-full object-cover outline-[oklab(0.708_0_0_/_0.5)] w-full transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Elegant Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent"></div>
        
        {/* Popular Badge */}
        {props.hasChefSpecial && (
          <div className="absolute top-4 right-4">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1">
              <span>⭐</span>
              <span>POPULAR</span>
            </div>
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute top-4 left-4">
          <div className="bg-red-900/90 backdrop-blur-sm text-white font-bold px-3 py-1.5 rounded-full shadow-lg">
            {props.price}
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-xl font-bold leading-tight group-hover:text-red-300 transition-colors">
              {props.title}
            </h3>
          </div>
          
          {/* Category Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-300 border border-red-900/30">
              {props.category}
            </span>
          </div>
          
          {/* Description */}
          <p className="text-gray-300 text-sm leading-relaxed">
            {props.description}
          </p>
        </div>
        
        {/* Action Section */}
        <div className="pt-4 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <span>📍</span>
              <span>Available Now</span>
            </div>
            
            <button
              onClick={() => navigate('/client/reservations')}
              className="bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-900/30 flex items-center space-x-2"
            >
              <span>Book Table</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
