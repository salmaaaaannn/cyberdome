'use client';
import React from 'react';

interface CyberXLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export default function CyberXLogo({
  size = 32,
  showSubtitle = true,
  className = ''
}: CyberXLogoProps) {
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
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {/* Precision Shield Icon */}
      <div
        style={{
          width: numericSize,
          height: numericSize,
          borderRadius: 8,
          background: 'linear-gradient(135deg, var(--color-critical) 0%, var(--color-critical) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(217, 45, 32, 0.25)',
          flexShrink: 0
        }}>
        <svg
          width={numericSize * 0.62}
          height={numericSize * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>

      {/* Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span
            style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: numericSize * 0.58,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)'
            }}>
            CYBER
          </span>
          <span
            style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontWeight: 900,
              fontSize: numericSize * 0.62,
              letterSpacing: '-0.02em',
              color: 'var(--cyberx-red)'
            }}>
            X
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              marginTop: 2
            }}>
            Security Intelligence Platform
          </span>
        )}
      </div>
    </div>
  );
}
