'use client';
import React, { useState } from 'react';
import { GlassPanel, GlowButton, StatusIndicator } from '@/components/ui';
import { fraudCallService } from '@/services';
import { FraudCallResult } from '@/types';

export default function FraudCallCheckPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FraudCallResult | null>(null);

  const handleCheck = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    const query = customPhone || phone;
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    const data = await fraudCallService.checkPhoneNumber(query);
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 960, margin: '0 auto' }}>
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
            PRIVACY PROTECTED
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            — Never records calls. Never monitors conversations. No access to contacts or audio.
          </span>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>SYNTHETIC REPUTATION FEED</span>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
          FRAUD CALL REPUTATION CHECK
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
          Query community intelligence and reported vishing/scam records before answering or returning unknown phone calls.
        </p>
      </div>

      {/* Input Box */}
      <GlassPanel style={{ marginBottom: 24 }}>
        <form onSubmit={handleCheck}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 8 }}>
            ENTER PHONE NUMBER (INTERNATIONAL OR LOCAL FORMAT)
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)',
              padding: '4px 12px',
              gap: 8
            }}>
              <span style={{ fontSize: '1.2rem' }}>📞</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (800) 555-0199 or +91 98765 43210"
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.05rem',
                  padding: '8px 0'
                }}
              />
            </div>
            <GlowButton variant="primary" size="md" type="submit" disabled={loading || !phone.trim()}>
              {loading ? 'Checking...' : 'Check Number'}
            </GlowButton>
          </div>
        </form>

        {/* Quick Test Chips */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>QUICK DEMO TESTS:</span>
          <button
            onClick={() => { setPhone('+1 800 555 0199'); handleCheck(undefined, '+1 800 555 0199'); }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem' }}>
            🔴 Test Reported Scam Number (+1 800 555 0199)
          </button>
          <button
            onClick={() => { setPhone('+1 415 555 2671'); handleCheck(undefined, '+1 415 555 2671'); }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem' }}>
            🟢 Test Clean Verified Number (+1 415 555 2671)
          </button>
        </div>
      </GlassPanel>

      {/* Result Card */}
      {result && (
        <GlassPanel style={{
          borderLeft: `4px solid ${result.riskLevel === 'HIGH_RISK' || result.riskLevel === 'SUSPICIOUS' ? 'var(--cyberdome-red)' : 'var(--color-success)'}`
        }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`badge ${result.riskLevel === 'HIGH_RISK' ? 'badge-critical' : result.riskLevel === 'SUSPICIOUS' ? 'badge-warning' : 'badge-safe'}`}>
                RISK LEVEL: {result.riskLevel.replace('_', ' ')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.1rem' }}>
                {result.reportedNumber}
              </span>
            </div>
            {result.reportCount > 0 && (
              <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                {result.reportCount} COMMUNITY FRAUD REPORTS
              </span>
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: '0.9rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>REASON / THREAT PATTERN:</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
              {result.reason}
            </p>
          </div>

          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: result.riskLevel === 'HIGH_RISK' ? 'rgba(255, 23, 68, 0.08)' : 'rgba(0, 232, 135, 0.08)',
            border: `1px solid ${result.riskLevel === 'HIGH_RISK' ? 'rgba(255, 23, 68, 0.3)' : 'rgba(0, 232, 135, 0.3)'}`,
            borderRadius: 'var(--radius-sm)'
          }}>
            <strong style={{ color: result.riskLevel === 'HIGH_RISK' ? 'var(--cyberdome-red)' : 'var(--color-success)', fontSize: '0.85rem' }}>
              RECOMMENDED ACTION:
            </strong>
            <p style={{ color: 'var(--text-primary)', marginTop: 4, fontSize: '0.85rem' }}>
              {result.recommendedAction}
            </p>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
