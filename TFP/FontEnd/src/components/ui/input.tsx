import React from 'react';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = '', type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={`input-modern ${className}`}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';
