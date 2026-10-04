// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GlassPanel, MetricCard, RiskBadge, StatusIndicator, DemoBanner } from '@/components/ui';
import { incidentService, iotService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { IoTDevice } from '@/types';
import {
  Wifi,
  Radio,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Server,
  Zap,
} from 'lucide-react';

export default function IoTPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnomaly, setFilterAnomaly] = useState<'ALL' | 'ANOMALOUS'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [mlHealth, setMlHealth] = useState<any>(null);
  const [mlDetections, setMlDetections] = useState<any[]>([]);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const [data, health] = await Promise.all([
        iotService.getDevices(),
        iotService.getMLHealth().catch(() => null),
      ]);
      if (Array.isArray(data)) {
        setDevices(data);
      }
      if (health) {
        setMlHealth(health);
      }
    } catch (err) {
      console.error('Failed to load IoT devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useRealtimeEvents((event) => {
    if (event.type === 'iot_device_updated' && event.data) {
      setDevices((prev) => {
        const idx = prev.findIndex((d) => d.id === event.data.id || d.mac === event.data.mac);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...event.data };
          return updated;
        }
        return [event.data, ...prev];
      });
    } else if (event.type === 'iot_ml_detection_created' && event.data) {
      setMlDetections((prev) => [event.data, ...prev.slice(0, 9)]);
      setNotice(`New IoT ML Detection: ${event.data.verdict} (${event.data.attack_prediction || 'Threat'}) on ${event.data.deviceName || 'Device'}`);
    }
  });

  const anomalous = devices.filter((d) => (d.anomalies || 0) > 0);
  const critical = devices.filter((d) => d.status === 'CRITICAL');

  const filteredDevices = devices.filter((d) => {
    const nameMatch = d.name ? d.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const ipMatch = d.ip ? d.ip.includes(searchTerm) : false;
    const typeMatch = d.type ? d.type.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchesSearch = nameMatch || ipMatch || typeMatch;
    const matchesAnomaly = filterAnomaly === 'ALL' || (d.anomalies || 0) > 0;
    return matchesSearch && matchesAnomaly;
  });

  const handleIsolateDevice = (id: string) => {
    setDevices(devices.map((d) => (d.id === id ? { ...d, status: 'CRITICAL', anomalies: 0 } : d)));
    setNotice(`Device ${id} network port has been quarantined via 802.1X dynamic VLAN assignment.`);
    setTimeout(() => setNotice(null), 5000);
  };


  const handleEscalateIncident = async (dev: IoTDevice) => {
    try {
      const inc = await incidentService.createIncident({
        title: `IoT Botnet Beaconing Detected: ${dev.name}`,
        description: `Industrial/Corporate device at IP ${dev.ip} exhibited anomalous C2 beaconing pattern. Firmware ${dev.firmware}.`,
        severity: 'HIGH',
        status: 'OPEN',
        assignee: 'IoT Security Team',
        affectedAssets: [dev.name],
        attackVector: 'IOT_EXPLOITATION',
        mitreMapping: ['T1200', 'T1071'],
        timeline: [
          {
            id: 'tl-' + Date.now(),
            timestamp: new Date().toISOString(),
            action: 'Automated Incident Created from IoT Fleet Telemetry',
            actor: 'IoT Security ML Agent',
            details: `Device risk score reached ${dev.riskScore}/100 with ${dev.anomalies} behavioral anomalies.`,
          },
        ],
        evidence: [
          {
            id: 'ev-' + Date.now(),
            type: 'alert',
            name: 'Device Telemetry Snapshot',
            description: `Protocol: ${dev.protocol}, Manufacturer: ${dev.manufacturer}`,
            timestamp: new Date().toISOString(),
          },
        ],
        is_demo: true,
      });

      setNotice(`Incident #${inc.id} generated for IoT device.`);
      setTimeout(() => setNotice(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <DemoBanner />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 24px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>IoT & OT Fleet Security</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Asset discovery, automated protocol profiling, and rogue botnet beaconing detection across smart devices.
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
          <span>View IoT Attack Paths</span> <ArrowRight size={14} />
        </Link>
      </div>

      {notice && (
        <div style={{ padding: 12, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 6, color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: 20 }}>
          ✓ {notice}
        </div>
      )}

      {/* ML Engine Status Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: '0.82rem',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: mlHealth?.status === 'HEALTHY' ? '#16B364' : 'var(--color-warning)' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Module 02 IoT ML Engine:
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {mlHealth ? `${mlHealth.dataset_benchmark} (${mlHealth.feature_count} features, ${mlHealth.label_count} classes)` : 'Loading ML pipeline...'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-muted)' }}>
          <span>Zero Imputation: <strong style={{ color: 'var(--text-primary)' }}>Enforced</strong></span>
          <span>Dual Architecture: <strong style={{ color: 'var(--text-primary)' }}>IsolationForest + XGBoost</strong></span>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <MetricCard label="Total IoT Devices" value={devices.length} icon="📡" color="var(--color-info)" />
        <MetricCard label="Anomalous Devices" value={anomalous.length} icon="⚠" color="var(--color-warning)" />
        <MetricCard label="Critical Risk Nodes" value={critical.length} icon="🔴" color="var(--cyberdome-red)" />
        <MetricCard label="Protocols Monitored" value={devices.length > 0 ? Array.from(new Set(devices.map(d => d.protocol).filter(Boolean))).length : 0} icon="🔗" />
      </div>

      {/* Live Real-time ML Threat Stream (if any) */}
      {mlDetections.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 10 }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyberdome-red)', animation: 'pulse 1.5s infinite' }} />
            Live IoT ML Detection Feed
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {mlDetections.map((det, i) => (
              <div
                key={det.id || i}
                style={{
                  padding: 14,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  borderLeft: '4px solid var(--cyberdome-red)',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{det.deviceName || det.deviceId}</strong>
                  <span style={{ color: 'var(--cyberdome-red)', fontWeight: 700 }}>{det.verdict}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
                  Classification: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{det.attack_prediction || 'Intrusion'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <span>Confidence: {(det.confidence ? det.confidence * 100 : 0).toFixed(1)}%</span>
                  <span>{det.timestamp ? new Date(det.timestamp).toLocaleTimeString() : 'Just now'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 340 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search IoT devices by name, IP, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.85rem', background: 'var(--bg-surface)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setFilterAnomaly('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.78rem',
              fontWeight: 600,
              border: `1px solid ${filterAnomaly === 'ALL' ? 'var(--cyberdome-red)' : 'var(--border-subtle)'}`,
              background: filterAnomaly === 'ALL' ? 'var(--cyberdome-red)' : 'var(--bg-surface)',
              color: filterAnomaly === 'ALL' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            All Devices ({devices.length})
          </button>
          <button
            onClick={() => setFilterAnomaly('ANOMALOUS')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.78rem',
              fontWeight: 600,
              border: `1px solid ${filterAnomaly === 'ANOMALOUS' ? 'var(--cyberdome-red)' : 'var(--border-subtle)'}`,
              background: filterAnomaly === 'ANOMALOUS' ? 'var(--cyberdome-red)' : 'var(--bg-surface)',
              color: filterAnomaly === 'ANOMALOUS' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Anomalies ({anomalous.length})
          </button>
        </div>
      </div>

      {/* IoT Devices Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
        {filteredDevices.length > 0 ? (
          filteredDevices.map((d) => (
          <div key={d.id} className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 18, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h5 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</h5>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{d.type} • {d.manufacturer}</div>
              </div>
              <StatusIndicator status={d.status} label={d.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: 12, borderRadius: 6, marginBottom: 12 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>IP:</span> <span style={{ fontFamily: 'monospace' }}>{d.ip}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Protocol:</span> {d.protocol}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Firmware:</span> {d.firmware}</div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Risk:</span>{' '}
                <span style={{ fontWeight: 700, color: d.riskScore >= 80 ? 'var(--cyberdome-red)' : d.riskScore >= 50 ? 'var(--color-warning)' : '#16B364' }}>
                  {d.riskScore} / 100
                </span>
              </div>
            </div>

            {d.anomalies > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--cyberdome-red)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} />
                <span>Botnet Beaconing: {d.anomalies} outbound micro-bursts detected</span>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {d.anomalies > 0 && (
                <button
                  onClick={() => handleEscalateIncident(d)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid var(--cyberdome-red)',
                    background: 'var(--bg-surface)',
                    color: 'var(--cyberdome-red)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create Incident
                </button>
              )}
              <button
                onClick={() => handleIsolateDevice(d.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Isolate Port
              </button>
            </div>
          </div>
        ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            No security events yet
          </div>
        )}
      </div>
    </div>
  );
}
