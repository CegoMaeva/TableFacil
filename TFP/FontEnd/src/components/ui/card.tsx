import React from 'react';

export const Card = ({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) => {
  return (
    <div className={`glass rounded-2xl overflow-hidden ${hover ? 'hover:shadow-2xl hover:border-neutral-700/70' : ''} transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`px-6 py-5 border-b border-neutral-800/50 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <h3 className={`text-xl font-display font-bold text-neutral-100 ${className}`}>
      {children}
    </h3>
  );
};

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};
