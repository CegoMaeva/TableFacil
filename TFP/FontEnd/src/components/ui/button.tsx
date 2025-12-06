import React from 'react';

export const Button = ({ 
  children, 
  onClick, 
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...props
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none rounded-xl';
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30',
    secondary: 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 hover:border-neutral-600 shadow-md',
    danger: 'bg-gradient-to-r from-danger-DEFAULT to-danger-dark hover:from-danger-dark hover:to-danger-dark text-white shadow-lg shadow-danger-DEFAULT/20 hover:shadow-xl hover:shadow-danger-DEFAULT/30',
    accent: 'bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30',
    ghost: 'bg-transparent hover:bg-neutral-800/50 text-neutral-300 hover:text-neutral-100'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
