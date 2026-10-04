'use client';
import React, { useState } from 'react';
import { GlassPanel, GlowButton, StatusIndicator } from '@/components/ui';
import { urlSafetyService } from '@/services';
import { URLCheckResult } from '@/types';

export default function URLSafetyCheckerPage() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<URLCheckResult | null>(null);

  const handleCheck = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const query = customUrl || urlInput;
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    const data = await urlSafetyService.checkUrl(query);
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Top Banner with precise security language */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(0, 184, 255, 0.06)',
        border: '1px solid rgba(0, 184, 255, 0.25)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusIndicator status="ONLINE" />
          <span style={{ fontSize: '0.82rem', color: 'var(--color-info)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            PASSIVE URL REPUTATION & CERTIFICATE INSPECTION
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            — Evaluates domain age, redirects, TLS cipher validity, and global phishing blacklists.
          </span>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>SYNTHETIC DEMO</span>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
          URL SAFETY CHECKER
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
          Analyze unknown web addresses before opening to protect against phishing lookalikes and credential harvesters.
        </p>
      </div>

      <GlassPanel style={{ marginBottom: 24 }}>
        <form onSubmit={handleCheck}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 8 }}>
            TARGET URL TO ANALYZE
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
              <span style={{ fontSize: '1.2rem' }}>🔗</span>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com or http://suspicious-login.xyz"
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  padding: '8px 0'
                }}
              />
            </div>
            <GlowButton variant="primary" size="md" type="submit" disabled={loading || !urlInput.trim()}>
              {loading ? 'Analyzing...' : 'Check URL'}
            </GlowButton>
          </div>
        </form>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>QUICK SAMPLES:</span>
          <button
            onClick={() => { setUrlInput('https://update-bank-security-login.xyz/portal'); handleCheck(undefined, 'https://update-bank-security-login.xyz/portal'); }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem' }}>
            🔴 Test Phishing Lure Link (.xyz)
          </button>
          <button
            onClick={() => { setUrlInput('https://github.com'); handleCheck(undefined, 'https://github.com'); }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem' }}>
            🟢 Test Legitimate Site (github.com)
          </button>
        </div>
      </GlassPanel>

      {/* Results Card */}
      {result && (
        <GlassPanel style={{
          borderLeft: `4px solid ${result.verdict === 'DANGEROUS' || result.verdict === 'SUSPICIOUS' ? 'var(--cyberdome-red)' : 'var(--color-success)'}`
        }}>
          <div className="flex-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`badge ${result.verdict === 'DANGEROUS' ? 'badge-critical' : result.verdict === 'SUSPICIOUS' ? 'badge-warning' : 'badge-safe'}`}>
                VERDICT: {result.verdict === 'SAFE' ? 'NO KNOWN THREAT DETECTED' : result.verdict}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {result.domain}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Reputation Score: <strong style={{ color: result.domainReputationScore >= 70 ? 'var(--color-success)' : 'var(--cyberdome-red)' }}>{result.domainReputationScore}/100</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 4 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HTTPS ENCRYPTION</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 4, color: result.httpsValid ? 'var(--color-success)' : 'var(--cyberdome-red)' }}>
                {result.httpsValid ? '✓ Valid HTTPS' : '⚠ Missing / Invalid TLS'}
              </div>
            </div>
            <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 4 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CERTIFICATE AUTHORITY</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                {result.certificateStatus}
              </div>
            </div>
            <div style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 4 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REDIRECT HOPS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                {result.redirectChain.length} hop(s)
              </div>
            </div>
          </div>

          {result.phishingIndicators.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--cyberdome-red)' }}>DETECTED PHISHING INDICATORS:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {result.phishingIndicators.map((ind, i) => (
                  <span key={i} className="badge badge-critical" style={{ fontSize: '0.75rem' }}>
                    ⚠ {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.85rem', marginTop: 12 }}>
            <strong>ANALYSIS SUMMARY:</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
              {result.reason}
            </p>
          </div>

          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: result.verdict === 'DANGEROUS' ? 'rgba(255, 23, 68, 0.08)' : 'rgba(0, 232, 135, 0.08)',
            border: `1px solid ${result.verdict === 'DANGEROUS' ? 'rgba(255, 23, 68, 0.3)' : 'rgba(0, 232, 135, 0.3)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem'
          }}>
            <strong style={{ color: result.verdict === 'DANGEROUS' ? 'var(--cyberdome-red)' : 'var(--color-success)' }}>
              RECOMMENDED ACTION:
            </strong>
            <p style={{ color: 'var(--text-primary)', marginTop: 4 }}>
              {result.recommendedAction}
            </p>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
