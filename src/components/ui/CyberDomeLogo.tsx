'use client';

import React from 'react';
import Image from 'next/image';

export default function CyberDomeLogo({
  variant = 'full',
  size = 40,
  className = '',
}: {
  variant?: 'full' | 'compact' | 'sidebar' | 'loading' | 'monochrome' | 'favicon';
  size?: number;
  className?: string;
}) {
  const isCompact = variant === 'compact' || variant === 'sidebar' || variant === 'favicon' || variant === 'loading';

  if (isCompact) {
    return (
      <div
        className={`cyberdome-logo-compact inline-flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.2),
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.4) 0%, rgba(11, 17, 32, 0.95) 85%)',
          border: '1px solid rgba(59, 130, 246, 0.45)',
          boxShadow: '0 2px 12px rgba(59, 130, 246, 0.35)',
          position: 'relative',
        }}
      >
        <Image
          src="/cyberdome-emblem.png"
          alt="CyberDome Emblem"
          width={size * 1.4}
          height={size * 1.4}
          priority
          style={{ width: '110%', height: '110%', objectFit: 'cover', objectPosition: 'center 30%' }}
        />
      </div>
    );
  }

  // Full banner logo
  const bannerW = size * 3.4;
  return (
    <div
      className={`cyberdome-logo-full inline-flex items-center ${className}`}
      style={{ position: 'relative', height: size }}
    >
      <Image
        src="/cyberdome-logo.png"
        alt="CyberDome"
        width={bannerW}
        height={size}
        priority
        style={{
          height: size,
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 16px rgba(59, 130, 246, 0.35))',
        }}
      />
    </div>
  );
}
