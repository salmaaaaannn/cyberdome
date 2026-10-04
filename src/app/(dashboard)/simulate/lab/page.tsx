'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Shield, ShieldAlert, ShieldCheck, Activity, Play, Pause, RotateCcw,
  Sliders, Volume2, VolumeX, Terminal, Cpu, Database, Network, Search,
  Download, Filter, ArrowRight, AlertTriangle, Zap, CheckCircle2, Lock,
  Globe, Server, UserX, RefreshCw, Eye, Sparkles, FileText, ChevronRight
} from 'lucide-react';
import {
  SecurityState, SecuritySensitivity, SecuritySimulationEvent,
  SecurityStateTransition, IPManagementEntry, DefenseStrategyComparison
} from '@/types';
import { useAppStore } from '@/stores/appStore';

// Dynamic import of 3D Canvas to avoid SSR issues
const SimulationLab3DScene = dynamic(
  () => import('@/components/3d/SimulationLab3DScene'),
  { ssr: false, loading: () => <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>Loading 3D Attack Pipeline...</div> }
);

// Attack Scenarios
interface ScenarioConfig {
  id: string;
  name: string;
  category: string;
  attackerIP: string;
  targetAsset: string;
  description: string;
  baseEvents: Array<{
    eventType: string;
    source: string;
    target: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    evidence: string;
    riskAdd: number;
    delayMs: number;
  }>;
}

const ATTACK_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'brute-force',
    name: 'Distributed SSH / Credential Brute Force',
    category: 'Credential Access',
    attackerIP: '198.51.100.42',
    targetAsset: 'srv-web-01.dmz',
    description: 'High-frequency credential stuffing targeting edge bastion host and authentication services.',
    baseEvents: [
      { eventType: 'Port Probe (TCP 22)', source: '198.51.100.42', target: 'srv-web-01:22', severity: 'LOW', evidence: 'SYN packet scan from non-whitelisted ASN', riskAdd: 12, delayMs: 600 },
      { eventType: 'Failed Login (root)', source: '198.51.100.42', target: 'auth.service', severity: 'MEDIUM', evidence: 'PAM auth failure: 14 attempts in 3 seconds', riskAdd: 22, delayMs: 1200 },
      { eventType: 'Repeated Failed Auth', source: '198.51.100.42', target: 'auth.service', severity: 'HIGH', evidence: 'Credential dictionary spray detected across 20 usernames', riskAdd: 34, delayMs: 2000 },
      { eventType: 'Credential Anomaly', source: '198.51.100.42', target: 'auth.service', severity: 'HIGH', evidence: 'Compromised service token attempt: svc_backup', riskAdd: 20, delayMs: 2800 },
      { eventType: 'Confirmed Exploit Payload', source: '198.51.100.42', target: 'srv-web-01.dmz', severity: 'CRITICAL', evidence: 'Privilege escalation payload injected via CVE-2024-6387', riskAdd: 25, delayMs: 3600 },
    ],
  },
  {
    id: 'web-exploit',
    name: 'SQL Injection to Remote Code Execution',
    category: 'Web Exploitation',
    attackerIP: '203.0.113.88',
    targetAsset: 'api.cybershield.io',
    description: 'Crafted SQL syntax injected into API endpoints leading to database dump and lateral foothold.',
    baseEvents: [
      { eventType: 'URL Parameter Scan', source: '203.0.113.88', target: 'api.service:443', severity: 'LOW', evidence: 'Automated fuzzing tokens detected in GET /query', riskAdd: 10, delayMs: 600 },
      { eventType: 'SQLi Signature Match', source: '203.0.113.88', target: 'api.service:443', severity: 'MEDIUM', evidence: "Payload: ' UNION SELECT null, username, password_hash FROM users--", riskAdd: 25, delayMs: 1300 },
      { eventType: 'Unusual Outbound DB Volume', source: 'srv-web-01', target: 'db-customer-vault', severity: 'HIGH', evidence: '50,000 records queried in single transaction', riskAdd: 30, delayMs: 2200 },
      { eventType: 'Web Shell Dropper', source: '203.0.113.88', target: 'srv-web-01:/var/www', severity: 'CRITICAL', evidence: 'File written: /tmp/c99.php with execute permissions', riskAdd: 35, delayMs: 3200 },
    ],
  },
  {
    id: 'lateral-movement',
    name: 'Compromised Workstation to Core DB Pivot',
    category: 'Lateral Movement',
    attackerIP: '10.0.14.82',
    targetAsset: 'db-customer-vault',
    description: 'Internal employee machine compromised via spear phishing moving laterally across subnet.',
    baseEvents: [
      { eventType: 'Internal Port Sweep', source: '10.0.14.82', target: '10.0.0.0/24', severity: 'LOW', evidence: 'RPC and SMB port discovery initiated by user workstation', riskAdd: 15, delayMs: 700 },
      { eventType: 'Kerberoasting Ticket Request', source: '10.0.14.82', target: 'ad-controller.local', severity: 'MEDIUM', evidence: 'TGS requested for SPN MSSQLSvc/db01', riskAdd: 28, delayMs: 1500 },
      { eventType: 'Pass-the-Hash Detected', source: '10.0.14.82', target: 'srv-app-02', severity: 'HIGH', evidence: 'NTLM SSP session initiated using stolen admin hash', riskAdd: 30, delayMs: 2400 },
      { eventType: 'Direct Database Exfiltration', source: 'srv-app-02', target: 'db-customer-vault', severity: 'CRITICAL', evidence: 'Unauthorized SELECT on PII table via administrative pipe', riskAdd: 32, delayMs: 3400 },
    ],
  },
];

const INITIAL_IPS: IPManagementEntry[] = [
  { ip: '198.51.100.42', status: 'ALLOWED', threatScore: 88, eventsCount: 42, country: 'RU', lastSeen: 'Just now', reason: 'High-frequency brute force' },
  { ip: '203.0.113.88', status: 'MONITORED', threatScore: 64, eventsCount: 18, country: 'CN', lastSeen: '3 mins ago', reason: 'Web exploit fuzzing' },
  { ip: '10.0.14.82', status: 'MONITORED', threatScore: 45, eventsCount: 7, country: 'INTERNAL', lastSeen: '8 mins ago', reason: 'Suspicious RPC sweep' },
  { ip: '192.0.2.11', status: 'ALLOWED', threatScore: 12, eventsCount: 2, country: 'US', lastSeen: '25 mins ago' },
  { ip: '185.220.101.5', status: 'BLOCKED', threatScore: 95, eventsCount: 120, country: 'NL', lastSeen: '1 hour ago', reason: 'Known Tor Exit Node & Ransomware C2' },
];

export default function SecuritySimulationLabPage() {
  const { user } = useAppStore();

  // State Machine Configuration
  const [sensitivity, setSensitivity] = useState<SecuritySensitivity>('MEDIUM');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioConfig>(ATTACK_SCENARIOS[0]);
  const [simulationStatus, setSimulationStatus] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'>('IDLE');
  const [currentState, setCurrentState] = useState<SecurityState>('NORMAL');
  const [currentRisk, setCurrentRisk] = useState<number>(10);
  const [events, setEvents] = useState<SecuritySimulationEvent[]>([]);
  const [transitions, setTransitions] = useState<SecurityStateTransition[]>([]);
  const [ipList, setIpList] = useState<IPManagementEntry[]>(INITIAL_IPS);
  const [automatedDefenses, setAutomatedDefenses] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);

  // Response Metrics
  const [detectionTimestamp, setDetectionTimestamp] = useState<string | null>(null);
  const [containmentTimestamp, setContainmentTimestamp] = useState<string | null>(null);
  const [responseTimeSec, setResponseTimeSec] = useState<number | null>(null);

  // Filter & Search
  const [logSearch, setLogSearch] = useState('');
  const [logFilterSeverity, setLogFilterSeverity] = useState<string>('ALL');

  // AI Explanation Drawer
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [defenseComparisonModal, setDefenseComparisonModal] = useState(false);

  // Web Audio Synthesizer for subtle security sound cues
  const playSound = useCallback((frequency: number, type: OscillatorType = 'sine', duration: number = 0.15) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // Sensitivity thresholds (Dynamic simulation engine parameter)
  const thresholds = useMemo(() => {
    switch (sensitivity) {
      case 'HIGH':
        return { suspicious: 20, warning: 40, alert: 65, blocked: 80 };
      case 'LOW':
        return { suspicious: 40, warning: 60, alert: 80, blocked: 95 };
      case 'MEDIUM':
      default:
        return { suspicious: 30, warning: 50, alert: 75, blocked: 90 };
    }
  }, [sensitivity]);

  // Deterministic State Transition Calculation (SecurityStateEngine)
  const calculateNextState = useCallback((risk: number): SecurityState => {
    if (risk >= thresholds.blocked) return 'BLOCKED';
    if (risk >= thresholds.alert) return 'ALERT';
    if (risk >= thresholds.warning) return 'WARNING';
    if (risk >= thresholds.suspicious) return 'SUSPICIOUS';
    return 'NORMAL';
  }, [thresholds]);

  // Trigger Automated Defense Simulation when BLOCKED is reached
  const triggerAutomatedDefense = useCallback((threatIp: string) => {
    const defenseActions = [
      `Firewall rule deployed: DROP src ${threatIp} on port 0:65535`,
      `Session revoked: Token token_${Math.random().toString(36).slice(2, 8)} invalidated`,
      `Endpoint quarantined: srv-web-01 isolated from VPC subnet`,
      `Security Incident auto-created: INC-${Date.now().toString().slice(-4)} (P1 CRITICAL)`,
      `Device credential rotation initiated across identity provider`,
    ];

    setAutomatedDefenses(defenseActions);

    // Block IP in IP table
    setIpList(prev => prev.map(entry =>
      entry.ip === threatIp
        ? { ...entry, status: 'BLOCKED', threatScore: 99, reason: 'Automated Defense: Confirmed Exploit Threshold Exceeded' }
        : entry
    ));

    const now = new Date();
    setContainmentTimestamp(now.toLocaleTimeString());
    playSound(440, 'triangle', 0.4);
  }, [playSound]);

  // Execute Simulation Step
  const runSimulationScenario = useCallback(() => {
    if (simulationStatus === 'RUNNING') return;
    setSimulationStatus('RUNNING');
    setCurrentState('NORMAL');
    setCurrentRisk(10);
    setEvents([]);
    setTransitions([]);
    setAutomatedDefenses([]);
    setDetectionTimestamp(null);
    setContainmentTimestamp(null);
    setResponseTimeSec(null);

    const startTime = Date.now();
    let accumulatedRisk = 10;
    let lastState: SecurityState = 'NORMAL';

    selectedScenario.baseEvents.forEach((baseEvent, idx) => {
      const delay = (baseEvent.delayMs / playbackSpeed);

      setTimeout(() => {
        accumulatedRisk = Math.min(100, accumulatedRisk + baseEvent.riskAdd);
        const newState = calculateNextState(accumulatedRisk);

        // Record Transition if state elevated
        if (newState !== lastState) {
          const trans: SecurityStateTransition = {
            id: `trans-${Date.now()}-${idx}`,
            timestamp: new Date().toLocaleTimeString(),
            previousState: lastState,
            newState,
            triggerEvent: baseEvent.eventType,
            riskScore: accumulatedRisk,
            simulationId: `sim-${selectedScenario.id}`,
            reason: `${baseEvent.eventType} contributed +${baseEvent.riskAdd} risk. ${baseEvent.evidence}`,
          };
          setTransitions(t => [trans, ...t]);

          // Sound effect on transition
          if (newState === 'SUSPICIOUS') playSound(520, 'sine', 0.15);
          if (newState === 'WARNING') playSound(580, 'sine', 0.2);
          if (newState === 'ALERT') {
            playSound(680, 'sawtooth', 0.3);
            setDetectionTimestamp(new Date().toLocaleTimeString());
          }
          if (newState === 'BLOCKED') {
            triggerAutomatedDefense(selectedScenario.attackerIP);
            const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
            setResponseTimeSec(parseFloat(totalSec));
          }

          lastState = newState;
        }

        const simEvent: SecuritySimulationEvent = {
          id: `ev-${Date.now()}-${idx}`,
          simulationId: `sim-${selectedScenario.id}`,
          timestamp: new Date().toLocaleTimeString(),
          source: baseEvent.source,
          target: baseEvent.target,
          eventType: baseEvent.eventType,
          severity: baseEvent.severity,
          riskContribution: baseEvent.riskAdd,
          stateBefore: lastState,
          stateAfter: newState,
          evidence: baseEvent.evidence,
          actionTaken: newState === 'BLOCKED' ? 'Automated Defense Barrier Triggered' : undefined,
        };

        setEvents(prev => [simEvent, ...prev]);
        setCurrentRisk(accumulatedRisk);
        setCurrentState(newState);

        if (idx === selectedScenario.baseEvents.length - 1) {
          setSimulationStatus('COMPLETED');
        }
      }, delay);
    });
  }, [simulationStatus, selectedScenario, playbackSpeed, calculateNextState, triggerAutomatedDefense, playSound]);

  // Restart / Reset
  const handleReset = () => {
    setSimulationStatus('IDLE');
    setCurrentState('NORMAL');
    setCurrentRisk(10);
    setEvents([]);
    setTransitions([]);
    setAutomatedDefenses([]);
    setDetectionTimestamp(null);
    setContainmentTimestamp(null);
    setResponseTimeSec(null);
  };

  // Manual IP Toggle
  const handleToggleIpStatus = (ip: string, newStatus: 'ALLOWED' | 'MONITORED' | 'BLOCKED') => {
    setIpList(prev => prev.map(item => item.ip === ip ? { ...item, status: newStatus } : item));
    playSound(newStatus === 'BLOCKED' ? 380 : 600, 'sine', 0.15);
  };

  // Export Logs (JSON or CSV)
  const handleExportLogs = (format: 'json' | 'csv') => {
    if (events.length === 0) {
      alert('No simulation events recorded yet to export.');
      return;
    }
    let content = '';
    let mimeType = 'text/plain';
    let filename = `simulation_logs_${selectedScenario.id}_${Date.now()}`;

    if (format === 'json') {
      content = JSON.stringify(events, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else {
      const headers = ['Timestamp', 'Source', 'Target', 'EventType', 'Severity', 'RiskAdd', 'StateBefore', 'StateAfter', 'Evidence'];
      const rows = events.map(e => [
        e.timestamp, e.source, e.target, `"${e.eventType}"`, e.severity, e.riskContribution, e.stateBefore, e.stateAfter, `"${e.evidence}"`
      ]);
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = 'text/csv';
      filename += '.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch =
        e.eventType.toLowerCase().includes(logSearch.toLowerCase()) ||
        e.source.toLowerCase().includes(logSearch.toLowerCase()) ||
        e.target.toLowerCase().includes(logSearch.toLowerCase()) ||
        e.evidence.toLowerCase().includes(logSearch.toLowerCase());
      const matchesSeverity = logFilterSeverity === 'ALL' || e.severity === logFilterSeverity;
      return matchesSearch && matchesSeverity;
    });
  }, [events, logSearch, logFilterSeverity]);

  // Color for State Badge
  const getStateColor = (state: SecurityState) => {
    switch (state) {
      case 'NORMAL': return { bg: 'var(--color-success-bg)', text: 'var(--color-success)', border: 'var(--color-success-border)' };
      case 'SUSPICIOUS': return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', border: 'var(--color-warning-border)' };
      case 'WARNING': return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', border: '#FDB022' };
      case 'ALERT': return { bg: 'var(--color-critical-bg)', text: 'var(--color-critical)', border: '#FDA29B' };
      case 'BLOCKED': return { bg: 'var(--color-info-bg)', text: 'var(--color-info)', border: 'var(--color-info-border)' };
    }
  };

  const currentTheme = getStateColor(currentState);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--color-critical)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-surface)' }}>
              <Zap size={20} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Security Simulation Lab
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 9999, background: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid var(--color-info-border)' }}>
              DETERMINISTIC STATE ENGINE
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Real-time adversary-vs-defender simulation engine featuring adaptive state transitions, 3D packet telemetry, and automated containment.
          </p>
        </div>

        {/* Master Controls & Sound Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-surface)',
              color: soundEnabled ? 'var(--color-critical)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? 'Audio On' : 'Audio Muted'}
          </button>

          <button
            type="button"
            onClick={() => setDefenseComparisonModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sliders size={16} />
            Compare Defenses
          </button>

          <button
            type="button"
            onClick={() => setShowAiAnalysis(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} style={{ color: '#FDB022' }} />
            Ask CyberDome AI
          </button>
        </div>
      </div>

      {/* SECTION 1: 2D SECURITY STATE MACHINE VISUALIZER */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 14,
          border: '1px solid var(--border-primary)',
          padding: '20px 24px',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Live Security State Machine
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Current State:
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  backgroundColor: currentTheme.bg,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  letterSpacing: '0.04em',
                }}
              >
                {currentState}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                · Dynamic Risk Score: <strong>{currentRisk}/100</strong>
              </span>
            </div>
          </div>

          {/* Adaptive Sensitivity Controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Sensitivity:
            </span>
            <div style={{ display: 'flex', background: 'var(--bg-hover)', padding: 3, borderRadius: 8, gap: 3 }}>
              {(['LOW', 'MEDIUM', 'HIGH'] as SecuritySensitivity[]).map((sens) => (
                <button
                  key={sens}
                  type="button"
                  onClick={() => setSensitivity(sens)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: sensitivity === sens ? 'var(--bg-surface)' : 'transparent',
                    color: sensitivity === sens ? 'var(--color-critical)' : 'var(--text-secondary)',
                    boxShadow: sensitivity === sens ? '0 1px 2px rgba(16, 24, 40, 0.1)' : 'none',
                  }}
                >
                  {sens}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* State Steps Diagram */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { key: 'NORMAL', label: '1. NORMAL', desc: 'Baseline telemetry', thresh: '< 30' },
            { key: 'SUSPICIOUS', label: '2. SUSPICIOUS', desc: 'Anomalous probe', thresh: `≥ ${thresholds.suspicious}` },
            { key: 'WARNING', label: '3. WARNING', desc: 'Repeated auth failure', thresh: `≥ ${thresholds.warning}` },
            { key: 'ALERT', label: '4. ALERT', desc: 'Exploit / credential spray', thresh: `≥ ${thresholds.alert}` },
            { key: 'BLOCKED', label: '5. BLOCKED', desc: 'Automated containment', thresh: `≥ ${thresholds.blocked}` },
          ].map((st, i) => {
            const isActive = currentState === st.key;
            const isPassed =
              (st.key === 'NORMAL') ||
              (st.key === 'SUSPICIOUS' && ['SUSPICIOUS', 'WARNING', 'ALERT', 'BLOCKED'].includes(currentState)) ||
              (st.key === 'WARNING' && ['WARNING', 'ALERT', 'BLOCKED'].includes(currentState)) ||
              (st.key === 'ALERT' && ['ALERT', 'BLOCKED'].includes(currentState)) ||
              (st.key === 'BLOCKED' && currentState === 'BLOCKED');

            return (
              <div
                key={st.key}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: isActive ? '2px solid var(--color-critical)' : isPassed ? '1px solid var(--border-primary)' : '1px dashed var(--border-primary)',
                  background: isActive ? 'var(--color-critical-bg)' : isPassed ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--color-critical)' : isPassed ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border-primary)' }}>
                    {st.thresh}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: isActive ? 'var(--color-critical)' : 'var(--text-muted)' }}>
                  {st.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Transition Reason Display */}
        {transitions.length > 0 && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-critical)', flexShrink: 0 }} />
            <span>
              <strong>Latest State Transition:</strong> {transitions[0].previousState} → <strong>{transitions[0].newState}</strong> — {transitions[0].reason}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 2: 3D ATTACK PIPELINE & PACKET VISUALIZATION */}
      <div
        style={{
          height: 420,
          marginBottom: 24,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        <SimulationLab3DScene
          currentState={currentState}
          activeStepIndex={events.length}
          isDefenseActive={currentState === 'BLOCKED'}
        />
      </div>

      {/* SECTION 3: ATTACKER vs DEFENDER SPLIT WORKSPACE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* LEFT: ATTACKER CONTROLS */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 14,
            border: '1px solid var(--border-primary)',
            padding: 24,
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-critical-bg)', color: 'var(--color-critical)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Terminal size={16} />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Attacker Simulator
              </h2>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              SRC: {selectedScenario.attackerIP}
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Select Attack Vector:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ATTACK_SCENARIOS.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => {
                    if (simulationStatus !== 'RUNNING') setSelectedScenario(sc);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: selectedScenario.id === sc.id ? '2px solid var(--color-critical)' : '1px solid var(--border-primary)',
                    backgroundColor: selectedScenario.id === sc.id ? 'var(--color-critical-bg)' : 'var(--bg-surface)',
                    cursor: simulationStatus === 'RUNNING' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{sc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sc.description}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    {sc.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Playback Controls */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={runSimulationScenario}
              disabled={simulationStatus === 'RUNNING'}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                backgroundColor: simulationStatus === 'RUNNING' ? 'var(--text-muted)' : 'var(--color-critical)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: simulationStatus === 'RUNNING' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Play size={16} />
              {simulationStatus === 'RUNNING' ? 'Simulating Attack...' : 'Launch Simulation'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <div style={{ display: 'flex', border: '1px solid var(--border-primary)', borderRadius: 8, overflow: 'hidden' }}>
              {([1, 2, 4] as const).map(speed => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaybackSpeed(speed)}
                  style={{
                    padding: '8px 10px',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: playbackSpeed === speed ? 'var(--bg-hover)' : 'var(--bg-surface)',
                    color: playbackSpeed === speed ? 'var(--color-critical)' : 'var(--text-secondary)',
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: DEFENDER SOC STATUS */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 14,
            border: '1px solid var(--border-primary)',
            padding: 24,
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-info-bg)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Defender Telemetry & SOC Containment
              </h2>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: currentState === 'BLOCKED' ? 'var(--color-info)' : 'var(--color-warning)' }}>
              STATUS: {currentState === 'BLOCKED' ? 'CONTAINED' : currentState === 'ALERT' ? 'ENGAGING' : 'MONITORING'}
            </span>
          </div>

          {/* Response Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Detection Time</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {detectionTimestamp || '--:--:--'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Containment Time</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {containmentTimestamp || '--:--:--'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Response Latency</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-critical)', marginTop: 2 }}>
                {responseTimeSec ? `${responseTimeSec}s` : '--'}
              </div>
            </div>
          </div>

          {/* Automated Defense Actions List */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} style={{ color: 'var(--color-info)' }} />
              Automated Defense Actions Triggered on BLOCKED:
            </div>
            {automatedDefenses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {automatedDefenses.map((act, idx) => (
                  <div key={idx} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', fontSize: 12, color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed var(--border-primary)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                Waiting for simulation to reach BLOCKED threshold (≥{thresholds.blocked} risk) to fire automated containment playbooks.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: SIMULATION SCORECARD & IP MANAGEMENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
        {/* Attack vs Defense Score */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-primary)', padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={16} style={{ color: 'var(--color-critical)' }} />
            Simulation Scorecard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Attack Pressure:</span>
              <strong style={{ color: 'var(--color-critical)' }}>{currentRisk > 60 ? 'HIGH' : 'MODERATE'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Defense Strength:</span>
              <strong style={{ color: currentState === 'BLOCKED' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {currentState === 'BLOCKED' ? '96% (Containment Active)' : 'Engaged'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Detection Accuracy:</span>
              <strong style={{ color: 'var(--text-primary)' }}>100% (Deterministic)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Risk Prevented:</span>
              <strong style={{ color: 'var(--color-success)' }}>{currentState === 'BLOCKED' ? `${100 - currentRisk}%` : 'Pending'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Assets Protected:</span>
              <strong style={{ color: 'var(--text-primary)' }}>5 / 6 Nodes</strong>
            </div>
          </div>
        </div>

        {/* IP Management & Firewall Simulation */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-primary)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Network size={16} style={{ color: 'var(--color-info)' }} />
              Simulated Firewall IP Management
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Safe simulation only · Real network unaffected
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12 }}>
                  <th style={{ padding: '8px 10px' }}>IP Address</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                  <th style={{ padding: '8px 10px' }}>Threat Score</th>
                  <th style={{ padding: '8px 10px' }}>Events</th>
                  <th style={{ padding: '8px 10px' }}>Reason</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ipList.map((entry) => (
                  <tr key={entry.ip} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{entry.ip}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: entry.status === 'BLOCKED' ? 'var(--color-critical-bg)' : entry.status === 'MONITORED' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                          color: entry.status === 'BLOCKED' ? 'var(--color-critical)' : entry.status === 'MONITORED' ? 'var(--color-warning)' : 'var(--color-success)',
                        }}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: entry.threatScore > 75 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                      {entry.threatScore}/100
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{entry.eventsCount}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>{entry.reason || 'Normal baseline'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleIpStatus(entry.ip, 'ALLOWED')}
                          style={{
                            padding: '3px 7px',
                            borderRadius: 4,
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-surface)',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          Allow
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleIpStatus(entry.ip, 'MONITORED')}
                          style={{
                            padding: '3px 7px',
                            borderRadius: 4,
                            border: '1px solid var(--color-warning-border)',
                            background: 'var(--color-warning-bg)',
                            color: 'var(--color-warning)',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          Monitor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleIpStatus(entry.ip, entry.status === 'BLOCKED' ? 'ALLOWED' : 'BLOCKED')}
                          style={{
                            padding: '3px 7px',
                            borderRadius: 4,
                            border: '1px solid var(--color-critical-border)',
                            background: entry.status === 'BLOCKED' ? 'var(--bg-hover)' : 'var(--color-critical-bg)',
                            color: 'var(--color-critical)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {entry.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 5: REALTIME EVENT LOGS & INVESTIGATION */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 14,
          border: '1px solid var(--border-primary)',
          padding: 24,
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Realtime Security Event Stream & Forensics
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {filteredEvents.length} events feeding the deterministic state machine
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '6px 10px', background: 'var(--bg-surface)', gap: 6 }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search event, IP, evidence..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: 12, width: 180 }}
              />
            </div>

            {/* Severity Filter */}
            <select
              value={logFilterSeverity}
              onChange={(e) => setLogFilterSeverity(e.target.value)}
              style={{ border: '1px solid var(--border-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 12, background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              <option value="ALL">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            {/* Export Buttons */}
            <button
              type="button"
              onClick={() => handleExportLogs('csv')}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-surface)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Download size={13} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => handleExportLogs('json')}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-surface)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Download size={13} />
              JSON
            </button>
          </div>
        </div>

        {/* Events Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, backgroundColor: 'var(--bg-elevated)' }}>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>Source IP</th>
                <th style={{ padding: '10px 12px' }}>Target Asset</th>
                <th style={{ padding: '10px 12px' }}>Event Type</th>
                <th style={{ padding: '10px 12px' }}>Severity</th>
                <th style={{ padding: '10px 12px' }}>State Shift</th>
                <th style={{ padding: '10px 12px' }}>Evidence Forensic</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No events recorded yet. Launch a simulation above to start streaming attack events.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{ev.timestamp}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{ev.source}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{ev.target}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{ev.eventType}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background:
                            ev.severity === 'CRITICAL' ? 'var(--color-critical-bg)' : ev.severity === 'HIGH' ? 'var(--color-critical-bg)' : ev.severity === 'MEDIUM' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                          color:
                            ev.severity === 'CRITICAL' ? 'var(--color-critical)' : ev.severity === 'HIGH' ? 'var(--color-critical)' : ev.severity === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-success)',
                        }}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{ev.stateBefore}</span> → <strong>{ev.stateAfter}</strong>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{ev.evidence}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: AI EXPLANATION DRAWER */}
      {showAiAnalysis && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(16, 24, 40, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 16,
              maxWidth: 640,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} style={{ color: 'var(--color-critical)' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  CyberDome AI Forensic Explanation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiAnalysis(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>1. Attack Sequence Overview</div>
                <div>
                  Adversary originating from <code>{selectedScenario.attackerIP}</code> targeted <strong>{selectedScenario.targetAsset}</strong> through progressive exploit payloads.
                  The scenario evolved through {events.length} telemetry milestones contributing to a peak risk score of {currentRisk}/100.
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>2. State Machine Transition Drivers</div>
                <div>
                  Transition from <code>NORMAL</code> to <code>ALERT</code> occurred upon correlation of repeated failed credentials with confirmed exploit signatures.
                  Adaptive sensitivity is set to <strong>{sensitivity}</strong>, which activated automated boundary lockdown once risk breached the {thresholds.blocked} threshold.
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>3. Automated Defense Effectiveness</div>
                <div>
                  Automated perimeter drop rules isolated the source IP. No data exfiltration was confirmed on the customer vault.
                  Response latency was calculated at <strong>{responseTimeSec || '3.8'} seconds</strong>, preventing lateral pivot into core database assets.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowAiAnalysis(false)}
                className="cyber-btn cyber-btn-primary"
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEFENSE STRATEGY COMPARISON */}
      {defenseComparisonModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(16, 24, 40, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 16,
              maxWidth: 760,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={20} style={{ color: 'var(--color-critical)' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Defense Strategy Counterfactual Comparison
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDefenseComparisonModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>
              Simulate how different enterprise defensive controls alter attack path risk, response time, and containment effectiveness.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, backgroundColor: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '8px 10px' }}>Strategy</th>
                  <th style={{ padding: '8px 10px' }}>Projected Risk</th>
                  <th style={{ padding: '8px 10px' }}>Affected Nodes</th>
                  <th style={{ padding: '8px 10px' }}>Blast Radius</th>
                  <th style={{ padding: '8px 10px' }}>Latency</th>
                  <th style={{ padding: '8px 10px' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Baseline (No Controls)', risk: 94, nodes: 6, blast: 'CRITICAL', latency: '45.0s', success: false },
                  { name: 'Standard Edge Firewall', risk: 62, nodes: 3, blast: 'MEDIUM', latency: '12.4s', success: true },
                  { name: 'Web Application Firewall (WAF)', risk: 38, nodes: 2, blast: 'LOW', latency: '4.2s', success: true },
                  { name: 'MFA + Zero Trust Auth', risk: 24, nodes: 1, blast: 'MINIMAL', latency: '1.8s', success: true },
                  { name: 'Micro-segmentation + SOAR (Active)', risk: 14, nodes: 1, blast: 'CONTAINED', latency: '0.9s', success: true },
                ].map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                    <td style={{ padding: '10px', fontWeight: 700, color: s.risk > 60 ? 'var(--color-critical)' : 'var(--color-success)' }}>{s.risk}/100</td>
                    <td style={{ padding: '10px' }}>{s.nodes} assets</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: s.blast === 'CRITICAL' ? 'var(--color-critical-bg)' : 'var(--bg-hover)', color: s.blast === 'CRITICAL' ? 'var(--color-critical)' : 'var(--text-secondary)' }}>
                        {s.blast}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{s.latency}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.success ? 'var(--color-success)' : 'var(--color-critical)' }}>
                        {s.success ? '✓ Contained' : '✗ Breached'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setDefenseComparisonModal(false)}
                className="cyber-btn cyber-btn-primary"
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
