'use client';
import React from 'react';
import { GlassPanel, StatusIndicator, SecurityScore } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';

export default function MySecurityPage() {
  const { user } = useAppStore();

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
          MY SECURITY & WORKSTATION HEALTH
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
          Assigned device compliance, credential strength, and corporate security policy adherence.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <GlassPanel style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SecurityScore score={95} size={84} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>COMPLIANCE SCORE</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-success)', marginTop: 2 }}>95/100 · High</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Fully policy compliant</div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>MFA STATUS</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-success)', marginTop: 4 }}>
            Hardware FIDO2 Enforced
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            YubiKey Security Key verified for all corporate SSO logins.
          </p>
        </GlassPanel>
      </div>

      <GlassPanel>
        <h4 style={{ marginBottom: 16 }}>Workstation Compliance Telemetry</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="flex-between" style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Full Disk Encryption (BitLocker / FileVault)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hardware TPM 2.0 active. All data partitions encrypted at rest.</div>
            </div>
            <span className="badge badge-safe">ACTIVE</span>
          </div>

          <div className="flex-between" style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>EDR Endpoint Agent</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CyberDome Agent v4.8.1 running in real-time kernel interception mode.</div>
            </div>
            <span className="badge badge-safe">HEALTHY</span>
          </div>

          <div className="flex-between" style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Zero Trust Network Access (ZTNA)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Continuous posture assessment enabled for dev and production clusters.</div>
            </div>
            <span className="badge badge-safe">CONNECTED</span>
          </div>

          <div className="flex-between" style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Corporate Password Age</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last rotated 14 days ago. Complexity policy satisfied.</div>
            </div>
            <span className="badge badge-safe">GOOD</span>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
