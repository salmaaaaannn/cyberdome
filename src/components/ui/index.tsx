'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CyberXLogo from './CyberXLogo';
import { CyberdomeLoader } from './CyberdomeLoader';

// ======================== SecurityScore ========================
export function SecurityScore({
  score,
  size = 110,
  showLabel = true
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-critical)';
  const labelText = score >= 80 ? 'Good security posture' : score >= 60 ? 'Moderate exposure' : 'High vulnerability risk';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
          />
          {/* Progress Stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>

        {/* Center Score Text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1
        }}>
          <span style={{ fontSize: size * 0.28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {score}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
            / 100
          </span>
        </div>
      </div>

      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 500, color: color, textAlign: 'center' }}>
          {labelText}
        </span>
      )}
    </div>
  );
}

// ======================== RiskBadge ========================
export function RiskBadge({ severity, className = '' }: { severity: string; className?: string }) {
  const norm = severity.toUpperCase();
  const cls =
    norm === 'CRITICAL' ? 'badge-critical' :
    norm === 'HIGH' ? 'badge-high' :
    norm === 'MEDIUM' ? 'badge-medium' :
    norm === 'LOW' ? 'badge-info' :
    'badge-safe';

  return <span className={`badge ${cls} ${className}`}>{norm}</span>;
}

// ======================== StatusIndicator ========================
export function StatusIndicator({ status, label }: { status: string; label?: string }) {
  const norm = status.toUpperCase();
  const isSafe = norm === 'SAFE' || norm === 'ONLINE' || norm === 'RESOLVED' || norm === 'HEALTHY';
  const isWarning = norm === 'WARNING' || norm === 'INVESTIGATING' || norm === 'NEEDS_ATTENTION';
  const isCritical = norm === 'CRITICAL' || norm === 'OFFLINE' || norm === 'DANGEROUS';

  const dotColor = isSafe ? 'var(--color-success)' : isWarning ? 'var(--color-warning)' : isCritical ? 'var(--color-critical)' : 'var(--text-muted)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
      {label && <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 13 }}>{label}</span>}
    </span>
  );
}

// ======================== Clean Button (GlowButton alias) ========================
export function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  style
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) {
  return (
    <button
      className={`btn btn-${variant} ${size !== 'md' ? `btn-${size}` : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      style={style}>
      {children}
    </button>
  );
}

// ======================== GlassPanel (Crisp White Card) ========================
export function GlassPanel({
  children,
  className = '',
  style
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`glass-panel ${className}`} style={style}>
      {children}
    </div>
  );
}

// ======================== MetricCard ========================
export function MetricCard({
  label,
  value,
  icon,
  change,
  trendDirection = 'neutral',
  color
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  color?: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        {icon && (
          <div className="metric-card-icon" style={color ? { color, backgroundColor: `${color}10` } : {}}>
            {typeof icon === 'string' ? <span style={{ fontSize: 18 }}>{icon}</span> : icon}
          </div>
        )}
      </div>

      <div className="metric-value" style={color ? { color } : {}}>
        {value}
      </div>

      {change && (
        <div className={`metric-trend ${trendDirection}`}>
          {change}
        </div>
      )}
    </div>
  );
}

// ======================== FeatureCard ========================
export function FeatureCard({
  icon,
  title,
  description,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor?: string;
  onClick?: () => void;
}) {
  return (
    <div className="card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: 'var(--color-critical-bg)',
        color: 'var(--color-critical)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
      }}>
        {icon}
      </div>
      <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </h4>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

// ======================== DemoBanner ========================
export function DemoBanner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-primary)',
      borderRadius: 8,
      marginBottom: 20,
      boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusIndicator status="SAFE" />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
          DEMO ENVIRONMENT
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          — Running on synthetic telemetry. Realistic findings and simulated posture.
        </span>
      </div>
      <span className="badge badge-info" style={{ fontSize: 11 }}>
        READY FOR API INTEGRATION
      </span>
    </div>
  );
}

// ======================== Skeleton Loading State ========================
export function LoadingState({ text = 'Loading security data...' }: { text?: string }) {
  return (
    <CyberdomeLoader
      fullscreen={false}
      label={text.toUpperCase()}
      subtext="TELEMETRY STREAMING · ANOMALY ENGINE RUNNING"
    />
  );
}

// ======================== CyberTabs ========================
export function CyberTabs({
  tabs,
  activeTab,
  onTabChange
}: {
  tabs: string[];
  activeTab: string;
  onTabChange: (t: string) => void;
}) {
  return (
    <div style={{
      display: 'inline-flex',
      backgroundColor: 'var(--bg-hover)',
      padding: 3,
      borderRadius: 8,
      gap: 2
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderRadius: 6,
              boxShadow: isActive ? 'var(--shadow-card)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}>
            {tab}
          </button>
        );
      })}
    </div>
  );
}

// ======================== CyberToggle ========================
export function CyberToggle({
  active,
  onChange,
  label
}: {
  active: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!active)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          backgroundColor: active ? 'var(--color-critical)' : 'var(--border-primary)',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          flexShrink: 0
        }}>
        <div style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          position: 'absolute',
          top: 2,
          left: active ? 18 : 2,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }} />
      </div>
      {label && <span style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>}
    </label>
  );
}

// MiniChart sparkline component
export function MiniChart({
  data,
  color = 'var(--color-info)',
  height = 80,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 300;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 12) - 6;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{ width: '100%', height, overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#grad-${color.replace(/[^a-zA-Z0-9]/g, '')})`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
}

export { default as CyberSafetyLogo } from './CyberSafetyLogo';
export { default as CyberDomeLogo } from './CyberXLogo';
export { CyberdomeLoader, default as DefaultCyberdomeLoader } from './CyberdomeLoader';

