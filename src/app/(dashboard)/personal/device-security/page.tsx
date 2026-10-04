'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel, GlowButton, StatusIndicator, SecurityScore } from '@/components/ui';
import { deviceSecurityService } from '@/services';
import { DeviceSecurityAudit } from '@/types';

export default function DeviceSecurityPage() {
  const [audit, setAudit] = useState<DeviceSecurityAudit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    deviceSecurityService.getDeviceAudit().then(setAudit);
  }, []);

  const handleRunAudit = async () => {
    setLoading(true);
    const data = await deviceSecurityService.getDeviceAudit();
    setAudit(data);
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Privacy Guarantee Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(0, 232, 135, 0.06)',
        border: '1px solid rgba(0, 232, 135, 0.25)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusIndicator status="SAFE" />
          <span style={{ fontSize: '0.82rem', color: 'var(--color-success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            NON-SURVEILLANCE GUARANTEE
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            — No access to microphone, camera, contacts, private files, or location. Authorized configuration audit only.
          </span>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>SYNTHETIC AUDIT</span>
      </div>

      <div className="flex-between" style={{ marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
            DEVICE SECURITY CHECK
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
            Verify your operating system security patch level, screen locks, hardware encryption, and browser protection.
          </p>
        </div>
        <GlowButton variant="primary" size="md" onClick={handleRunAudit} disabled={loading}>
          {loading ? 'Auditing...' : 'Re-Run Device Check'}
        </GlowButton>
      </div>

      {/* Overall Score Card */}
      {audit && (
        <GlassPanel style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <SecurityScore score={audit.score} size={96} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>OVERALL DEVICE POSTURE</div>
            <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-warning)', marginTop: 4 }}>
              {audit.overallStatus.replace('_', ' ')} ({audit.score}/100)
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 500 }}>
              Your device has robust disk encryption and authentication enabled. Address the browser safe browsing and stealth mode recommendations below to reach a perfect score.
            </p>
          </div>
        </GlassPanel>
      )}

      {/* Checks List */}
      <GlassPanel>
        <h4 style={{ marginBottom: 16 }}>Security Baseline Checks</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {audit?.checks.map(chk => (
            <div key={chk.id} style={{
              padding: 16,
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)',
              borderLeft: `4px solid ${chk.status === 'SAFE' ? 'var(--color-success)' : 'var(--color-warning)'}`
            }}>
              <div className="flex-between" style={{ marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    {chk.category}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: 2 }}>{chk.name}</div>
                </div>
                <span className={`badge ${chk.status === 'SAFE' ? 'badge-safe' : 'badge-warning'}`}>
                  {chk.status}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                {chk.details}
              </div>

              {chk.recommendedFix && (
                <div style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  background: 'rgba(255, 176, 32, 0.08)',
                  border: '1px solid rgba(255, 176, 32, 0.25)',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  color: 'var(--color-warning)'
                }}>
                  <strong>Recommended Fix:</strong> {chk.recommendedFix}
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
