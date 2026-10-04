'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel, StatusIndicator, RiskBadge, SecurityScore } from '@/components/ui';
import { websiteAssessmentService } from '@/services';
import { WebsiteAssessment, WebsiteFinding, WebsiteScanCheck } from '@/types';
import { useAppStore } from '@/stores/appStore';
import Link from 'next/link';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Download,
  Clock,
  Layers,
  ShieldCheck,
  Server,
  FileCode,
  X
} from 'lucide-react';

const SCAN_STEPS = [
  'Validating target ownership & domain DNS records',
  'Discovering observable attack surface & subdomains',
  'Analyzing TLS protocol ciphers & certificate trust chain',
  'Checking HTTP security headers (CSP, HSTS, X-Frame-Options)',
  'Analyzing redirect hops and host exposures',
  'Matching known CVE vulnerability intelligence & CISA KEV',
  'Compiling unified security posture assessment report'
];

export default function WebsiteSecurityPage() {
  const { websiteAssessmentTarget, setWebsiteAssessmentTarget, setActiveWebsiteAssessment } = useAppStore();
  const [targetUrl, setTargetUrl] = useState(websiteAssessmentTarget || 'https://example.com');
  const [isScanning, setIsScanning] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [assessment, setAssessment] = useState<WebsiteAssessment | null>(null);
  const [history, setHistory] = useState<WebsiteAssessment[]>([]);
  const [activeTab, setActiveTab] = useState<'report' | 'surface' | 'vulns' | 'checks' | 'history'>('report');
  const [selectedFinding, setSelectedFinding] = useState<WebsiteFinding | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    websiteAssessmentService.getWebsiteAssessment('assess-example-01').then(res => {
      setAssessment(res);
      setActiveWebsiteAssessment(res);
    });
    websiteAssessmentService.getWebsiteHistory().then(setHistory);
  }, [setActiveWebsiteAssessment]);

  const handleStartScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUrl.trim()) return;

    setIsScanning(true);
    setCurrentStepIdx(0);
    setWebsiteAssessmentTarget(targetUrl);

    // Try real backend scan with progress polling
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const token = typeof window !== 'undefined' ? localStorage.getItem('cyberdome_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let usedBackend = false;

    try {
      const createRes = await fetch(`${API_BASE}/website-security/assessments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ target_url: targetUrl, authorization_confirmed: true }),
      });

      if (createRes.ok) {
        const createJson = await createRes.json();
        if (createJson.success && createJson.data) {
          usedBackend = true;
          const assessmentId = createJson.data.id;

          // Step name mapping for UI progress
          const stepNameMap: Record<string, number> = {
            'target_validation': 0,
            'dns_resolution': 1,
            'tls_analysis': 2,
            'http_analysis': 3,
            'security_headers': 3,
            'cookie_analysis': 3,
            'technology_detection': 4,
            'vulnerability_intelligence': 5,
            'report_preparation': 6,
          };

          // Poll for real scan progress
          let done = false;
          let attempts = 0;
          while (!done && attempts < 150) {
            await new Promise(r => setTimeout(r, 1500));
            attempts++;
            try {
              const progressRes = await fetch(
                `${API_BASE}/website-security/assessments/${assessmentId}/progress`,
                { headers }
              );
              if (progressRes.ok) {
                const pj = await progressRes.json();
                const pd = pj.data;
                if (pd.current_step && stepNameMap[pd.current_step] !== undefined) {
                  setCurrentStepIdx(stepNameMap[pd.current_step]);
                }
                if (pd.status === 'COMPLETED' || pd.status === 'FAILED' || pd.status === 'CANCELLED') {
                  setCurrentStepIdx(SCAN_STEPS.length - 1);
                  done = true;
                }
              }
            } catch {
              done = true;
            }
          }

          // Fetch full assessment detail
          const detailRes = await fetch(
            `${API_BASE}/website-security/assessments/${assessmentId}`,
            { headers }
          );
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            if (detailJson.success && detailJson.data) {
              const result = await websiteAssessmentService.getWebsiteAssessment(assessmentId);
              setAssessment(result);
              setActiveWebsiteAssessment(result);
            }
          }
        }
      }
    } catch {
      // Backend unavailable — use demo mode below
    }

    // Fallback: demo mode if backend not used
    if (!usedBackend) {
      for (let i = 0; i < SCAN_STEPS.length; i++) {
        setCurrentStepIdx(i);
        await new Promise(r => setTimeout(r, 450));
      }
      const result = await websiteAssessmentService.analyzeWebsite(targetUrl);
      setAssessment(result);
      setActiveWebsiteAssessment(result);
    }

    setIsScanning(false);
    setActiveTab('report');

    const updatedHistory = await websiteAssessmentService.getWebsiteHistory();
    setHistory(updatedHistory);
  };

  const handleExport = async (format: 'PDF' | 'CSV' | 'JSON') => {
    if (!assessment) return;
    const content = await websiteAssessmentService.exportWebsiteReport(assessment.id, format);
    const blob = new Blob([content], { type: format === 'JSON' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CyberDome-Report-${assessment.domain}.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice(`Report exported as ${format}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="page-container" style={{ maxWidth: 1300, margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-primary)',
        borderRadius: 8,
        marginBottom: 24,
        boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusIndicator status="SAFE" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            PASSIVE & NON-DESTRUCTIVE ASSESSMENT
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            — Target must be authorized. No invasive payload execution or brute-force tests.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-info">SYNTHETIC DEMO DATA</span>
          <span className="badge badge-safe">CISA KEV CONNECTED</span>
        </div>
      </div>

      {/* Header & Target Input Bar */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Website Security Assessment
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, maxWidth: 840 }}>
          Analyze your authorized website’s observable attack surface, security configuration, and identifiable vulnerability intelligence in one connected workflow.
        </p>

        {/* Input Bar */}
        <form onSubmit={handleStartScan} style={{
          display: 'flex',
          gap: 12,
          marginTop: 20,
          backgroundColor: 'var(--bg-surface)',
          padding: 8,
          borderRadius: 12,
          border: '1px solid var(--border-primary)',
          boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
          alignItems: 'center'
        }}>
          <div style={{ paddingLeft: 12, color: 'var(--text-muted)' }}>
            <Globe size={18} />
          </div>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            disabled={isScanning}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 14.5,
              padding: '8px 4px'
            }}
          />
          <button
            type="button"
            onClick={() => setTargetUrl('')}
            disabled={isScanning || !targetUrl}
            className="btn btn-ghost btn-sm">
            Clear
          </button>
          <button
            type="submit"
            disabled={isScanning || !targetUrl.trim()}
            className="btn btn-primary btn-md">
            {isScanning ? 'Analyzing...' : 'Analyze Website'}
          </button>
        </form>
      </div>

      {/* Scanning Step Progression */}
      {isScanning && (
        <div className="glass-panel" style={{ marginBottom: 32, borderLeft: '4px solid var(--color-critical)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 18, height: 18, border: '2px solid var(--border-primary)', borderTopColor: 'var(--color-critical)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                Security Assessment in Progress: <span style={{ color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>{targetUrl}</span>
              </h3>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>
              Step {currentStepIdx + 1} of {SCAN_STEPS.length}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 12 }}>
            {SCAN_STEPS.map((step, idx) => {
              const isCurrent = idx === currentStepIdx;
              const isDone = idx < currentStepIdx;
              return (
                <div key={step} style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: isCurrent ? 'var(--color-critical-bg)' : isDone ? 'var(--color-success-bg)' : 'var(--bg-elevated)',
                  border: isCurrent ? '1px solid var(--color-critical-border)' : isDone ? '1px solid var(--color-success-border)' : '1px solid var(--border-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: isCurrent ? 'var(--color-critical)' : isDone ? 'var(--color-success)' : 'var(--text-muted)',
                  fontWeight: isCurrent || isDone ? 600 : 400
                }}>
                  <span>{isDone ? '✓' : isCurrent ? '►' : '○'}</span>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Export Toast */}
      {exportNotice && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--color-success-border)',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(16,24,40,0.12)',
          zIndex: 100,
          color: 'var(--color-success)',
          fontSize: 13.5,
          fontWeight: 600
        }}>
          ✓ {exportNotice}
        </div>
      )}

      {/* Main Content Area */}
      {assessment && (
        <div>
          {/* Executive Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>TARGET DOMAIN</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>
                {assessment.domain}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Assessed {new Date(assessment.startedAt).toLocaleTimeString()}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>ATTACK SURFACE</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>
                {assessment.totalObservableAssets} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Assets</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {assessment.subdomainsCount} Subdomains · {assessment.servicesCount} Services
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>SCANNER CHECKS</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: 'var(--color-success)' }}>
                {assessment.checksCount.passed} / {assessment.checksCount.total} Passed
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {assessment.checksCount.findings} configuration warnings
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>SECURITY FINDINGS</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <span className="badge badge-critical">{assessment.findingsCount.critical} Crit</span>
                <span className="badge badge-high">{assessment.findingsCount.high} High</span>
                <span className="badge badge-warning">{assessment.findingsCount.medium} Med</span>
                <span className="badge badge-info">{assessment.findingsCount.low} Low</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                CVE matches & header weaknesses
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-primary)',
            paddingBottom: 14,
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setActiveTab('report')}
                className={`btn btn-sm ${activeTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}>
                Unified Report
              </button>
              <button
                onClick={() => setActiveTab('surface')}
                className={`btn btn-sm ${activeTab === 'surface' ? 'btn-primary' : 'btn-secondary'}`}>
                Attack Surface ({assessment.observableAssets.length})
              </button>
              <button
                onClick={() => setActiveTab('vulns')}
                className={`btn btn-sm ${activeTab === 'vulns' ? 'btn-primary' : 'btn-secondary'}`}>
                Vulnerabilities ({assessment.vulnerabilities.length})
              </button>
              <button
                onClick={() => setActiveTab('checks')}
                className={`btn btn-sm ${activeTab === 'checks' ? 'btn-primary' : 'btn-secondary'}`}>
                Scanner Checks ({assessment.checks.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}>
                History ({history.length})
              </button>
            </div>

            {/* Export Actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>EXPORT:</span>
              <button onClick={() => handleExport('PDF')} className="btn btn-secondary btn-sm">PDF</button>
              <button onClick={() => handleExport('CSV')} className="btn btn-secondary btn-sm">CSV</button>
              <button onClick={() => handleExport('JSON')} className="btn btn-secondary btn-sm">JSON</button>
              <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-primary)', margin: '0 4px' }} />
              <Link href="/scanner" className="btn btn-ghost btn-sm" style={{ color: 'var(--cyberx-red)', fontWeight: 600 }}>
                Open Scanner →
              </Link>
            </div>
          </div>

          {/* TAB 1: UNIFIED REPORT VIEW */}
          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Section 01: Attack Surface */}
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyberx-red)', backgroundColor: 'var(--color-critical-bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-critical-border)' }}>
                      01
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                      ATTACK SURFACE DISCOVERY
                    </h3>
                  </div>
                  <Link href="/attack-surface" className="btn btn-secondary btn-sm">
                    Open Full Attack Surface →
                  </Link>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Passive reconnaissance of public records, DNS zones, TLS certificates, and edge endpoints exposed to the Internet.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {assessment.observableAssets.slice(0, 4).map(asset => (
                    <div key={asset.id} style={{
                      padding: 14,
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: 8,
                      border: '1px solid var(--border-primary)'
                    }}>
                      <div className="flex-between">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                          {asset.name}
                        </span>
                        <span className="badge badge-info">{asset.type.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                        {asset.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 02: Vulnerability Intelligence */}
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyberx-red)', backgroundColor: 'var(--color-critical-bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-critical-border)' }}>
                      02
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                      VULNERABILITY INTELLIGENCE
                    </h3>
                  </div>
                  <Link href="/vulnerabilities" className="btn btn-secondary btn-sm">
                    Open Vulnerability Matrix →
                  </Link>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>CVE ID</th>
                        <th>TITLE</th>
                        <th>SEVERITY</th>
                        <th>CVSS</th>
                        <th>EPSS</th>
                        <th>CISA KEV</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessment.vulnerabilities.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyberx-red)' }}>{v.cveId}</td>
                          <td style={{ fontWeight: 500 }}>{v.title}</td>
                          <td><RiskBadge severity={v.severity} /></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v.cvssScore}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{(v.epssScore * 100).toFixed(1)}%</td>
                          <td>{v.cisaKev ? <span className="badge badge-critical">ACTIVE KEV</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>}</td>
                          <td><span className="badge badge-info">{v.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 03 & 04: Security Findings */}
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyberx-red)', backgroundColor: 'var(--color-critical-bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-critical-border)' }}>
                      03 & 04
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                      SECURITY SCANNER FINDINGS
                    </h3>
                  </div>
                  <span className="badge badge-warning">
                    {assessment.findings.length} ACTIONABLE FINDINGS
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {assessment.findings.map(finding => (
                    <div key={finding.id} style={{
                      padding: 18,
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: 10,
                      border: '1px solid var(--border-primary)',
                      borderLeft: `4px solid ${finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'var(--color-critical)' : 'var(--color-warning)'}`
                    }}>
                      <div className="flex-between" style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <RiskBadge severity={finding.severity} />
                          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{finding.title}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                          Target: {finding.affectedTarget}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12, fontSize: 13.5 }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>WHAT IS WRONG:</strong>
                          <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{finding.whatIsWrong}</p>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>WHY IT MATTERS:</strong>
                          <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{finding.whyItMatters}</p>
                        </div>
                      </div>

                      <div style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        backgroundColor: 'var(--color-success-bg)',
                        border: '1px solid var(--color-success-border)',
                        borderRadius: 6,
                        fontSize: 13,
                        color: 'var(--color-success)'
                      }}>
                        <strong>RECOMMENDED FIX:</strong> {finding.recommendedFix}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 05 & 06: Recommendations */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyberx-red)', backgroundColor: 'var(--color-critical-bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-critical-border)' }}>
                    05 & 06
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                    REMEDIATION ROADMAP
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {assessment.recommendations.map((rec, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: 8,
                      border: '1px solid var(--border-primary)'
                    }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: i === 0 ? 'var(--color-critical)' : 'var(--border-subtle)',
                        color: i === 0 ? '#FFFFFF' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTACK SURFACE */}
          {activeTab === 'surface' && (
            <div className="glass-panel">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Observable Perimeter for {assessment.domain}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {assessment.observableAssets.map(asset => (
                  <div key={asset.id} style={{
                    padding: 16,
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 10,
                    border: '1px solid var(--border-primary)'
                  }}>
                    <div className="flex-between">
                      <span className="badge badge-info">{asset.type.toUpperCase()}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {asset.exposure}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8, color: 'var(--text-primary)' }}>
                      {asset.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      Target: {asset.target}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                      {asset.details}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: VULNERABILITIES */}
          {activeTab === 'vulns' && (
            <div className="glass-panel">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Matched Vulnerability Intelligence</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {assessment.vulnerabilities.map(vuln => (
                  <div key={vuln.id} style={{
                    padding: 18,
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 10,
                    border: '1px solid var(--border-primary)'
                  }}>
                    <div className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyberx-red)', fontWeight: 700, fontSize: 14 }}>
                          {vuln.cveId}
                        </span>
                        <RiskBadge severity={vuln.severity} />
                        {vuln.cisaKev && <span className="badge badge-critical">CISA KEV</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                        CVSS: <strong>{vuln.cvssScore}</strong> · EPSS: <strong>{(vuln.epssScore * 100).toFixed(1)}%</strong>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 8, fontSize: 15 }}>{vuln.title}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>{vuln.description}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                      Affected: {vuln.affectedAssets.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SCANNER CHECKS */}
          {activeTab === 'checks' && (
            <div className="glass-panel">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Passive Scanner Configuration Checks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assessment.checks.map(chk => (
                  <div key={chk.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 8,
                    border: '1px solid var(--border-primary)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className={`badge ${chk.status === 'PASS' ? 'badge-safe' : chk.status === 'WARN' ? 'badge-warning' : 'badge-critical'}`}>
                        {chk.status}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{chk.name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{chk.details}</div>
                      </div>
                    </div>
                    <span className="badge badge-info">{chk.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HISTORY */}
          {activeTab === 'history' && (
            <div className="glass-panel">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Assessment History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>TARGET</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                      <th>CRITICAL</th>
                      <th>HIGH</th>
                      <th>CHECKS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{item.targetUrl}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(item.startedAt).toLocaleString()}</td>
                        <td><span className="badge badge-safe">{item.status}</span></td>
                        <td style={{ color: 'var(--color-critical)', fontWeight: 700 }}>{item.findingsCount.critical}</td>
                        <td style={{ color: 'var(--color-warning)', fontWeight: 700 }}>{item.findingsCount.high}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.checksCount.passed}/{item.checksCount.total}</td>
                        <td>
                          <button
                            onClick={() => {
                              setAssessment(item);
                              setActiveWebsiteAssessment(item);
                              setTargetUrl(item.targetUrl);
                              setActiveTab('report');
                            }}
                            className="btn btn-secondary btn-sm">
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
