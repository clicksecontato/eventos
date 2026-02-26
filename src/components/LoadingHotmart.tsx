'use client';

import Image from 'next/image';

interface LoadingHotmartProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingHotmart({ size = 'md', className = '' }: LoadingHotmartProps) {
  const sizeClasses = {
    sm: {
      container: 'w-24 h-24',
      logo: 32,
      spinner: 'w-24 h-24',
      border: 'border-2'
    },
    md: {
      container: 'w-32 h-32',
      logo: 48,
      spinner: 'w-32 h-32',
      border: 'border-2'
    },
    lg: {
      container: 'w-48 h-48',
      logo: 72,
      spinner: 'w-48 h-48',
      border: 'border-4'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`relative flex items-center justify-center ${currentSize.container} ${className}`}>
      {/* Spinner circular ao redor da logo - efeito cometa girando com cor suave */}
      <div 
        className={`absolute inset-0 ${currentSize.border} border-text-muted/40 border-t-transparent border-r-transparent rounded-full animate-spin`}
      />
      
      {/* Logo fixa no centro */}
      <div className="relative z-10 flex items-center justify-center">
        <Image 
          src="/logo.png" 
          alt="Clicksehub Logo" 
          width={currentSize.logo} 
          height={currentSize.logo}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}

