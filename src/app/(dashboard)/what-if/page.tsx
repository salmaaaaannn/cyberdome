// @ts-nocheck
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel, DemoBanner, MetricCard, GlowButton, RiskBadge, StatusIndicator } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { soarService, incidentService, notificationEngineService } from '@/services';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Bell,
  Cpu,
  Eye,
  ArrowRight,
  Database,
  ExternalLink,
  Flame,
} from 'lucide-react';

export default function WhatIfPage() {
  const { user, triggerWhatIfPropagation, resetWhatIfPropagation, activeSimulation } = useAppStore();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);

  React.useEffect(() => {
    soarService.getPlaybooks().then(playbooks => {
      const mapped = playbooks.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: 'sim',
        targetAsset: 'ast-unknown',
        steps: p.steps?.map((s: any, i: number) => ({
          id: s.id || `step-${i}`,
          order: i + 1,
          name: s.name || s.action,
          description: s.description || '',
          status: 'pending',
          affectedNodes: []
        })) || [],
        currentRisk: 50,
        projectedRisk: 80,
        affectedAssets: [],
        criticalAssets: [],
        blastRadius: 2,
        is_demo: false,
      }));
      setScenarios(mapped);
      if (mapped.length > 0) setSelectedScenario(mapped[0]);
    });
  }, []);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // User actions feedback
  const [incidentCreated, setIncidentCreated] = useState<string | null>(null);
  const [notificationDispatched, setNotificationDispatched] = useState<string | null>(null);

  const runSimulation = () => {
    setRunning(true);
    setCompleted(false);
    setCurrentStep(0);
    setIncidentCreated(null);
    setNotificationDispatched(null);

    // Initial propagation trigger into global store
    triggerWhatIfPropagation(
      selectedScenario.id,
      selectedScenario.affectedAssets,
      selectedScenario.projectedRisk,
      selectedScenario.blastRadius
    );

    const totalSteps = selectedScenario.steps.length;
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      if (step >= totalSteps) {
        clearInterval(interval);
        setRunning(false);
        setCompleted(true);
        setCurrentStep(totalSteps - 1);
      } else {
        setCurrentStep(step);
      }
    }, 1100);
  };

  const handleCreateIncident = async () => {
    try {
      const inc = await incidentService.createIncident({
        title: `Simulated Breach: ${selectedScenario.name}`,
        description: `What-If attack scenario simulation detected viable lateral movement to critical assets. Blast radius: ${selectedScenario.blastRadius} nodes.`,
        severity: 'CRITICAL',
        status: 'OPEN',
        assignee: user?.name || 'SOC Analyst',
        affectedAssets: selectedScenario.affectedAssets,
        attackVector: selectedScenario.type.toUpperCase(),
        mitreMapping: ['T1190', 'T1059', 'T1021'],
        timeline: [
          {
            id: 'tl-' + Date.now(),
            timestamp: new Date().toISOString(),
            action: 'What-If Simulation Escalated',
            actor: user?.name || 'Simulation Engine',
            details: `Automated incident created from blast radius simulation. Initial risk: ${selectedScenario.currentRisk}, projected: ${selectedScenario.projectedRisk}`,
          },
        ],
        evidence: [
          {
            id: 'ev-' + Date.now(),
            type: 'alert',
            name: 'Blast Radius Vector Report',
            description: `Affected target assets: ${selectedScenario.affectedAssets.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
        ],
        is_demo: true,
      });

      setIncidentCreated(`Incident #${inc.id} successfully generated from What-If simulation.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendNotification = async () => {
    try {
      const res = await notificationEngineService.dispatchSecurityEvent({
        userId: user?.id || 'usr-admin-01',
        userName: user?.name || 'Khan Salman',
        userEmail: user?.email || 'admin@cybersafety.io',
        userPhone: user?.phone || '+1 (555) 019-2831',
        eventId: 'EVT-SIM-' + Date.now(),
        eventTitle: `Simulation Alert: ${selectedScenario.name}`,
        eventType: 'ATTACK_SIMULATION',
        channel: 'email',
        isSimulation: true,
      });

      if (res.status === 'DELIVERED') {
        setNotificationDispatched('Simulated security notification dispatched to your email and audit logs.');
      } else {
        setNotificationDispatched(`Notification suppressed: ${res.reason}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <DemoBanner />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '20px 0', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>What-If Attack Simulator</h3>
            <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'var(--color-critical-bg)', color: 'var(--cyberdome-red)', borderRadius: 4, fontWeight: 700 }}>
              SIMULATED / PROJECTED
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Select an adversarial breach scenario, calculate the cascaded blast radius, and propagate projected risk directly to the Digital Twin.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/digital-twin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 6,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Cpu size={16} color="var(--cyberdome-red)" />
            <span>Open 3D Digital Twin</span>
          </Link>

          {activeSimulation && (
            <button
              onClick={() => {
                resetWhatIfPropagation();
                setCompleted(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 6,
                background: 'var(--bg-subtle)',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} />
              <span>Reset State</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Scenario List */}
        <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 18 }}>
          <h5 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700 }}>Simulation Scenarios</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedScenario(s);
                  setCompleted(false);
                  setCurrentStep(0);
                  setIncidentCreated(null);
                  setNotificationDispatched(null);
                }}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: selectedScenario?.id === s.id ? '2px solid var(--cyberdome-red)' : '1px solid var(--border-subtle)',
                  background: selectedScenario?.id === s.id ? 'var(--cyberdome-red-subtle)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'capitalize' }}>
                  {s.type} • {s.steps.length} Attack Steps
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation Execution Panel */}
        <div>
          {selectedScenario ? (
            <>
              <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{selectedScenario.name}</h4>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedScenario.description}</p>
                  </div>

                  <button
                    onClick={runSimulation}
                    disabled={running}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 20px',
                      borderRadius: 6,
                      background: running ? 'var(--text-muted)' : 'var(--cyberdome-red)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: running ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Play size={16} />
                    <span>{running ? 'Propagating Attack...' : 'Run What-If Simulation'}</span>
                  </button>
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Baseline Risk</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)', marginTop: 4 }}>{selectedScenario.currentRisk}</div>
                  </div>

                  <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projected Risk</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyberdome-red)', marginTop: 4 }}>
                      {completed ? selectedScenario.projectedRisk : '—'}
                    </div>
                  </div>

                  <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Affected Assets</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                      {completed ? selectedScenario.affectedAssets.length : '—'}
                    </div>
                  </div>

                  <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blast Radius Nodes</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyberdome-red)', marginTop: 4 }}>
                      {completed ? selectedScenario.blastRadius : '—'}
                    </div>
                  </div>
                </div>

                {/* Timeline Steps */}
                <h5 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700 }}>Attack Kill-Chain Propagation Steps</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedScenario.steps.map((step, i) => {
                    const isActive = running && i === currentStep;
                    const isDone = completed || (running && i < currentStep);

                    return (
                      <motion.div
                        key={step.id}
                        animate={{ opacity: isDone || isActive ? 1 : 0.4 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 6,
                          background: isActive ? 'rgba(247, 144, 9, 0.08)' : isDone ? 'rgba(22, 179, 100, 0.06)' : 'var(--bg-subtle)',
                          border: `1px solid ${isActive ? 'var(--color-warning)' : isDone ? '#16B364' : 'var(--border-subtle)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isDone ? '#16B364' : isActive ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                            {isDone ? '✓ ' : isActive ? '⚡ ' : `${i + 1}. `} {step.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{step.description}</div>
                        </div>

                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isDone ? '#16B364' : isActive ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                          {isDone ? 'Complete' : isActive ? 'Simulating...' : 'Pending'}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Simulation Completed Actions & Blast Radius */}
              {completed && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Blast Radius — Compromised Infrastructure</h5>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          These assets would be affected based on current trust relationships and exploit paths.
                        </p>
                      </div>
                      <Link
                        href="/digital-twin"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--cyberdome-red)',
                          textDecoration: 'none',
                        }}
                      >
                        <span>View Glowing in 3D Digital Twin</span> <ArrowRight size={14} />
                      </Link>
                    </div>

                    {/* Compromised Assets Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
                      {selectedScenario.affectedAssets.map((aId) => {
                        const asset = [].find((a) => a.id === aId);
                        if (!asset) return null;
                        return (
                          <div key={aId} style={{ padding: 12, borderRadius: 6, background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{asset.name}</span>
                              <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'var(--cyberdome-red)', color: '#FFFFFF', borderRadius: 4, fontWeight: 700 }}>
                                COMPROMISED
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
                              {asset.ip} • Risk {asset.riskScore}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Notifications feedback */}
                    {incidentCreated && (
                      <div style={{ padding: 12, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 6, color: 'var(--color-success)', fontSize: '0.82rem', marginBottom: 16 }}>
                        ✓ {incidentCreated}
                      </div>
                    )}
                    {notificationDispatched && (
                      <div style={{ padding: 12, background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 6, color: 'var(--color-info)', fontSize: '0.82rem', marginBottom: 16 }}>
                        ℹ {notificationDispatched}
                      </div>
                    )}

                    {/* Operational Response Actions */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button
                        onClick={handleCreateIncident}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 6,
                          background: 'var(--cyberdome-red)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <ShieldAlert size={14} /> Create Formal Incident
                      </button>

                      <button
                        onClick={handleSendNotification}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 6,
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Bell size={14} /> Dispatch Simulated Alert
                      </button>

                      <Link
                        href={`/ai?context=scenario-${selectedScenario.id}`}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 6,
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>Ask AI Copilot for Remediation</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading scenarios or none available. Please ensure playbooks are created in SOAR.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
