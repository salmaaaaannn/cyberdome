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
      style={style}
      role="status"
      aria-label={label}
    >
      <div className="cyberdome-loader-card">
        {/* Top Brand Tag */}
        <div className="cyberdome-loader-brand">
          <div className="brand-icon-box">
            <Shield size={14} color="#FF1744" />
          </div>
          <span className="brand-title">
            <span className="brand-white">CYBER</span>
            <span className="brand-red">DOME</span>
          </span>
        </div>

        {/* Radar & Holographic Shield Core */}
        <div className="cyber-radar-loader">
          {/* Sonar pulse wave ripples */}
          <div className="sonar-emitter">
            <span className="sonar-wave sonar-wave-1" />
            <span className="sonar-wave sonar-wave-2" />
            <span className="sonar-wave sonar-wave-3" />
          </div>

          {/* Radar background grid & rings (Cyberdome Red & Cyan) */}
          <svg className="radar-grid" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="54" stroke="rgba(255, 23, 68, 0.28)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="60" cy="60" r="42" stroke="rgba(0, 217, 255, 0.25)" strokeWidth="1" />
            <circle cx="60" cy="60" r="28" stroke="rgba(255, 23, 68, 0.3)" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="60" y1="6" x2="60" y2="114" stroke="rgba(255, 23, 68, 0.18)" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="6" y1="60" x2="114" y2="60" stroke="rgba(255, 23, 68, 0.18)" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="60" y1="4" x2="60" y2="10" stroke="#FF1744" strokeWidth="1.6" />
            <line x1="60" y1="110" x2="60" y2="116" stroke="#FF1744" strokeWidth="1.6" />
            <line x1="4" y1="60" x2="10" y2="60" stroke="#00D9FF" strokeWidth="1.6" />
            <line x1="110" y1="60" x2="116" y2="60" stroke="#00D9FF" strokeWidth="1.6" />
          </svg>

          {/* Sweeping Radar Scanner (Conic Crimson & Cyan beam) */}
          <div className="radar-scanner">
            <div className="radar-beam" />
            <div className="radar-sweep-line" />
          </div>

          {/* Orbiting Satellite Data Nodes */}
          <div className="orbit-track orbit-track-outer">
            <span className="satellite-node node-1" />
            <span className="satellite-node node-2" />
          </div>
          <div className="orbit-track orbit-track-inner">
            <span className="satellite-node node-3" />
          </div>

          {/* Center Holographic Cyber Shield with Lock Core */}
          <div className="cyber-shield-container">
            <svg className="shield-svg" viewBox="0 0 40 46" fill="none">
              <defs>
                <linearGradient id="cyberShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF1744" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#FF365C" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#00D9FF" stopOpacity="0.95" />
                </linearGradient>
                <radialGradient id="cyberShieldGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FF1744" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#FF1744" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="20" cy="22" r="18" fill="url(#cyberShieldGlow)" />
              <path
                d="M20 3L6 8v12c0 10.5 6 18 14 21 8-3 14-10.5 14-21V8L20 3z"
                stroke="url(#cyberShieldGrad)"
                strokeWidth="2.2"
                strokeLinejoin="round"
                fill="rgba(13, 17, 23, 0.88)"
              />
              <path
                d="M20 7L9.5 11v9.5c0 8.2 4.5 14.5 10.5 17 6-2.5 10.5-8.8 10.5-17V11L20 7z"
                stroke="rgba(0, 217, 255, 0.4)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M17 19v-2.5a3 3 0 016 0V19"
                stroke="#00D9FF"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <rect
                x="15"
                y="19"
                width="10"
                height="8"
                rx="2"
                fill="#161D26"
                stroke="#FF1744"
                strokeWidth="1.4"
              />
              <circle cx="20" cy="22.5" r="1" fill="#F8FAFC" />
              <line x1="20" y1="23.5" x2="20" y2="25" stroke="#F8FAFC" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* HUD Telemetry & Progress Bar */}
        <div className="loader-hud">
          {label && <div className="loader-label">{label}</div>}
          {showProgress && (
            <div className="loader-progress-track">
              <div className="loader-progress-bar" />
            </div>
          )}
          {subtext && (
            <div className="loader-telemetry">
              {subtext.split('·').map((part, index, arr) => (
                <React.Fragment key={index}>
                  <span>{part.trim()}</span>
                  {index < arr.length - 1 && <span className="dot">·</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .cyberdome-loader-root {
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, rgba(255, 23, 68, 0.08) 0%, rgba(7, 9, 12, 0.98) 75%), #07090C;
          color: #F8FAFC;
          user-select: none;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .cyberdome-loader-fullscreen {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          min-height: 100vh;
          z-index: 99999;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .cyberdome-loader-inline {
          position: relative;
          width: 100%;
          min-height: 280px;
          padding: 32px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 23, 68, 0.15);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .cyberdome-loader-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          animation: loader-fade-in 0.4s ease-out;
        }

        @keyframes loader-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cyberdome-loader-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 14px;
          border-radius: 9999px;
          background: rgba(255, 23, 68, 0.08);
          border: 1px solid rgba(255, 23, 68, 0.25);
          box-shadow: 0 0 16px rgba(255, 23, 68, 0.15);
        }

        .brand-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          font-family: 'Orbitron', 'Inter', sans-serif;
        }

        .brand-white {
          color: #F8FAFC;
        }

        .brand-red {
          color: #FF1744;
          text-shadow: 0 0 8px rgba(255, 23, 68, 0.6);
        }

        .cyber-radar-loader {
          position: relative;
          width: 120px;
          height: 120px;
          display: grid;
          place-items: center;
        }

        .sonar-emitter {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
        }

        .sonar-wave {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 1px solid rgba(255, 23, 68, 0.5);
          box-shadow: 0 0 12px rgba(255, 23, 68, 0.35);
          animation: sonar-pulse 3s cubic-bezier(0.1, 0.2, 0.4, 1) infinite;
          opacity: 0;
        }

        .sonar-wave-1 {
          animation-delay: 0s;
        }

        .sonar-wave-2 {
          animation-delay: 1s;
        }

        .sonar-wave-3 {
          animation-delay: 2s;
        }

        @keyframes sonar-pulse {
          0% {
            transform: scale(0.5);
            opacity: 0.9;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }

        .radar-grid {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .radar-scanner {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: radar-sweep 2.6s linear infinite;
          transform-origin: center center;
          pointer-events: none;
        }

        .radar-beam {
          position: absolute;
          inset: 6px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg at 50% 50%,
            rgba(255, 23, 68, 0.5) 0deg,
            rgba(0, 217, 255, 0.22) 40deg,
            transparent 70deg,
            transparent 360deg
          );
          mask-image: radial-gradient(circle at center, transparent 20%, black 22%);
          -webkit-mask-image: radial-gradient(circle at center, transparent 20%, black 22%);
        }

        .radar-sweep-line {
          position: absolute;
          top: 6px;
          left: 50%;
          width: 1.5px;
          height: calc(50% - 6px);
          background: linear-gradient(180deg, #FF1744 0%, rgba(255, 23, 68, 0.8) 50%, rgba(0, 217, 255, 0.5) 85%, transparent 100%);
          transform: translateX(-50%);
          box-shadow: 0 0 10px #FF1744, 0 0 18px rgba(255, 23, 68, 0.7);
        }

        @keyframes radar-sweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .orbit-track {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .orbit-track-outer {
          inset: 6px;
          animation: orbit-rotate-cw 5.5s linear infinite;
        }

        .orbit-track-inner {
          inset: 18px;
          animation: orbit-rotate-ccw 3.8s linear infinite;
        }

        .satellite-node {
          position: absolute;
          border-radius: 50%;
        }

        .node-1 {
          top: 0;
          left: 50%;
          width: 5px;
          height: 5px;
          background: #FF1744;
          box-shadow: 0 0 8px #FF1744, 0 0 14px rgba(255, 23, 68, 0.8);
          transform: translate(-50%, -50%);
        }

        .node-2 {
          bottom: 12px;
          right: 6px;
          width: 4px;
          height: 4px;
          background: #00D9FF;
          box-shadow: 0 0 8px #00D9FF;
          transform: translate(50%, 50%);
        }

        .node-3 {
          top: 30%;
          left: 0;
          width: 4px;
          height: 4px;
          background: #00E887;
          box-shadow: 0 0 8px #00E887;
          transform: translate(-50%, -50%);
        }

        @keyframes orbit-rotate-cw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes orbit-rotate-ccw {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        .cyber-shield-container {
          position: relative;
          z-index: 2;
          width: 44px;
          height: 50px;
          display: grid;
          place-items: center;
          animation: shield-glow 2.5s ease-in-out infinite alternate;
        }

        .shield-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 10px rgba(255, 23, 68, 0.5));
        }

        @keyframes shield-glow {
          0% {
            transform: scale(0.97);
            filter: drop-shadow(0 0 6px rgba(255, 23, 68, 0.4));
          }
          100% {
            transform: scale(1.03);
            filter: drop-shadow(0 0 16px rgba(255, 23, 68, 0.75)) drop-shadow(0 0 24px rgba(0, 217, 255, 0.4));
          }
        }

        .loader-hud {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
        }

        .loader-label {
          font-family: 'JetBrains Mono', 'Orbitron', monospace;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 2.2px;
          color: #F8FAFC;
          text-shadow: 0 0 12px rgba(255, 23, 68, 0.6);
          animation: label-pulse 2s ease-in-out infinite alternate;
        }

        @keyframes label-pulse {
          0% {
            opacity: 0.8;
          }
          100% {
            opacity: 1;
          }
        }

        .loader-progress-track {
          width: 190px;
          height: 3px;
          background: rgba(255, 23, 68, 0.1);
          border: 1px solid rgba(255, 23, 68, 0.3);
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
        }

        .loader-progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 45%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #FF1744 40%, #00D9FF 80%, #FFFFFF 100%);
          border-radius: 9999px;
          box-shadow: 0 0 10px #FF1744, 0 0 16px rgba(0, 217, 255, 0.6);
          animation: scanner-bar 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes scanner-bar {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(380%);
          }
        }

        .loader-telemetry {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 1.2px;
          color: #94A3B8;
        }

        .loader-telemetry .dot {
          color: #FF1744;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default CyberdomeLoader;
