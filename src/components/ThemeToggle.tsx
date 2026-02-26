'use client';

import React, { useEffect, useState } from 'react';
import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const context = useContext(ThemeContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    if (context) {
      context.toggleTheme();
    } else if (typeof window !== 'undefined') {
      // Fallback: alternar tema diretamente via DOM e localStorage
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);
    }
  };

  // Determinar tema atual
  const currentTheme = context?.theme || 
    (typeof window !== 'undefined' 
      ? (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      : 'light');

  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg bg-surface hover:bg-border transition-colors duration-200 cursor-pointer"
        disabled
        aria-label="Alternar tema"
      >
        <SunIcon className="h-5 w-5 text-text-secondary" />
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg bg-surface hover:bg-border transition-colors duration-200 cursor-pointer"
      title={`Alternar para ${currentTheme === 'light' ? 'modo escuro' : 'modo claro'}`}
      aria-label={`Alternar para ${currentTheme === 'light' ? 'modo escuro' : 'modo claro'}`}
    >
      {currentTheme === 'light' ? (
        <MoonIcon className="h-5 w-5 text-text-secondary" />
      ) : (
        <SunIcon className="h-5 w-5 text-text-secondary" />
      )}
    </button>
  );
}
