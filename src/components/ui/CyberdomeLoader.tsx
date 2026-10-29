'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export interface CyberdomeLoaderProps {
  fullscreen?: boolean;
  label?: string;
  subtext?: string;
  showProgress?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function CyberdomeLoader({
  fullscreen = true,
  label = 'CALIBRATING DEFENSE GRID...',
  subtext = 'RADAR: LOCKING · NODES: 5 ONLINE · ZERO-TRUST: SECURED',
  showProgress = true,
  className = '',
  style = {},
}: CyberdomeLoaderProps) {
  return (
    <div
      className={`cyberdome-loader-root ${fullscreen ? 'cyberdome-loader-fullscreen' : 'cyberdome-loader-inline'} ${className}`}
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
      <div
        className="cyberdome-loader-card"
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

        {/* Bento Tactical Radar Centerpiece */}
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
              {/* Radar Scanner Beam Gradient */}
              <linearGradient id="cdScannerGrad" x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
              </linearGradient>

              {/* Shield Gradients */}
              <linearGradient id="cdShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#2563EB" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.95" />
              </linearGradient>
              <radialGradient id="cdShieldGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Static Radar Rings */}
            <circle cx="70" cy="70" r="62" stroke="rgba(59, 130, 246, 0.28)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="70" cy="70" r="48" stroke="rgba(6, 182, 212, 0.22)" strokeWidth="1" />
            <circle cx="70" cy="70" r="32" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx="70" cy="70" r="18" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1" />

            {/* Crosshairs */}
            <line x1="70" y1="8" x2="70" y2="132" stroke="rgba(59, 130, 246, 0.16)" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="8" y1="70" x2="132" y2="70" stroke="rgba(59, 130, 246, 0.16)" strokeWidth="1" strokeDasharray="2 4" />

            {/* Cardinal Tick Marks */}
            <line x1="70" y1="6" x2="70" y2="12" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="70" y1="128" x2="70" y2="134" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="6" y1="70" x2="12" y2="70" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="128" y1="70" x2="134" y2="70" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />

            {/* 45° Corner Orientation Dots */}
            <circle cx="26" cy="26" r="1.5" fill="rgba(59, 130, 246, 0.5)" />
            <circle cx="114" cy="26" r="1.5" fill="rgba(59, 130, 246, 0.5)" />
            <circle cx="26" cy="114" r="1.5" fill="rgba(59, 130, 246, 0.5)" />
            <circle cx="114" cy="114" r="1.5" fill="rgba(59, 130, 246, 0.5)" />

            {/* Sweeping Radar Wedge and Laser Arm */}
            <g className="cd-radar-scanner" style={{ transformOrigin: '70px 70px' }}>
              {/* Conic Radar Wedge (60 deg arc) */}
              <path
                d="M 70 70 L 70 8 A 62 62 0 0 1 123.69 39 Z"
                fill="url(#cdScannerGrad)"
              />
              {/* Precision Laser Sweep Line */}
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
      </div>
    </div>
  );
}

export default CyberdomeLoader;
