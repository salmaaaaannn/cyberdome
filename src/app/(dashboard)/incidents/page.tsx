// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel, RiskBadge, StatusIndicator, MetricCard } from '@/components/ui';
import { Activity, ShieldAlert, ArrowLeft, Clock, User, Target, FileText, CheckCircle2 } from 'lucide-react';
import { incidentService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadIncidents() {
      try {
        setIsLoading(true);
        const data = await incidentService.getIncidents();
        if (mounted) {
          setIncidents(data || []);
        }
      } catch (err) {
        console.error('Failed to load incidents:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadIncidents();
    return () => { mounted = false; };
  }, []);

  useRealtimeEvents((event) => {
    if (['incident_created', 'incident_updated', 'security_event'].includes(event.type)) {
      incidentService.getIncidents().then((data) => {
        if (Array.isArray(data)) setIncidents(data);
      });
    }
  });


  const selected = incidents.find(i => i.id === selectedId);

  const handleResolve = async (id: string) => {
    try {
      await incidentService.updateIncident(id, { status: 'RESOLVED' });
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'RESOLVED' } : inc));
    } catch (e) {
      console.error('Failed to resolve incident:', e);
    }
  };

  if (selected) {
    return (
      <div className="page-container" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setSelectedId(null)}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: 20 }}>
            <ArrowLeft size={14} />
            <span>Back to Activity & Incidents</span>
          </button>

          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <RiskBadge severity={selected.severity} />
                  <span className={`badge ${selected.status === 'INVESTIGATING' ? 'badge-warning' : selected.status === 'OPEN' ? 'badge-critical' : 'badge-safe'}`}>
                    {selected.status}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                    {selected.id}
                  </span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selected.title}
                </h2>
              </div>

              {selected.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleResolve(selected.id)}
                  className="btn btn-primary btn-sm">
                  Mark as Resolved
                </button>
              )}
            </div>

            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              {selected.description || 'No extended incident description provided.'}
            </p>

            {/* Incident Meta & Timeline Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 20, borderTop: '1px solid var(--border-primary)' }}>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                  CASE METADATA
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lead Assignee:</span>
                    <span style={{ fontWeight: 600 }}>{selected.assigneeId || selected.assignee || 'Unassigned'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Severity Level:</span>
                    <span style={{ fontWeight: 600 }}>{selected.severity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span style={{ fontWeight: 600 }}>{selected.status}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                  INVESTIGATION TIMELINE & EVIDENCE
                </h4>
                {selected.timeline && selected.timeline.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selected.timeline.map((ev: any, idx: number) => (
                      <div key={ev.id || idx} style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.action}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.actor} - {ev.details}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Initial telemetry event logged. No forensic entries attached yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openCount = incidents.filter(i => i.status === 'OPEN').length;
  const investigatingCount = incidents.filter(i => i.status === 'INVESTIGATING').length;
  const containedCount = incidents.filter(i => i.status === 'CONTAINED' || i.status === 'RESOLVED').length;

  return (
    <div className="page-container">
      <div className="flex-between" style={{ margin: '20px 0' }}>
        <div>
          <h3>Security Incidents & SOC Triage</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time security incident response pipeline, forensic timeline evidence, and MITRE mapping.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Total Incidents" value={incidents.length} icon={<Activity size={18} />} color="var(--color-critical)" />
        <MetricCard label="Open Cases" value={openCount} icon={<Clock size={18} />} color="var(--color-warning)" />
        <MetricCard label="Investigating" value={investigatingCount} icon={<ShieldAlert size={18} />} color="var(--color-info)" />
        <MetricCard label="Contained / Resolved" value={containedCount} icon={<CheckCircle2 size={18} />} color="var(--color-success)" />
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            Active Incident Inventory
          </h3>
        </div>

        {isLoading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading company incidents from database...
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <CheckCircle2 size={44} color="var(--color-success)" style={{ marginBottom: 12 }} />
            <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 6 }}>Zero Active Incidents</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 450, margin: '0 auto' }}>
              No security incidents or compromised hosts currently detected in your environment. Real incident events will appear here when telemetry breaches detection thresholds.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>CASE ID</th>
                  <th>INCIDENT TITLE</th>
                  <th>SEVERITY</th>
                  <th>STATUS</th>
                  <th>ASSIGNEE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr key={inc.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyberdome-red, #FF1744)' }}>
                      {inc.id.slice(0, 8)}...
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{inc.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{inc.description?.slice(0, 60)}</div>
                    </td>
                    <td>
                      <RiskBadge severity={inc.severity} />
                    </td>
                    <td>
                      <span className={`badge ${inc.status === 'INVESTIGATING' ? 'badge-warning' : inc.status === 'OPEN' ? 'badge-critical' : 'badge-safe'}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {inc.assigneeId || 'Unassigned'}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedId(inc.id)}
                        className="btn btn-secondary btn-sm">
                        Inspect Case →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
