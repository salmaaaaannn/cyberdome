'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SecurityScore,
  MetricCard,
  RiskBadge,
  DemoBanner,
  GlowButton
} from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { dashboardService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import {
  ShieldAlert,
  Bug,
  Server,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  CheckCircle2,
  ExternalLink,
  Search,
  Clock,
  ShieldCheck,
  ChevronRight,
  Radio
} from 'lucide-react';


export default function DashboardPage() {
  const router = useRouter();
  const { setWebsiteAssessmentTarget } = useAppStore();
  const [quickScanUrl, setQuickScanUrl] = useState('https://example.com');
  const [scanOption, setScanOption] = useState<'quick' | 'full'>('full');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await dashboardService.getMetrics();
      if (data) {
        setMetrics(data);
      }
    } catch (e) {
      console.error('Error loading dashboard metrics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Subscribe to live WebSocket events
  useRealtimeEvents((event) => {
    // Whenever telemetry, detections, or incidents change, reload real metrics
    if (['network_event', 'security_event', 'detection_created', 'incident_created', 'incident_updated', 'iot_device_updated'].includes(event.type)) {
      loadMetrics();
    }
  });

  const handleStartScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScanUrl.trim()) return;
    setWebsiteAssessmentTarget(quickScanUrl);
    router.push('/website-security');
  };

  const totalAssets = metrics?.totalAssets ?? 0;
  const totalVulns = metrics?.totalVulnerabilities ?? 0;
  const criticalVulns = metrics?.criticalVulnerabilities ?? 0;
  const highVulns = metrics?.highVulnerabilities ?? 0;
  const mediumVulns = metrics?.mediumVulnerabilities ?? 0;
  const lowVulns = metrics?.lowVulnerabilities ?? 0;
  const openIncidents = metrics?.openIncidents ?? 0;
  const criticalIssues = criticalVulns + openIncidents;
  const securityScore = metrics?.securityScore ?? 100;
  const recentFindings = metrics?.recentFindings || [];
  const recentAlerts = metrics?.recentAlerts || [];

  // Calculate percentages for severity breakdown bar
  const critPct = totalVulns > 0 ? (criticalVulns / totalVulns) * 100 : 0;
  const highPct = totalVulns > 0 ? (highVulns / totalVulns) * 100 : 0;
  const medPct = totalVulns > 0 ? (mediumVulns / totalVulns) * 100 : 0;
  const lowPct = totalVulns > 0 ? (lowVulns / totalVulns) * 100 : 0;

  return (
    <div className="page-container">
      <DemoBanner />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Security Overview
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Monitor your organization&apos;s security posture, vulnerabilities, and real-time operations.
          </p>
        </div>

        <Link href="/website-security" className="btn btn-primary btn-md">
          <Globe size={16} />
          <span>New Security Scan</span>
        </Link>
      </div>

      {/* 4 KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* KPI 1: Security Score */}
        <div className="metric-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <SecurityScore score={securityScore} size={84} showLabel={false} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="metric-label">Security Score</span>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
              {securityScore} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>/ 100</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: securityScore >= 80 ? 'var(--color-success-text)' : 'var(--color-critical)', fontWeight: 500 }}>
              {securityScore >= 80 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{securityScore >= 80 ? 'Healthy posture' : 'Action required'}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Critical Issues */}
        <MetricCard
          label="Critical Issues"
          value={String(criticalIssues).padStart(2, '0')}
          icon={<ShieldAlert size={20} color="var(--color-critical)" />}
          change={criticalIssues > 0 ? `${criticalIssues} require immediate attention` : "No critical issues"}
          trendDirection={criticalIssues > 0 ? "down" : "up"}
        />

        {/* KPI 3: Open Vulnerabilities */}
        <MetricCard
          label="Open Vulnerabilities"
          value={String(totalVulns).padStart(2, '0')}
          icon={<Bug size={20} color="var(--color-warning)" />}
          change={totalVulns > 0 ? `${totalVulns} detected weaknesses` : "Clean vulnerability scan"}
          trendDirection={totalVulns > 0 ? "neutral" : "up"}
        />

        {/* KPI 4: Protected Assets */}
        <MetricCard
          label="Protected Assets"
          value={String(totalAssets).padStart(2, '0')}
          icon={<Server size={20} color="var(--color-info)" />}
          change={totalAssets > 0 ? `${totalAssets} observable nodes` : "0 registered assets"}
          trendDirection="neutral"
        />
      </div>

      {/* Middle Grid: Vulnerability Overview Bar + Quick Scan Input */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Vulnerability Distribution */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                Vulnerability Severity Breakdown
              </h3>
              <Link href="/vulnerabilities" style={{ fontSize: 13, color: 'var(--cyberx-red)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>All CVEs</span>
                <ChevronRight size={14} />
              </Link>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Distribution of active weaknesses across observable software and infrastructure.
            </p>

            {/* Segmented Horizontal Progress Bar */}
            <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2, marginBottom: 20, backgroundColor: 'var(--bg-elevated)' }}>
              {totalVulns > 0 ? (
                <>
                  {critPct > 0 && <div style={{ width: `${critPct}%`, backgroundColor: 'var(--color-critical)' }} title={`Critical: ${criticalVulns}`} />}
                  {highPct > 0 && <div style={{ width: `${highPct}%`, backgroundColor: '#F04438' }} title={`High: ${highVulns}`} />}
                  {medPct > 0 && <div style={{ width: `${medPct}%`, backgroundColor: 'var(--color-warning)' }} title={`Medium: ${mediumVulns}`} />}
                  {lowPct > 0 && <div style={{ width: `${lowPct}%`, backgroundColor: 'var(--color-info)' }} title={`Low: ${lowVulns}`} />}
                </>
              ) : (
                <div style={{ width: '100%', backgroundColor: 'var(--color-success)', opacity: 0.3 }} title="No vulnerabilities detected" />
              )}
            </div>

            {/* Severity Pill Counts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-critical-bg)', borderRadius: 8, border: '1px solid var(--color-critical-border)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-critical)' }}>CRITICAL</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-critical)', marginTop: 2 }}>
                  {String(criticalVulns).padStart(2, '0')}
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-warning-bg)', borderRadius: 8, border: '1px solid var(--color-warning-border)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-warning)' }}>HIGH</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-warning)', marginTop: 2 }}>
                  {String(highVulns).padStart(2, '0')}
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-warning-bg)', borderRadius: 8, border: '1px solid var(--color-warning-border)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-warning)' }}>MEDIUM</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-warning)', marginTop: 2 }}>
                  {String(mediumVulns).padStart(2, '0')}
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-info-bg)', borderRadius: 8, border: '1px solid var(--color-info-border)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-info)' }}>LOW</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-info)', marginTop: 2 }}>
                  {String(lowVulns).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Website Scanner Bar */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={16} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Website Security Scanner
                </h3>
              </div>
              <span className="badge badge-safe" style={{ fontSize: 11 }}>PASSIVE SCAN</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Inspect your web perimeter for SSL/TLS flaws, missing security headers, and exposed technologies.
            </p>

            <form onSubmit={handleStartScan}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  padding: '4px 12px',
                  gap: 8
                }}>
                  <Globe size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="url"
                    value={quickScanUrl}
                    onChange={(e) => setQuickScanUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="input-field"
                    style={{ border: 'none', background: 'transparent', padding: '6px 0', fontSize: 13.5 }}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-md">
                  Start Security Scan
                </button>
              </div>

              {/* Quick vs Full Radio */}
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  <input
                    type="radio"
                    name="scanOption"
                    checked={scanOption === 'quick'}
                    onChange={() => setScanOption('quick')}
                  />
                  <span>Quick Scan (Headers & SSL)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  <input
                    type="radio"
                    name="scanOption"
                    checked={scanOption === 'full'}
                    onChange={() => setScanOption('full')}
                  />
                  <span>Full Security Assessment (CVEs + Perimeter)</span>
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Bottom Section: Recent Findings Table (65%) & Security Alerts (35%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24 }}>
        {/* Left: Recent Findings Table */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                Recent Vulnerability Findings
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Identified weaknesses pending remediation approval.
              </p>
            </div>
            <Link href="/vulnerabilities" className="btn btn-secondary btn-sm">
              View All Findings
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ASSET</th>
                  <th>FINDING</th>
                  <th>SEVERITY</th>
                  <th>STATUS</th>
                  <th>DETECTED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentFindings.length > 0 ? (
                  recentFindings.map((item: any) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>
                        {item.asset}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13.5 }}>{item.finding}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{item.type}</div>
                      </td>
                      <td>
                        <RiskBadge severity={item.severity} />
                      </td>
                      <td>
                        <span className={`badge ${item.status === 'RESOLVED' ? 'badge-safe' : item.status === 'IN PROGRESS' ? 'badge-warning' : 'badge-critical'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        {item.detected}
                      </td>
                      <td>
                        <Link href="/vulnerabilities" style={{ fontSize: 13, color: 'var(--cyberx-red)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <span>Details</span>
                          <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                      No security events yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Security Alerts & Activity Feed */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Security Activity & Alerts
            </h3>
            <span className="badge badge-info" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Radio size={12} className="animate-pulse" />
              <span>LIVE FEED</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert: any) => {
                const isCrit = alert.type === 'critical';
                const isWarn = alert.type === 'warning';
                const isSucc = alert.type === 'success';

                const bg = isCrit ? 'var(--color-critical-bg)' : isWarn ? 'var(--color-warning-bg)' : 'var(--color-success-bg)';
                const border = isCrit ? 'var(--color-critical-border)' : isWarn ? 'var(--color-warning-border)' : 'var(--color-success-border)';
                const iconColor = isCrit ? 'var(--color-critical)' : isWarn ? 'var(--color-warning)' : 'var(--color-success)';
                const Icon = isCrit ? ShieldAlert : isWarn ? AlertTriangle : CheckCircle2;

                return (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      backgroundColor: bg,
                      border: `1px solid ${border}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12
                    }}>
                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                      <Icon size={18} color={iconColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {alert.title}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {alert.time}
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                        {alert.desc}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                No security events yet
              </div>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <Link href="/incidents" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Open Incident Management Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

