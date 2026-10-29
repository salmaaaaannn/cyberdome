'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface CyberSafetyLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  href?: string;
  variant?: 'hybrid' | 'banner';
}

export default function CyberSafetyLogo({
  size = 36,
  showSubtitle = true,
  className = '',
  href = '/',
  variant = 'hybrid',
}: CyberSafetyLogoProps) {
  const numericSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 26
      : size === 'md'
      ? 36
      : size === 'lg'
      ? 48
      : size === 'xl'
      ? 64
      : 36;

  // Banner variant renders the full glowing geodesic dome graphic
  if (variant === 'banner') {
    const bannerW = numericSize * 3.4;
    const bannerH = numericSize;
    const bannerContent = (
      <div
        className={`inline-flex items-center select-none ${className}`}
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      >
        <Image
          src="/cyberdome-logo.png"
          alt="CyberDome Logo"
          width={bannerW}
          height={bannerH}
          priority
          style={{
            height: numericSize,
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 16px rgba(59, 130, 246, 0.35))',
          }}
        />
      </div>
    );

    if (href) {
      return (
        <Link href={href} style={{ textDecoration: 'none', display: 'inline-flex' }}>
          {bannerContent}
        </Link>
      );
    }
    return bannerContent;
  }

  // Standard hybrid variant (Glowing Geodesic Emblem + CyberDome Typography)
  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}
    >
      {/* Geodesic Cyber Dome Glowing Shield Emblem */}
      <div
        style={{
          width: numericSize,
          height: numericSize,
          borderRadius: Math.max(7, Math.round(numericSize * 0.22)),
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.4) 0%, rgba(11, 17, 32, 0.95) 85%)',
          border: '1px solid rgba(59, 130, 246, 0.45)',
          boxShadow: '0 2px 14px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Image
          src="/cyberdome-emblem.png"
          alt="CyberDome Emblem"
          width={numericSize * 1.5}
          height={numericSize * 1.5}
          priority
          style={{
            width: '110%',
            height: '110%',
            objectFit: 'cover',
            objectPosition: 'center 30%',
          }}
        />
      </div>

      {/* Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3.5 }}>
          <span
            style={{
              fontFamily: "'Orbitron', 'Inter', -apple-system, sans-serif",
              fontWeight: 800,
              fontSize: numericSize * 0.52,
              letterSpacing: '-0.01em',
              color: '#F8FAFC',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
            }}
          >
            Cyber
          </span>
          <span
            style={{
              fontFamily: "'Orbitron', 'Inter', -apple-system, sans-serif",
              fontWeight: 800,
              fontSize: numericSize * 0.52,
              letterSpacing: '-0.01em',
              color: '#3B82F6',
              textShadow: '0 0 14px rgba(59, 130, 246, 0.65)',
            }}
          >
            Dome
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 500,
              color: '#94A3B8',
              letterSpacing: '0.04em',
              marginTop: 1.5,
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Silent Network Guardian
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
