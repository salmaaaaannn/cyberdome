'use client';
import React, { useState } from 'react';
import { GlassPanel, RiskBadge, GlowButton } from '@/components/ui';

interface AlertItem {
  id: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  timestamp: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  details: string;
}

const mockAlerts: AlertItem[] = [
  {
    id: 'ALT-4091',
    title: 'New SSH Key Added to Dev Cluster Bastion',
    severity: 'MEDIUM',
    source: 'Identity Governance',
    timestamp: '25 mins ago',
    status: 'PENDING',
    details: 'A new Ed25519 public key was associated with your corporate engineer account on bastion-01.corp.'
  },
  {
    id: 'ALT-4084',
    title: 'Outdated NPM Dependency Detected in Internal Service',
    severity: 'LOW',
    source: 'DevSecOps Pipeline',
    timestamp: '2 hours ago',
    status: 'ACKNOWLEDGED',
    details: 'Repository billing-service uses axios < 1.6.0 which contains minor CSRF vulnerability.'
  }
];

export default function EmployeeAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(mockAlerts);

  const handleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
  };

  const handleResolve = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
          ASSIGNED SECURITY ALERTS
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
          Security alerts and verification tasks assigned to your employee account for review.
        </p>
      </div>

      <GlassPanel>
        <h4 style={{ marginBottom: 16 }}>Pending Alerts Queue ({alerts.filter(a => a.status !== 'RESOLVED').length})</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{
              padding: 16,
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)',
              borderLeft: `4px solid ${alert.severity === 'HIGH' ? 'var(--cyberdome-red)' : alert.severity === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-info)'}`
            }}>
              <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <RiskBadge severity={alert.severity} />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{alert.title}</span>
                </div>
                <span className={`badge ${alert.status === 'PENDING' ? 'badge-warning' : alert.status === 'ACKNOWLEDGED' ? 'badge-info' : 'badge-safe'}`}>
                  {alert.status}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
                {alert.details}
              </div>

              <div className="flex-between" style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Source: {alert.source} · {alert.timestamp}
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                  {alert.status === 'PENDING' && (
                    <button onClick={() => handleAcknowledge(alert.id)} className="btn btn-ghost btn-sm">
                      Acknowledge
                    </button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <button onClick={() => handleResolve(alert.id)} className="btn btn-primary btn-sm">
                      Mark as Verified / Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
