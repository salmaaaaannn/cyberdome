import React from 'react';
import { motion } from 'framer-motion';

export default function CyberDomeLogo({
  variant = 'full',
  size = 40,
  className = '',
}: {
  variant?: 'full' | 'compact' | 'sidebar' | 'loading' | 'monochrome' | 'favicon';
  size?: number;
  className?: string;
}) {
  const isMonochrome = variant === 'monochrome';
  const isCompact = variant === 'compact' || variant === 'sidebar' || variant === 'favicon' || variant === 'loading';
  const showText = variant === 'full' || variant === 'monochrome';
  
  const w = showText ? size * 4 : size;
  const h = size;

  // The CYBERDOME Logo SVG structure based on the reference
  return (
    <div className={`cyberdome-logo flex-center ${className}`} style={{ width: w, height: h, position: 'relative' }}>
      <svg viewBox={showText ? '0 0 400 120' : '0 0 120 120'} width="100%" height="100%">
        <defs>
          <linearGradient id="metallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isMonochrome ? 'currentColor' : '#FFFFFF'} />
            <stop offset="50%" stopColor={isMonochrome ? 'currentColor' : '#C0C6D0'} />
            <stop offset="100%" stopColor={isMonochrome ? 'currentColor' : '#8A95A5'} />
          </linearGradient>
          
          <linearGradient id="cyberRed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isMonochrome ? 'currentColor' : '#FF003C'} />
            <stop offset="100%" stopColor={isMonochrome ? 'currentColor' : '#8B001F'} />
          </linearGradient>

          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Logo Mark */}
        <g transform={showText ? `translate(140, 5) scale(1)` : `translate(10, 10) scale(1)`}>
          {/* Background subtle red glow/grid */}
          {!isMonochrome && (
            <motion.path 
              d="M 50 80 Q 50 30 100 20 Q 150 30 150 80" 
              fill="none" 
              stroke="#FF003C" 
              strokeWidth="1" 
              opacity="0.2"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          )}

          {/* Central Spire */}
          <path d="M 45 75 L 45 45 L 50 30 L 55 45 L 55 75 Z" fill="url(#metallic)" />
          
          {/* Inner arcs */}
          <path d="M 38 75 L 38 50 Q 25 60 20 75 Z" fill="url(#metallic)" />
          <path d="M 62 75 L 62 50 Q 75 60 80 75 Z" fill="url(#metallic)" />

          {/* Outer Dome Shields */}
          <path d="M 10 80 C 15 50 35 35 48 35 L 40 45 C 25 55 18 70 18 80 Z" fill="url(#metallic)" />
          <path d="M 90 80 C 85 50 65 35 52 35 L 60 45 C 75 55 82 70 82 80 Z" fill="url(#metallic)" />

          {/* Red Beam & Accents */}
          <motion.line 
            x1="50" y1="30" x2="50" y2="0" 
            stroke={isMonochrome ? 'currentColor' : '#FF003C'} 
            strokeWidth="2" 
            filter={!isMonochrome ? 'url(#glowRed)' : ''}
            initial={variant === 'loading' ? { y2: 30, opacity: 0 } : false}
            animate={variant === 'loading' ? { y2: 0, opacity: [0.5, 1, 0.5] } : { opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <path d="M 15 78 C 25 60 35 55 42 50 L 40 55 C 32 60 25 68 20 78 Z" fill={isMonochrome ? 'currentColor' : '#FF003C'} filter={!isMonochrome ? 'url(#glowRed)' : ''} opacity="0.8" />
          <path d="M 85 78 C 75 60 65 55 58 50 L 60 55 C 68 60 75 68 80 78 Z" fill={isMonochrome ? 'currentColor' : '#FF003C'} filter={!isMonochrome ? 'url(#glowRed)' : ''} opacity="0.8" />
          
          {/* Horizontal Base Line */}
          <line x1="5" y1="82" x2="95" y2="82" stroke="url(#metallic)" strokeWidth="1.5" />
        </g>

        {/* Text */}
        {showText && (
          <g transform="translate(0, 70)">
            <text x="200" y="30" fontFamily="Orbitron, sans-serif" fontSize="28" fontWeight="800" textAnchor="middle" letterSpacing="2">
              <tspan fill={isMonochrome ? 'currentColor' : '#E2E8F0'}>CYBER</tspan>
              <tspan fill={isMonochrome ? 'currentColor' : '#FF003C'}>DOME</tspan>
            </text>
            <text x="200" y="48" fontFamily="Rajdhani, sans-serif" fontSize="10" fontWeight="600" textAnchor="middle" letterSpacing="4" fill={isMonochrome ? 'currentColor' : '#8A95A5'}>
              YOUR NETWORK&apos;S SILENT GUARDIAN.
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
