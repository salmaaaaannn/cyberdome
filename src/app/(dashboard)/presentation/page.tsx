// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CyberSafetyLogo from '@/components/ui/CyberSafetyLogo';
import { GlowButton, MetricCard, StatusIndicator, GlassPanel } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { dashboardService } from '@/services';
import Link from 'next/link';
import {
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Send,
  Lock,
  Layers,
  Code2,
  Terminal,
  Grid,
} from 'lucide-react';

const FULL_DEMO_SEQUENCE = [
  { id: 'seq-1', timeOffset: '09:41:01', name: 'PHISHING', desc: 'Attacker sends targeted spear-phishing lure mimicking VPN upgrade portal.', icon: '🎣' },
  { id: 'seq-2', timeOffset: '09:41:12', name: 'USER INTERACTION', desc: 'Employee clicks simulated link; warning telemetry captured in sandbox.', icon: '👤' },
  { id: 'seq-3', timeOffset: '09:41:27', name: 'SUSPICIOUS LOGIN', desc: 'Simulated credential probe triggers unexpected location login alert.', icon: '⚡' },
  { id: 'seq-4', timeOffset: '09:41:43', name: 'UEBA ANOMALY', desc: 'Impossible travel anomaly detected: simultaneous login from Tokyo and London.', icon: '🌐' },
  { id: 'seq-5', timeOffset: '09:42:01', name: 'VULNERABILITY', desc: 'Attacker probes internal DMZ subnet for unpatched CVE-2026-21001 RCE.', icon: '🛡' },
  { id: 'seq-6', timeOffset: '09:42:15', name: 'ATTACK GRAPH', desc: 'Graph computes active 4-hop lateral movement trajectory toward core database.', icon: '🕸' },
  { id: 'seq-7', timeOffset: '09:42:25', name: 'DIGITAL TWIN', desc: 'Virtual environment synchronized. Host status switches to CRITICAL.', icon: '🌀' },
  { id: 'seq-8', timeOffset: '09:42:38', name: 'WHAT-IF SIMULATION', desc: 'Simulator runs projected propagation model through DMZ boundary.', icon: '🔮' },
  { id: 'seq-9', timeOffset: '09:42:50', name: 'BLAST RADIUS', desc: 'Blast radius identified: 3 internal hosts and 1 PII database exposed.', icon: '💥' },
  { id: 'seq-10', timeOffset: '09:43:02', name: 'RISK SCORE SURGE', desc: 'Target compound risk score surges from 42 to 92/100.', icon: '📈' },
  { id: 'seq-11', timeOffset: '09:43:14', name: 'INCIDENT CREATED', desc: 'Autonomous Incident INC-409 created with MITRE T1566 and T1071 mappings.', icon: '🚨' },
  { id: 'seq-12', timeOffset: '09:43:28', name: 'AI EXPLANATION', desc: 'AI Security Copilot synthesizes remediation playbook and blast radius report.', icon: '🤖' },
  { id: 'seq-13', timeOffset: '09:43:40', name: 'NOTIFICATION DISPATCH', desc: 'High-priority SMS & Email dispatch routed to Security Director on-call.', icon: '📱' },
];

export default function PresentationPage() {
  const { demoSessionId, resetDemoSession, triggerWhatIfPropagation } = useAppStore();

  const [simulating, setSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [activeScenario, setActiveScenario] = useState('Multi-stage Attack');
  const [notificationSent, setNotificationSent] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState<'network' | 'code' | 'grid'>('network');

  const [metrics, setMetrics] = useState({ securityScore: 82, activeIncidents: 0, criticalAssets: 0 });

  useEffect(() => {
    dashboardService.getMetrics().then(m => {
      if (m) {
        setMetrics({
          securityScore: m.security_score || 82,
          activeIncidents: m.active_incidents || 0,
          criticalAssets: m.critical_assets || 0
        });
      }
    });
  }, []);

  const runFullSimulation = () => {
    setSimulating(true);
    setCurrentStep(0);
    setNotificationSent(false);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= FULL_DEMO_SEQUENCE.length) {
        clearInterval(interval);
        setSimulating(false);
        setNotificationSent(true);
      } else {
        setCurrentStep(step);
        // Trigger digital twin sync on lateral movement step
        if (step === 6) {
          triggerWhatIfPropagation('multi-stage-demo', ['node-web-alpha', 'node-db-primary'], 92, 4);
        }
      }
    }, 1200);
  };

  const handleSendNotification = () => {
    setNotificationSent(true);
    setTimeout(() => setNotificationSent(false), 4000);
  };

  const handleReset = () => {
    setSimulating(false);
    setCurrentStep(-1);
    setNotificationSent(false);
    resetDemoSession();
  };

  return (
    <div
      className="presentation-mode"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'auto',
        padding: '30px 20px',
        background:
          backgroundTheme === 'code'
            ? '#0A0E17'
            : backgroundTheme === 'grid'
            ? '#080C14'
            : '#0B1120',
        color: '#F8FAFC',
      }}
    >
      {/* Background Graphic Decorator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          opacity: 0.15,
          backgroundImage:
            backgroundTheme === 'grid'
              ? 'radial-gradient(circle at 50% 50%, #FF1744 1px, transparent 1px)'
              : backgroundTheme === 'code'
              ? 'linear-gradient(rgba(0,232,135,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,232,135,0.1) 1px, transparent 1px)'
              : 'radial-gradient(circle at 30% 20%, rgba(2, 132, 199, 0.4) 0%, transparent 60%)',
          backgroundSize: backgroundTheme === 'grid' ? '30px 30px' : backgroundTheme === 'code' ? '40px 40px' : 'auto',
        }}
      />

      {/* Header */}
      <div className="presentation-header" style={{ textAlign: 'center', marginBottom: 24, position: 'relative', zIndex: 2 }}>
        <CyberSafetyLogo size={42} showSubtitle={true} href="/" />
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.25em', marginTop: 12 }}>
          ENTERPRISE CINEMATIC PRESENTATION MODE
        </div>

        {/* Isolation Session Token */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: '0.78rem', padding: '3px 10px', background: 'rgba(0, 232, 135, 0.15)', color: '#00E887', borderRadius: 4, fontFamily: 'monospace' }}>
            DEMO SESSION ISOLATED: {demoSessionId}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Zero Production State Modification</span>
        </div>
      </div>

      {/* Background Theme Switcher */}
      <div style={{ maxWidth: 1000, margin: '0 auto 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Cinematic Canvas Background:</span>
        <button
          onClick={() => setBackgroundTheme('network')}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            border: `1px solid ${backgroundTheme === 'network' ? 'var(--cyberdome-red)' : 'var(--border-primary)'}`,
            background: backgroundTheme === 'network' ? 'var(--cyberdome-red)' : 'var(--bg-elevated)',
            color: backgroundTheme === 'network' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Cyber Network
        </button>
        <button
          onClick={() => setBackgroundTheme('code')}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            border: `1px solid ${backgroundTheme === 'code' ? 'var(--cyberdome-red)' : 'var(--border-primary)'}`,
            background: backgroundTheme === 'code' ? 'var(--cyberdome-red)' : 'var(--bg-elevated)',
            color: backgroundTheme === 'code' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Code / Telemetry Stream
        </button>
        <button
          onClick={() => setBackgroundTheme('grid')}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            border: `1px solid ${backgroundTheme === 'grid' ? 'var(--cyberdome-red)' : 'var(--border-primary)'}`,
            background: backgroundTheme === 'grid' ? 'var(--cyberdome-red)' : 'var(--bg-elevated)',
            color: backgroundTheme === 'grid' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Digital Twin Grid
        </button>
      </div>

      {/* Scenario Selector */}
      <div style={{ maxWidth: 1000, margin: '0 auto 24px', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {['Critical CVE', 'Server Compromise', 'Phishing Attack', 'IoT Anomaly', 'UEBA Anomaly', 'Multi-stage Attack'].map((s) => (
          <button
            key={s}
            onClick={() => setActiveScenario(s)}
            className={`btn btn-sm ${activeScenario === s ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              fontSize: '0.8rem',
              background: activeScenario === s ? 'var(--cyberdome-red)' : 'var(--bg-elevated)',
              color: activeScenario === s ? '#FFFFFF' : 'var(--text-primary)',
              border: `1px solid ${activeScenario === s ? 'var(--cyberdome-red)' : 'var(--border-primary)'}`,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Live Metrics Grid */}
      <div className="presentation-grid" style={{ maxWidth: 1100, margin: '0 auto 28px' }}>
        <MetricCard label="Security Risk Score" value={currentStep >= 9 ? 92 : metrics.securityScore} color={currentStep >= 9 ? 'var(--cyberdome-red)' : 'var(--color-warning)'} icon="⬡" />
        <MetricCard label="Active Incidents" value={currentStep >= 10 ? metrics.activeIncidents + 1 : metrics.activeIncidents} color="var(--cyberdome-red)" icon="🚨" />
        <MetricCard label="Affected Assets" value={currentStep >= 8 ? 4 : metrics.criticalAssets} color="var(--cyberdome-red)" icon="🖥" />
        <MetricCard label="Attack Paths" value={currentStep >= 5 ? 4 : 1} color="var(--color-warning)" icon="🕸" />
        <MetricCard label="IoT Anomalies" value="12" color="var(--color-warning)" icon="📡" />
        <MetricCard label="UEBA Anomalies" value={currentStep >= 2 ? 6 : 5} color="var(--color-ai)" icon="👤" />
      </div>

      {/* Interactive 13-Stage Demo Progression Chain */}
      <div style={{ maxWidth: 1100, margin: '0 auto 28px' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Flagship Autonomous Attack Chain Demonstration</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Scenario: <strong style={{ color: 'var(--color-info)' }}>{activeScenario}</strong> · Stage {currentStep >= 0 ? currentStep + 1 : 0} of {FULL_DEMO_SEQUENCE.length}
              </p>
            </div>
            {simulating && (
              <span style={{ padding: '4px 10px', background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical)', color: 'var(--color-critical)', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                SIMULATION PROPAGATING...
              </span>
            )}
          </div>

          {/* 13 Stage Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginTop: 12 }}>
            {FULL_DEMO_SEQUENCE.map((stage, idx) => {
              const isCurrent = idx === currentStep;
              const isPast = idx < currentStep;

              return (
                <motion.div
                  key={stage.id}
                  animate={{
                    scale: isCurrent ? 1.05 : 1,
                    borderColor: isCurrent ? 'var(--cyberdome-red)' : isPast ? 'var(--color-success)' : 'var(--border-primary)',
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 6,
                    background: isCurrent ? 'var(--color-critical-bg)' : isPast ? 'var(--color-success-bg)' : 'var(--bg-elevated)',
                    border: `1px solid ${isCurrent ? 'var(--color-critical-border)' : isPast ? 'var(--color-success-border)' : 'var(--border-primary)'}`,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{stage.icon}</span>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isCurrent ? 'var(--color-critical)' : isPast ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                    {stage.name}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Live Attack Timeline Feed per Section 28 */}
          <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Live Attack Event Stream
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38BDF8' }}>
                Active Telemetry Stream
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {FULL_DEMO_SEQUENCE.slice(0, currentStep + 1).map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 14 }}>
                  <span style={{ color: '#38BDF8' }}>{s.timeOffset}</span>
                  <span style={{ color: '#00E887' }}>[{s.name}]</span>
                  <span style={{ color: '#E2E8F0' }}>{s.desc}</span>
                </div>
              ))}
              {currentStep === -1 && (
                <div style={{ color: '#64748B', fontStyle: 'italic' }}>
                  Press "Run Full Simulation" below to trigger the multi-stage attack timeline sequence.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ maxWidth: 1000, margin: '20px auto 40px', display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          onClick={runFullSimulation}
          disabled={simulating}
          style={{
            padding: '12px 24px',
            borderRadius: 6,
            background: simulating ? 'var(--text-secondary)' : 'var(--cyberdome-red)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: simulating ? 'not-allowed' : 'pointer',
          }}
        >
          {simulating ? 'Executing Attack Sequence...' : '▶ Run Full Multi-Stage Simulation'}
        </button>

        <Link
          href="/digital-twin"
          className="cyber-btn cyber-btn-secondary"
          style={{
            padding: '12px 24px',
            fontSize: '0.95rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>View 3D Digital Twin</span> →
        </Link>

        <button
          onClick={handleSendNotification}
          style={{
            padding: '12px 20px',
            borderRadius: 6,
            background: 'var(--color-info)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Send Email + SMS Alert
        </button>

        <button
          onClick={handleReset}
          className="cyber-btn cyber-btn-secondary"
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={16} />
          <span>Reset Demo Session</span>
        </button>
      </div>
    </div>
  );
}
