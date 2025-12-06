import React from 'react';

export const Label = ({ 
  children, 
  htmlFor, 
  className = '' 
}: { 
  children: React.ReactNode; 
  htmlFor?: string; 
  className?: string 
}) => {
  return (
    <label 
      htmlFor={htmlFor} 
      className={`text-sm font-medium text-gray-200 ${className}`}
    >
      {children}
    </label>
  );
};
