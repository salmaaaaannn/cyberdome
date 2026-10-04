// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GlassPanel, MetricCard, RiskBadge, StatusIndicator, DemoBanner, MiniChart } from '@/components/ui';
import { incidentService, networkService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { NetworkEvent } from '@/types';
import {
  Globe,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Clock,
  ExternalLink,
  Radio
} from 'lucide-react';

export default function NetworkPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [incidentNotice, setIncidentNotice] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await networkService.getNetworkEvents();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load network events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useRealtimeEvents((event) => {
    if (event.type === 'network_event' && event.data) {
      setEvents((prev) => [event.data, ...prev.slice(0, 99)]);
    }
  });

  const alerts = events.filter((e) => e.action === 'alert');
  const blocked = events.filter((e) => e.action === 'block');
  const trafficData = events.length > 0
    ? events.slice(0, 12).map((e) => Math.min(100, Math.max(10, Math.floor(((e.bytesIn || 0) + (e.bytesOut || 0)) / 1024))))
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  const filteredEvents = events.filter((e) => {
    const matchesAction = filterAction === 'ALL' || e.action === filterAction;
    const matchesSearch =
      (e.sourceIp && e.sourceIp.includes(searchTerm)) ||
      (e.destIp && e.destIp.includes(searchTerm)) ||
      (e.signature && e.signature.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesAction && matchesSearch;
  });


  const handleEscalateIncident = async (ev: NetworkEvent) => {
    try {
      const inc = await incidentService.createIncident({
        title: `Network Anomaly: ${ev.signature || 'Suspicious Traffic Burst'}`,
        description: `Unusual network egress from ${ev.sourceIp}:${ev.sourcePort} to ${ev.destIp}:${ev.destPort} via ${ev.protocol}.`,
        severity: ev.severity,
        status: 'OPEN',
        assignee: 'Network SOC Analyst',
        affectedAssets: ['srv-web-01'],
        attackVector: 'NETWORK_ANOMALY',
        mitreMapping: ['T1071', 'T1048'],
        timeline: [
          {
            id: 'tl-' + Date.now(),
            timestamp: new Date().toISOString(),
            action: 'Automated Incident Created from Network Telemetry',
            actor: 'Network Detection Engine',
            details: `Identified payload signature: ${ev.signature || 'Exploit probe beaconing'}`,
          },
        ],
        evidence: [
          {
            id: 'ev-' + Date.now(),
            type: 'pcap',
            name: 'Network Flow Trace PCAP',
            description: `Bytes In: ${ev.bytesIn}, Bytes Out: ${ev.bytesOut}`,
            timestamp: new Date().toISOString(),
          },
        ],
        is_demo: true,
      });

      setIncidentNotice(`Incident #${inc.id} created from network alert.`);
      setTimeout(() => setIncidentNotice(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <DemoBanner />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 24px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>Network Detection & Traffic Telemetry</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Deep packet inspection, anomalous traffic flow classification, and automated firewall block response.
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
          <span>View Attack Graph</span> <ArrowRight size={14} />
        </Link>
      </div>

      {incidentNotice && (
        <div style={{ padding: 12, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 6, color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: 20 }}>
          ✓ {incidentNotice}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <MetricCard label="Total Network Events" value={events.length} icon="🌐" />
        <MetricCard label="Active Alerts" value={alerts.length} color="var(--cyberdome-red)" icon="🚨" />
        <MetricCard label="Automated Blocks" value={blocked.length} color="var(--color-warning)" icon="🛑" />
        <MetricCard label="Egress Bandwidth" value={events.length > 0 ? "4.2 Gbps" : "No data available"} icon="📶" color="var(--color-info)" />
      </div>

      {/* Traffic Charts & Protocol Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 20 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700 }}>Network Egress & Ingress Volume</h4>
          <MiniChart data={trafficData} color="var(--color-info)" height={100} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Last 12 hours</span>
            <span>Current Realtime Flow</span>
          </div>
        </div>

        <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 20 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700 }}>Protocol Traffic Distribution</h4>
          {events.length > 0 ? (
            Object.entries(
              events.reduce((acc, e) => {
                const proto = e.protocol || 'Other';
                acc[proto] = (acc[proto] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([name, count], i) => {
              const pct = Math.round(((count as number) / events.length) * 100);
              const colors = ['#0284C7', '#16B364', 'var(--color-warning)', 'var(--cyberdome-red)'];
              return (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, width: '100%', background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 3 }} />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available</div>
          )}
        </div>
      </div>

      {/* Network Events Log Table with Filters */}
      <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', marginTop: 24, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Network Telemetry & Security Events</h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click an event to inspect packet payload evidence or escalate to formal incident response.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['ALL', 'alert', 'block', 'allow'] as const).map((act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: `1px solid ${filterAction === act ? 'var(--cyberdome-red)' : 'var(--border-subtle)'}`,
                  background: filterAction === act ? 'var(--cyberdome-red)' : 'var(--bg-surface)',
                  color: filterAction === act ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Source</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Destination</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Protocol</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Firewall Action</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Severity</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Signature / Threat Lure</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Time</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedEvent(e)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: selectedEvent?.id === e.id ? 'var(--cyberdome-red-subtle)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {e.sourceIp}:{e.sourcePort}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {e.destIp}:{e.destPort}
                    </td>
                    <td style={{ padding: '12px 14px' }}>{e.protocol}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: e.action === 'alert' ? 'var(--color-critical-bg)' : e.action === 'block' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                          color: e.action === 'alert' ? 'var(--cyberdome-red)' : e.action === 'block' ? 'var(--color-warning)' : 'var(--color-success)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {e.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <RiskBadge severity={e.severity} />
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.signature || 'Standard Transmission'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'Recently'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          handleEscalateIncident(e);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--cyberdome-red)',
                          background: 'var(--bg-surface)',
                          color: 'var(--cyberdome-red)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Escalate
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                    No security events yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
