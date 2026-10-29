'use client';

import React from 'react';
import Link from 'next/link';

interface CyberSafetyLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  href?: string;
}

export default function CyberSafetyLogo({
  size = 32,
  showSubtitle = true,
  className = '',
  href = '/',
}: CyberSafetyLogoProps) {
  const numericSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 24
      : size === 'md'
      ? 32
      : size === 'lg'
      ? 40
      : size === 'xl'
      ? 52
      : 32;

  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
    >
      {/* Precision Security Shield */}
      <div
        style={{
          width: numericSize,
          height: numericSize,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(59, 130, 246, 0.35)',
          flexShrink: 0,
        }}
      >
        <svg
          width={numericSize * 0.62}
          height={numericSize * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>

      {/* Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: numericSize * 0.52,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            CYBER
          </span>
          <span
            style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: numericSize * 0.52,
              letterSpacing: '-0.02em',
              color: '#3B82F6',
            }}
          >
            DOME
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
              marginTop: 1,
            }}
          >
            Your Network's Silent Guardian.
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'inline-flex' }}>
        {content}
      </Link>
    );
  }

  return content;
}
