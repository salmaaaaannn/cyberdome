'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ThemeToggle({ showLabel = false, className, style }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('cyberdome_theme');
    if (saved === 'dark') {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (saved === 'light') {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('cyberdome_theme', nextTheme);
  };

  if (!mounted) {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          ...style,
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: showLabel ? '7px 12px' : '8px',
        borderRadius: 8,
        border: '1px solid var(--border-primary)',
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {theme === 'dark' ? (
        <Sun size={17} style={{ color: '#FFB020' }} />
      ) : (
        <Moon size={17} style={{ color: '#6366F1' }} />
      )}
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
