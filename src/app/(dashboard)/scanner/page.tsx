'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  SecurityScore,
  RiskBadge,
  DemoBanner,
  CyberTabs
} from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  FileText,
  Clock,
  ShieldCheck,
  Server
} from 'lucide-react';

interface FindingCard {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  affectedAsset: string;
  evidence: string;
  cveId?: string;
  remediationSnippet?: string;
}

const mockScanFindings: FindingCard[] = [
  {
    id: 'vf-1',
    severity: 'CRITICAL',
    title: 'React Server Action Payload Deserialization',
    description: 'Potential untrusted object deserialization in Server Action router for unauthenticated calls.',
    impact: 'High — Remote process disruption or memory integrity corruption.',
    recommendation: 'Upgrade Node.js and React framework packages to patched release (>= 19.0.2).',
    affectedAsset: 'https://example.com/api/actions',
    evidence: 'Header Server: Node.js/18.16.0 detected with unvalidated deserialization signature.',
    cveId: 'CVE-2026-11892',
    remediationSnippet: 'npm update react react-dom next'
  },
  {
    id: 'vf-2',
    severity: 'HIGH',
    title: 'Missing Content Security Policy (CSP)',
    description: 'Your website does not define an appropriate Content-Security-Policy HTTP response header.',
    impact: 'High — Exposes users to cross-site scripting (XSS) and data injection risks.',
    recommendation: 'Configure CSP headers with strict script-src and object-src directives.',
    affectedAsset: 'https://example.com',
    evidence: 'HTTP/2 200 OK — Header Content-Security-Policy is absent in initial HTML payload.',
    remediationSnippet: "Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com;"
  },
  {
    id: 'vf-3',
    severity: 'MEDIUM',
    title: 'Session Cookie Missing SameSite=Strict Attribute',
    description: 'The authentication session identifier cookie defaults to SameSite=Lax.',
    impact: 'Medium — Increases susceptibility to cross-site request forgery in secondary browser contexts.',
    recommendation: 'Update cookie configuration to enforce SameSite=Strict for authenticated session tokens.',
    affectedAsset: 'auth.example.com',
    evidence: 'Set-Cookie: session_id=abc...; Path=/; Secure; HttpOnly; SameSite=Lax',
    remediationSnippet: 'Set-Cookie: session_id=...; Secure; HttpOnly; SameSite=Strict'
  },
  {
    id: 'vf-4',
    severity: 'LOW',
    title: 'DNSSEC Cryptographic Records Absent',
    description: 'Authoritative DNS zone lacks DNSSEC cryptographic RRSIG and DS validation records.',
    impact: 'Low — Permits theoretical DNS answer tampering by rogue resolver caches.',
    recommendation: 'Enable DNSSEC signing with registrar and publish DS record to parent registry.',
    affectedAsset: 'example.com',
    evidence: 'DNS query for example.com DS returned NOERROR with 0 answer records.'
  }
];

export default function ScannerPage() {
  const { websiteAssessmentTarget, setWebsiteAssessmentTarget } = useAppStore();
  const [targetUrl, setTargetUrl] = useState(websiteAssessmentTarget || 'https://example.com');
  const [scanType, setScanType] = useState<'quick' | 'full'>('full');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [scanCompleted, setScanCompleted] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<FindingCard | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'evidence' | 'remediation'>('overview');

  const SCAN_STEPS = [
    'Checking security headers (CSP, HSTS, X-Frame-Options)...',
    'Checking SSL/TLS cipher suites and certificate chain...',
    'Analyzing exposed public ports and services...',
    'Matching known vulnerability intelligence and CVEs...'
  ];

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanCompleted(false);
    setWebsiteAssessmentTarget(targetUrl);

    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setCurrentStep(SCAN_STEPS[i]);
      setScanProgress(Math.round(((i + 1) / SCAN_STEPS.length) * 100));
      await new Promise(r => setTimeout(r, 600));
    }

    setIsScanning(false);
    setScanCompleted(true);
  };

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <DemoBanner />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Website Security Scanner
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', marginTop: 4 }}>
          Safe, non-destructive external security assessment for web applications, APIs, and domains.
        </p>
      </div>

      {/* Prominent Scan Input Card */}
      <div className="glass-panel" style={{ marginBottom: 32 }}>
        <form onSubmit={handleStartScan}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
            Website URL
          </label>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              padding: '6px 14px',
              gap: 10
            }}>
              <Globe size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isScanning}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14.5,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isScanning || !targetUrl.trim()}
              className="btn btn-primary btn-lg">
              {isScanning ? 'Scanning...' : 'Start Security Scan'}
            </button>
          </div>

          {/* Scan Options Radios */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              <input
                type="radio"
                name="scanType"
                checked={scanType === 'quick'}
                onChange={() => setScanType('quick')}
              />
              <span>Quick Scan (Headers & TLS inspection)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              <input
                type="radio"
                name="scanType"
                checked={scanType === 'full'}
                onChange={() => setScanType('full')}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Full Security Assessment (Recommended)</span>
            </label>
          </div>
        </form>

        {/* Progress Bar during Scanning */}
        {isScanning && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                {currentStep}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyberx-red)', fontFamily: 'var(--font-mono)' }}>
                {scanProgress}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="fill" style={{ width: `${scanProgress}%`, backgroundColor: 'var(--color-critical)' }} />
            </div>
          </div>
        )}
      </div>

      {/* SCAN RESULTS SECTION */}
      {scanCompleted && !isScanning && (
        <div>
          {/* Results Summary Header Card */}
          <div className="glass-panel" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-safe">SCAN COMPLETED</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tested 2 minutes ago</span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
                  Security Assessment — <span style={{ color: 'var(--color-info)' }}>{targetUrl.replace(/https?:\/\//, '')}</span>
                </h2>
              </div>

              {/* Circular Security Score (82/100) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, backgroundColor: 'var(--bg-elevated)', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                <SecurityScore score={82} size={68} showLabel={false} />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>SECURITY SCORE</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>82 / 100</div>
                  <div style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 500 }}>Good baseline</div>
                </div>
              </div>
            </div>

            {/* Findings Count Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-primary)' }}>
              <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-critical-bg)', borderRadius: 8, border: '1px solid var(--color-critical-border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-critical)' }}>CRITICAL FINDINGS</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-critical)', marginTop: 2 }}>2</div>
              </div>
              <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-warning-bg)', borderRadius: 8, border: '1px solid var(--color-warning-border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-warning)' }}>HIGH RISK</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-warning)', marginTop: 2 }}>5</div>
              </div>
              <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-warning-bg)', borderRadius: 8, border: '1px solid var(--color-warning-border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-warning)' }}>MEDIUM RISK</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-warning)', marginTop: 2 }}>11</div>
              </div>
              <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-info-bg)', borderRadius: 8, border: '1px solid var(--color-info-border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-info)' }}>LOW RISK</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-info)', marginTop: 2 }}>18</div>
              </div>
            </div>
          </div>

          {/* Vulnerability Finding Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              Identified Security Findings
            </h3>

            {mockScanFindings.map((finding) => (
              <div
                key={finding.id}
                className="glass-panel"
                style={{
                  borderLeft: `4px solid ${finding.severity === 'CRITICAL' ? 'var(--color-critical)' : finding.severity === 'HIGH' ? '#F04438' : finding.severity === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-info)'}`
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <RiskBadge severity={finding.severity} />
                      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {finding.title}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 840 }}>
                      {finding.description}
                    </p>
                  </div>

                  <button
                    onClick={() => { setSelectedFinding(finding); setDetailTab('overview'); }}
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--cyberx-red)', borderColor: 'var(--color-critical-border)', backgroundColor: 'var(--color-critical-bg)' }}>
                    <span>View Details</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Impact: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{finding.impact}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Recommendation: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{finding.recommendation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VULNERABILITY DETAIL MODAL (Tabs: Overview | Evidence | Remediation) */}
      {selectedFinding && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(16, 24, 40, 0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 16,
            border: '1px solid var(--border-primary)',
            boxShadow: '0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)',
            maxWidth: 680,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <RiskBadge severity={selectedFinding.severity} />
                  {selectedFinding.cveId && (
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyberx-red)' }}>
                      {selectedFinding.cveId}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedFinding.title}
                </h3>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Asset: {selectedFinding.affectedAsset}
                </div>
              </div>

              <button
                onClick={() => setSelectedFinding(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ padding: '12px 28px 0', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 20 }}>
              {(['overview', 'evidence', 'remediation'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  style={{
                    paddingBottom: 10,
                    fontSize: 13.5,
                    fontWeight: detailTab === tab ? 600 : 500,
                    color: detailTab === tab ? 'var(--cyberx-red)' : 'var(--text-muted)',
                    borderBottom: detailTab === tab ? '2px solid var(--cyberx-red)' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '24px 28px' }}>
              {detailTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DESCRIPTION</h4>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.5 }}>
                      {selectedFinding.description}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>SECURITY IMPACT</h4>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.5 }}>
                      {selectedFinding.impact}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RECOMMENDED REMEDIATION</h4>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.5 }}>
                      {selectedFinding.recommendation}
                    </p>
                  </div>
                </div>
              )}

              {detailTab === 'evidence' && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    TECHNICAL EVIDENCE & OBSERVATION
                  </h4>
                  <div style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 8,
                    padding: 16,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    lineHeight: 1.6
                  }}>
                    {selectedFinding.evidence}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10 }}>
                    Evidence collected non-destructively through passive HTTP header and TLS negotiation analysis.
                  </p>
                </div>
              )}

              {detailTab === 'remediation' && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    IMPLEMENTATION GUIDANCE
                  </h4>
                  {selectedFinding.remediationSnippet && (
                    <div style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 8,
                      padding: 16,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      marginBottom: 16,
                      overflowX: 'auto'
                    }}>
                      {selectedFinding.remediationSnippet}
                    </div>
                  )}
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Deploy the updated configuration across your edge load balancers, CDN distributions, or application servers. Re-run this assessment to verify complete resolution.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', backgroundColor: 'var(--bg-elevated)', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setSelectedFinding(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              <button onClick={() => setSelectedFinding(null)} className="btn btn-primary btn-sm">
                Mark as Investigating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
