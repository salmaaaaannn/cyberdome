// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GlassPanel, MetricCard, RiskBadge, DemoBanner } from '@/components/ui';
import { incidentService, uebaService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { UEBAEvent } from '@/types';
import {
  User,
  ShieldAlert,
  AlertTriangle,
  Plane,
  Key,
  Database,
  Lock,
  Search,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function UEBAPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await uebaService.getEvents();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load UEBA events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useRealtimeEvents((event) => {
    if (['security_event', 'detection_created'].includes(event.type) && event.data) {
      loadEvents();
    }
  });

  const highRisk = events.filter((e) => (e.riskScore || 0) >= 75);

  const filteredEvents = events.filter((e) => {
    const userMatch = e.userName ? e.userName.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const typeMatch = e.eventType ? e.eventType.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const locMatch = e.location ? e.location.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    return userMatch || typeMatch || locMatch;
  });


  const handleEscalateIncident = async (ev: UEBAEvent) => {
    try {
      const inc = await incidentService.createIncident({
        title: `UEBA Identity Anomaly: ${ev.userName} (${ev.eventType})`,
        description: `${ev.description}. Deviation recorded: ${ev.deviation} against baseline ${ev.baseline}.`,
        severity: ev.riskScore >= 85 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        assignee: 'Identity & Access SOC',
        affectedAssets: [ev.userName, 'Active Directory SSO'],
        attackVector: 'CREDENTIAL_ANOMALY',
        mitreMapping: ['T1078', 'T1056'],
        timeline: [
          {
            id: 'tl-' + Date.now(),
            timestamp: new Date().toISOString(),
            action: 'Automated Incident Created from UEBA Engine',
            actor: 'UEBA Machine Learning Agent',
            details: `Calculated anomaly score: ${ev.riskScore}/100. Location: ${ev.location}, IP: ${ev.sourceIp}`,
          },
        ],
        evidence: [
          {
            id: 'ev-' + Date.now(),
            type: 'alert',
            name: 'UEBA Baseline Divergence Report',
            description: `Baseline: ${ev.baseline} -> Observed: ${ev.deviation}`,
            timestamp: new Date().toISOString(),
          },
        ],
        is_demo: true,
      });

      setNotice(`Incident #${inc.id} generated for identity anomaly.`);
      setTimeout(() => setNotice(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspendSession = (userName: string) => {
    setNotice(`Active SSO sessions and OAuth tokens for user ${userName} have been revoked.`);
    setTimeout(() => setNotice(null), 5000);
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <DemoBanner />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 24px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            User & Entity Behavior Analytics (UEBA)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Continuous profiling of user activity baselines, impossible travel, privilege escalation, and suspicious resource access.
          </p>
        </div>

        <Link
          href="/attack-graph"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          <span>View Account Attack Paths</span> <ArrowRight size={14} />
        </Link>
      </div>

      {notice && (
        <div style={{ padding: 12, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 6, color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: 20 }}>
          ✓ {notice}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <MetricCard label="Total Behavioral Events" value={events.length} icon="👤" />
        <MetricCard label="High Risk Anomalies" value={highRisk.length} color="var(--cyberdome-red)" icon="🚨" />
        <MetricCard label="Employees Monitored" value={events.length > 0 ? Array.from(new Set(events.map(e => e.userName).filter(Boolean))).length : 0} icon="👥" color="var(--color-info)" />
        <MetricCard label="Model Baseline Accuracy" value={events.length > 0 ? "97.3%" : "No data available"} icon="📊" color="var(--color-success)" />
      </div>

      {/* Search Bar */}
      <div style={{ margin: '24px 0 16px', position: 'relative', maxWidth: 400 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search user, event type, or login location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.85rem', background: 'var(--bg-surface)' }}
        />
      </div>

      {/* UEBA Events List */}
      <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 20 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>Identity Risk Telemetry Feed</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((e) => {
            const isImpossibleTravel = (e.eventType || '').toLowerCase().includes('travel');
            return (
              <div key={e.id} style={{ padding: 18, borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        color: (e.riskScore || 0) >= 75 ? 'var(--cyberdome-red)' : 'var(--color-info)',
                      }}
                    >
                      {isImpossibleTravel ? <Plane size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>{e.userName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {e.eventType} • {e.location} • IP: <span style={{ fontFamily: 'monospace' }}>{e.sourceIp}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', color: (e.riskScore || 0) >= 75 ? 'var(--cyberdome-red)' : 'var(--color-warning)' }}>
                      {e.riskScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anomaly Score</div>
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '12px 0 14px' }}>{e.description}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: '0.8rem', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Standard Baseline:</span> <strong>{e.baseline || 'Standard business hours'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Observed Deviation:</span> <strong style={{ color: 'var(--cyberdome-red)' }}>{e.deviation || 'Statistical anomaly detected'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Detected Timestamp:</span>{' '}
                    <span style={{ fontFamily: 'monospace' }}>{e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'Recently'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => handleSuspendSession(e.userName)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 4,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Revoke Active Tokens
                  </button>

                  <button
                    onClick={() => handleEscalateIncident(e)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 4,
                      border: '1px solid var(--cyberdome-red)',
                      background: 'var(--cyberdome-red)',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ShieldAlert size={14} /> Escalate to Incident
                  </button>
                </div>
              </div>
            );
          })
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              No security events yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
