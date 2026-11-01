import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({
  size = 'md',
  text,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2 py-6">
      <div
        className={`${sizeClasses[size]} border-neutral-700 border-t-white rounded-full animate-spin`}
      />
      {text && <span className="text-xs text-neutral-400 font-mono tracking-wider">{text}</span>}
    </div>
  );
};
