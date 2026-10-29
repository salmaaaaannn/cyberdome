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
        {/* Top Bento Brand Tag */}
        <div className="cyberdome-loader-brand">
          <div className="brand-icon-box">
            <Shield size={13} color="#FFFFFF" />
          </div>
          <span className="brand-title">
            <span className="brand-white">CYBER</span>
            <span className="brand-blue">DOME</span>
          </span>
          <span className="brand-live-indicator">
            <span className="live-dot" />
            <span className="live-ping" />
          </span>
        </div>

        {/* Bento Radar & Holographic Shield Core */}
        <div className="cyber-radar-loader">
          {/* Sonar pulse wave ripples */}
          <div className="sonar-emitter">
            <span className="sonar-wave sonar-wave-1" />
            <span className="sonar-wave sonar-wave-2" />
            <span className="sonar-wave sonar-wave-3" />
          </div>

          {/* Radar background grid & rings (Bento Electric Blue & Cyan) */}
          <svg className="radar-grid" viewBox="0 0 130 130" fill="none">
            <circle cx="65" cy="65" r="58" stroke="rgba(59, 130, 246, 0.28)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="65" cy="65" r="45" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1" />
            <circle cx="65" cy="65" r="30" stroke="rgba(59, 130, 246, 0.32)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx="65" cy="65" r="16" stroke="rgba(59, 130, 246, 0.18)" strokeWidth="1" />
            <line x1="65" y1="7" x2="65" y2="123" stroke="rgba(59, 130, 246, 0.18)" strokeWidth="1" strokeDasharray="2 4" />
            <line x1="7" y1="65" x2="123" y2="65" stroke="rgba(59, 130, 246, 0.18)" strokeWidth="1" strokeDasharray="2 4" />
            {/* Precision Cardinal Ticks */}
            <line x1="65" y1="5" x2="65" y2="11" stroke="#3B82F6" strokeWidth="1.6" />
            <line x1="65" y1="119" x2="65" y2="125" stroke="#3B82F6" strokeWidth="1.6" />
            <line x1="5" y1="65" x2="11" y2="65" stroke="#06B6D4" strokeWidth="1.6" />
            <line x1="119" y1="65" x2="125" y2="65" stroke="#06B6D4" strokeWidth="1.6" />
          </svg>

          {/* Sweeping Radar Scanner (Electric Blue to Cyan Conic Beam) */}
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
            <svg className="shield-svg" viewBox="0 0 44 50" fill="none">
              <defs>
                <linearGradient id="cyberShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#2563EB" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.95" />
                </linearGradient>
                <radialGradient id="cyberShieldGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="22" cy="24" r="20" fill="url(#cyberShieldGlow)" />
              <path
                d="M22 3L7 8.5v13c0 11.5 6.5 19.5 15 23 8.5-3.5 15-11.5 15-23V8.5L22 3z"
                stroke="url(#cyberShieldGrad)"
                strokeWidth="2.2"
                strokeLinejoin="round"
                fill="rgba(15, 23, 42, 0.92)"
              />
              <path
                d="M22 7.5L11 11.5v10c0 9 5 15.5 11 18.5 6-3 11-9.5 11-18.5v-10L22 7.5z"
                stroke="rgba(6, 182, 212, 0.45)"
                strokeWidth="1"
                fill="none"
              />
              {/* Lock Shackle */}
              <path
                d="M19 21v-3a3 3 0 016 0v3"
                stroke="#06B6D4"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Lock Body */}
              <rect
                x="17"
                y="21"
                width="10"
                height="8.5"
                rx="2"
                fill="#1E293B"
                stroke="#3B82F6"
                strokeWidth="1.4"
              />
              <circle cx="22" cy="24.5" r="1.1" fill="#F8FAFC" />
              <line x1="22" y1="25.5" x2="22" y2="27.5" stroke="#F8FAFC" strokeWidth="1.2" strokeLinecap="round" />
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
                  <span className="telemetry-chip">{part.trim()}</span>
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
          background:
            radial-gradient(circle at center, rgba(59, 130, 246, 0.09) 0%, rgba(15, 23, 42, 0.45) 45%, rgba(11, 17, 32, 0.98) 85%),
            radial-gradient(rgba(51, 65, 85, 0.35) 1px, transparent 1px),
            #0B1120;
          background-size: 100% 100%, 28px 28px, 100% 100%;
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
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .cyberdome-loader-inline {
          position: relative;
          width: 100%;
          min-height: 300px;
          padding: 36px 20px;
          border-radius: 16px;
          background: rgba(30, 41, 59, 0.65);
          border: 1px solid rgba(51, 65, 85, 0.7);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .cyberdome-loader-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 36px 44px;
          border-radius: 20px;
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(51, 65, 85, 0.85);
          box-shadow:
            0 24px 50px -12px rgba(0, 0, 0, 0.75),
            0 0 35px rgba(59, 130, 246, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          animation: loader-fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: 90vw;
        }

        @keyframes loader-fade-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .cyberdome-loader-brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 5px 14px;
          border-radius: 9999px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.28);
          box-shadow: 0 0 18px rgba(59, 130, 246, 0.14);
        }

        .brand-icon-box {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }

        .brand-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .brand-white {
          color: #F8FAFC;
        }

        .brand-blue {
          color: #3B82F6;
          text-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
        }

        .brand-live-indicator {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 8px;
          height: 8px;
          margin-left: 2px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .live-ping {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.4);
          animation: live-ping-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes live-ping-pulse {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }

        .cyber-radar-loader {
          position: relative;
          width: 130px;
          height: 130px;
          display: grid;
          place-items: center;
          margin: 6px 0;
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
          border: 1px solid rgba(59, 130, 246, 0.45);
          box-shadow: 0 0 14px rgba(59, 130, 246, 0.3);
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
            opacity: 0.35;
          }
          100% {
            transform: scale(2.3);
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
          animation: radar-sweep 2.4s linear infinite;
          transform-origin: center center;
          pointer-events: none;
        }

        .radar-beam {
          position: absolute;
          inset: 7px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg at 50% 50%,
            rgba(59, 130, 246, 0.45) 0deg,
            rgba(6, 182, 212, 0.22) 42deg,
            transparent 72deg,
            transparent 360deg
          );
          mask-image: radial-gradient(circle at center, transparent 20%, black 22%);
          -webkit-mask-image: radial-gradient(circle at center, transparent 20%, black 22%);
        }

        .radar-sweep-line {
          position: absolute;
          top: 7px;
          left: 50%;
          width: 1.5px;
          height: calc(50% - 7px);
          background: linear-gradient(180deg, #3B82F6 0%, rgba(59, 130, 246, 0.85) 50%, rgba(6, 182, 212, 0.5) 85%, transparent 100%);
          transform: translateX(-50%);
          box-shadow: 0 0 10px #3B82F6, 0 0 16px rgba(6, 182, 212, 0.7);
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
          inset: 7px;
          animation: orbit-rotate-cw 5.5s linear infinite;
        }

        .orbit-track-inner {
          inset: 20px;
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
          background: #3B82F6;
          box-shadow: 0 0 8px #3B82F6, 0 0 14px rgba(59, 130, 246, 0.85);
          transform: translate(-50%, -50%);
        }

        .node-2 {
          bottom: 12px;
          right: 7px;
          width: 4px;
          height: 4px;
          background: #06B6D4;
          box-shadow: 0 0 8px #06B6D4;
          transform: translate(50%, 50%);
        }

        .node-3 {
          top: 30%;
          left: 0;
          width: 4px;
          height: 4px;
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
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
          width: 46px;
          height: 52px;
          display: grid;
          place-items: center;
          animation: shield-glow 2.5s ease-in-out infinite alternate;
        }

        .shield-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.55));
        }

        @keyframes shield-glow {
          0% {
            transform: scale(0.97);
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
          }
          100% {
            transform: scale(1.03);
            filter: drop-shadow(0 0 16px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 24px rgba(6, 182, 212, 0.45));
          }
        }

        .loader-hud {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 11px;
          width: 100%;
        }

        .loader-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 2px;
          color: #F8FAFC;
          text-shadow: 0 0 14px rgba(59, 130, 246, 0.5);
          animation: label-pulse 2s ease-in-out infinite alternate;
          text-align: center;
        }

        @keyframes label-pulse {
          0% {
            opacity: 0.82;
          }
          100% {
            opacity: 1;
          }
        }

        .loader-progress-track {
          width: 220px;
          height: 4px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(51, 65, 85, 0.7);
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
          background: linear-gradient(90deg, transparent, #3B82F6 40%, #06B6D4 80%, #FFFFFF 100%);
          border-radius: 9999px;
          box-shadow: 0 0 12px #3B82F6, 0 0 18px rgba(6, 182, 212, 0.6);
          animation: scanner-bar 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
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
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          letter-spacing: 1px;
          color: #94A3B8;
          max-width: 360px;
          text-align: center;
        }

        .telemetry-chip {
          display: inline-block;
          padding: 2px 6px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.4);
          border-radius: 4px;
          color: #94A3B8;
        }

        .loader-telemetry .dot {
          color: #10B981;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default CyberdomeLoader;
