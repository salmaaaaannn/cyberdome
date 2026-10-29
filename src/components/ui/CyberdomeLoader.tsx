'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

export interface CyberdomeLoaderProps {
  fullscreen?: boolean;
  label?: string;
  subtext?: string;
  showProgress?: boolean;
  lottieUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CyberdomeLoader({
  fullscreen = true,
  label = 'CALIBRATING DEFENSE GRID...',
  subtext = 'RADAR: LOCKING · NODES: 5 ONLINE · ZERO-TRUST: SECURED',
  showProgress = true,
  lottieUrl,
  className = '',
  style = {},
}: CyberdomeLoaderProps) {
  const [lottieLoaded, setLottieLoaded] = useState(false);

  // Dynamically load the verified Lottie player web component if a lottieUrl is provided
  useEffect(() => {
    if (lottieUrl && typeof window !== 'undefined') {
      if (!customElements.get('lottie-player')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@lottiefiles/lottie-player@2.0.8/dist/lottie-player.js';
        script.async = true;
        script.onload = () => setLottieLoaded(true);
        document.body.appendChild(script);
      } else {
        setLottieLoaded(true);
      }
    }
  }, [lottieUrl]);

  return (
    <motion.div
      className={`cyberdome-loader-root ${fullscreen ? 'cyberdome-loader-fullscreen' : 'cyberdome-loader-inline'} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
      role="status"
      aria-label={label}
    >
      <motion.div
        className="cyberdome-loader-card"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Bento Brand Tag */}
        <div className="cyberdome-loader-brand">
          <div className="cd-brand-icon-box">
            <Shield size={12} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <span className="cd-brand-title">
            <span className="cd-brand-white">CYBER</span>
            <span className="cd-brand-blue">DOME</span>
          </span>
          <span className="cd-brand-live">
            <span className="cd-live-dot" />
            <span className="cd-live-ping" />
          </span>
        </div>

        {/* Dynamic Lottie Animation Player or Built-in Bento Cyber Radar Scene */}
        {lottieUrl ? (
          <div
            style={{
              width: 170,
              height: 170,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              margin: '4px 0',
            }}
          >
            {/* @ts-ignore */}
            <lottie-player
              src={lottieUrl}
              background="transparent"
              speed="1"
              style={{ width: '160px', height: '160px' }}
              loop
              autoplay
            />
          </div>
        ) : (
          /* Built-in High-End Lottie-Grade Vector Cyber Security Animation */
          <div className="cd-radar-container">
            {/* Concentric Sonar Pulse Rings */}
            <div className="cd-sonar-emitter">
              <span className="cd-sonar-wave cd-sonar-wave-1" />
              <span className="cd-sonar-wave cd-sonar-wave-2" />
              <span className="cd-sonar-wave cd-sonar-wave-3" />
            </div>

            {/* SVG Tactical Radar Grid + Rotating Scanner */}
            <svg className="cd-radar-svg" viewBox="0 0 140 140" fill="none">
              <defs>
                <linearGradient id="cdScannerGrad" x1="0%" y1="0%" x2="100%" y2="80%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.48" />
                  <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="cdShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#2563EB" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.95" />
                </linearGradient>

                <radialGradient id="cdShieldGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Static Radar Rings */}
              <circle cx="70" cy="70" r="62" stroke="rgba(59, 130, 246, 0.28)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx="70" cy="70" r="48" stroke="rgba(6, 182, 212, 0.24)" strokeWidth="1" />
              <circle cx="70" cy="70" r="32" stroke="rgba(59, 130, 246, 0.32)" strokeWidth="1" strokeDasharray="2 3" />
              <circle cx="70" cy="70" r="18" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1" />

              {/* Crosshairs */}
              <line x1="70" y1="8" x2="70" y2="132" stroke="rgba(59, 130, 246, 0.16)" strokeWidth="1" strokeDasharray="2 4" />
              <line x1="8" y1="70" x2="132" y2="70" stroke="rgba(59, 130, 246, 0.16)" strokeWidth="1" strokeDasharray="2 4" />

              {/* Cardinal Tick Marks */}
              <line x1="70" y1="6" x2="70" y2="12" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="70" y1="128" x2="70" y2="134" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="6" y1="70" x2="12" y2="70" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="128" y1="70" x2="134" y2="70" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />

              {/* Corner Orientation Dots */}
              <circle cx="26" cy="26" r="1.5" fill="rgba(59, 130, 246, 0.5)" />
              <circle cx="114" cy="26" r="1.5" fill="rgba(59, 130, 246, 0.5)" />
              <circle cx="26" cy="114" r="1.5" fill="rgba(59, 130, 246, 0.5)" />
              <circle cx="114" cy="114" r="1.5" fill="rgba(59, 130, 246, 0.5)" />

              {/* Sweeping Radar Wedge and Laser Arm */}
              <g className="cd-radar-scanner" style={{ transformOrigin: '70px 70px' }}>
                <path
                  d="M 70 70 L 70 8 A 62 62 0 0 1 123.69 39 Z"
                  fill="url(#cdScannerGrad)"
                />
                <line
                  x1="70"
                  y1="70"
                  x2="70"
                  y2="8"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 6px #3B82F6)"
                />
              </g>
            </svg>

            {/* Orbiting Satellite Data Nodes */}
            <div className="cd-orbit-outer">
              <span className="cd-node cd-node-1" />
              <span className="cd-node cd-node-2" />
            </div>
            <div className="cd-orbit-inner">
              <span className="cd-node cd-node-3" />
            </div>

            {/* Center Holographic Cyber Shield with Security Check */}
            <div className="cd-shield-box">
              <svg className="cd-shield-svg" viewBox="0 0 48 54" fill="none">
                <circle cx="24" cy="27" r="22" fill="url(#cdShieldGlow)" />
                {/* Outer Shield Shell */}
                <path
                  d="M24 3L8 9v14c0 12.5 7 21 16 25 9-4 16-12.5 16-25V9L24 3z"
                  stroke="url(#cdShieldGrad)"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  fill="rgba(15, 23, 42, 0.94)"
                />
                {/* Inner Shield Accent Contour */}
                <path
                  d="M24 7.5L12 12v11.5c0 9.8 5.5 16.8 12 20 6.5-3.2 12-10.2 12-20V12L24 7.5z"
                  stroke="rgba(6, 182, 212, 0.45)"
                  strokeWidth="1"
                  fill="none"
                />
                {/* Cyber Verified Checkmark */}
                <path
                  d="M17 26.5l4.5 4.5 9.5-9.5"
                  stroke="#06B6D4"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 26.5l4.5 4.5 9.5-9.5"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

        {/* HUD Telemetry & Progress Bar */}
        <div className="cd-loader-hud">
          {label && <div className="cd-loader-label">{label}</div>}

          {showProgress && (
            <div className="cd-progress-track">
              <div className="cd-progress-bar" />
            </div>
          )}

          {subtext && (
            <div className="cd-loader-telemetry">
              {subtext.split('·').map((part, index, arr) => (
                <React.Fragment key={index}>
                  <span className="cd-telemetry-chip">{part.trim()}</span>
                  {index < arr.length - 1 && <span className="cd-telemetry-dot">·</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default CyberdomeLoader;
