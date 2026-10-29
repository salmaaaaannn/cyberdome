'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  SecurityScore,
  MetricCard,
  RiskBadge,
  DemoBanner,
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
  Radio,
  Activity,
  Layers,
  Terminal,
  FileText,
  Lock,
  Zap,
} from 'lucide-react';

// Dynamic import of 3D CyberGlobe for Bento Hero Card
const CyberGlobe = dynamic(() => import('@/components/3d/CyberGlobe'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bento-skeleton" style={{ width: 160, height: 160, borderRadius: '50%' }} />
    </div>
  ),
});

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

  // Percentages for severity breakdown bar
  const critPct = totalVulns > 0 ? (criticalVulns / totalVulns) * 100 : 0;
  const highPct = totalVulns > 0 ? (highVulns / totalVulns) * 100 : 0;
  const medPct = totalVulns > 0 ? (mediumVulns / totalVulns) * 100 : 0;
  const lowPct = totalVulns > 0 ? (lowVulns / totalVulns) * 100 : 0;

  return (
    <div className="page-container" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <DemoBanner />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.28)', color: '#38BDF8', fontSize: 11.5, fontWeight: 600, marginBottom: 8, letterSpacing: '0.04em' }}>
            <Activity size={13} className="animate-pulse" /> COMMAND CENTER · BENTO HUD ACTIVE
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Security Operations Overview
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            Modular intelligence feed, autonomous attack surface telemetry, and real-time posture defense.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/incidents" className="btn btn-secondary btn-md">
            <ShieldAlert size={15} />
            <span>Incidents ({openIncidents})</span>
          </Link>
          <Link href="/website-security" className="btn btn-primary btn-md">
            <Globe size={15} />
            <span>Launch Security Scan</span>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 12-COLUMN BENTO GRID SYSTEM                                 */}
      {/* ============================================================ */}
      <div className="bento-grid" style={{ marginBottom: 24 }}>

        {/* 1. HERO BOX (8 Cols): 3D Global Threat Level */}
        <div
          className="bento-col-8 bento-card"
          style={{
            padding: '24px 28px',
            minHeight: 330,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: criticalIssues > 0 ? '#EF4444' : '#10B981', boxShadow: criticalIssues > 0 ? '0 0 10px #EF4444' : '0 0 10px #10B981' }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  GLOBAL THREAT LEVEL
                </span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {criticalIssues > 0 ? 'ELEVATED DEFENSE' : 'NOMINAL · ALL SYSTEMS SECURE'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Real-time orbital telemetry monitoring across external ingress points and zero-trust perimeter.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: criticalIssues > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: criticalIssues > 0 ? '#EF4444' : '#10B981',
                  border: `1px solid ${criticalIssues > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  letterSpacing: '0.04em',
                }}
              >
                {criticalIssues > 0 ? `${criticalIssues} ACTIVE ALERTS` : 'ZERO ACTIVE BREACHES'}
              </span>
            </div>
          </div>

          {/* 3D CyberGlobe Interactive Scene */}
          <div style={{ height: 210, width: '100%', position: 'relative', zIndex: 1, margin: '-10px 0' }}>
            <CyberGlobe />
          </div>

          {/* Bottom Bento Status Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DEFENSE NODES</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>5/5 Synchronized</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SURFACE LATENCY</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)', marginTop: 2 }}>14ms · Nominal</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OBSERVABILITY</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>100% Ingress Flow</div>
            </div>
          </div>
        </div>

        {/* 2. STATUS BOX (4 Cols): System Health & Security Score Ring */}
        <div
          className="bento-col-4 bento-card"
          style={{
            padding: '24px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                SYSTEM HEALTH
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10B981', fontWeight: 600 }}>
                <CheckCircle2 size={13} /> 99.9% Uptime
              </span>
            </div>

            {/* Circular Progress & Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '14px 0' }}>
              <SecurityScore score={securityScore} size={92} showLabel={false} />
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {securityScore}
                  <span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: securityScore >= 80 ? '#10B981' : '#EF4444',
                    marginTop: 6,
                  }}
                >
                  {securityScore >= 80 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{securityScore >= 80 ? 'Healthy Posture' : 'Action Required'}</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 10 }}>
              Calculated dynamically via Multi-Model ML Fusion across Network telemetry, IoT feeds, UEBA, and URL scans.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            <Link
              href="/analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#3B82F6',
                textDecoration: 'none',
              }}
            >
              <span>Explore Posture Breakdown</span>
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        {/* 3. METRIC BOX 1 (3 Cols): Protected Assets */}
        <div className="bento-col-3 bento-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PROTECTED ASSETS
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={17} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
            {String(totalAssets).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {totalAssets > 0 ? `${totalAssets} observable endpoints` : 'Zero registered assets'}
          </div>
        </div>

        {/* 4. METRIC BOX 2 (3 Cols): Critical Issues */}
        <div className="bento-col-3 bento-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CRITICAL ISSUES
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.14)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={17} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: criticalIssues > 0 ? '#EF4444' : 'var(--text-primary)' }}>
            {String(criticalIssues).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: criticalIssues > 0 ? '#EF4444' : '#10B981', marginTop: 6, fontWeight: 500 }}>
            {criticalIssues > 0 ? `${criticalIssues} need immediate attention` : 'All clear. Zero critical risks'}
          </div>
        </div>

        {/* 5. METRIC BOX 3 (3 Cols): Open Vulnerabilities */}
        <div className="bento-col-3 bento-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ACTIVE WEAKNESSES
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bug size={17} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
            {String(totalVulns).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {totalVulns > 0 ? `${totalVulns} detected weaknesses` : 'Clean vulnerability perimeter'}
          </div>
        </div>

        {/* 6. METRIC BOX 4 (3 Cols): Incident Response SLA */}
        <div className="bento-col-3 bento-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              SOAR RESPONSE TIME
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={17} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            0.8s
          </div>
          <div style={{ fontSize: 12, color: '#10B981', marginTop: 6, fontWeight: 500 }}>
            Autonomous playbooks active
          </div>
        </div>

        {/* 7. ALERT FEED (5 Cols): Live Threat Feed with Monospaced IPs */}
        <div className="bento-col-5 bento-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={15} color="#38BDF8" className="animate-pulse" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Live Threat Stream
              </h3>
            </div>
            <span className="badge badge-info" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              REAL-TIME
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 280 }}>
            {recentAlerts.length > 0 ? (
              recentAlerts.slice(0, 5).map((alert: any) => {
                const isCrit = alert.type === 'critical';
                const isWarn = alert.type === 'warning';
                return (
                  <div
                    key={alert.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-elevated)',
                      border: `1px solid ${isCrit ? 'rgba(239, 68, 68, 0.35)' : isWarn ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                      {isCrit ? (
                        <ShieldAlert size={16} color="#EF4444" />
                      ) : isWarn ? (
                        <AlertTriangle size={16} color="#F59E0B" />
                      ) : (
                        <CheckCircle2 size={16} color="#10B981" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {alert.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {alert.time}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4, margin: 0 }}>
                        {alert.desc}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                <ShieldCheck size={28} style={{ color: '#10B981', margin: '0 auto 8px', opacity: 0.8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>All clear. We&apos;re watching.</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>No elevated attack vectors detected in the past 60 minutes.</div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 12 }}>
            <Link href="/incidents" style={{ fontSize: 12.5, fontWeight: 600, color: '#3B82F6', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>View Security Incident Stream</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* 8. QUICK ACTIONS (3 Cols): Tactile Buttons */}
        <div className="bento-col-3 bento-card" style={{ padding: '22px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, margin: 0 }}>
              Tactile Actions
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, marginTop: 4 }}>
              Fast-path operational controls for SOC responders.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                href="/website-security"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <Search size={15} />
                <span>Run Perimeter Scan</span>
              </Link>
              <Link
                href="/attack-surface"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <Globe size={15} />
                <span>Map Attack Surface</span>
              </Link>
              <Link
                href="/reports"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <FileText size={15} />
                <span>Export Audit Report</span>
              </Link>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={12} color="#10B981" />
              <span>RBAC Token Verified</span>
            </div>
          </div>
        </div>

        {/* 9. COMPLIANCE MATRIX (4 Cols): Glowing Green Checks */}
        <div className="bento-col-4 bento-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Compliance Matrix
              </h3>
              <span className="badge badge-safe" style={{ fontSize: 10.5 }}>
                AUDIT READY
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'SOC 2 Type II', standard: 'CC6.1 - Perimeter Defenses', status: 'Compliant' },
                { name: 'ISO / IEC 27001', standard: 'A.12.6 - Tech Vulnerability', status: 'Verified' },
                { name: 'HIPAA Security Rule', standard: '164.312 - Access Control', status: 'Active' },
                { name: 'GDPR Article 32', standard: 'Security of Processing', status: 'Certified' },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.standard}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontSize: 12, fontWeight: 600 }}>
                    <CheckCircle2 size={14} />
                    <span>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 14 }}>
            <Link href="/reports" style={{ fontSize: 12.5, fontWeight: 600, color: '#3B82F6', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Generate Compliance Package</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* 10. VULNERABILITY BREAKDOWN & QUICK SCAN (6 Cols) */}
        <div className="bento-col-6 bento-card" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Weakness Severity Spectrum
              </h3>
              <Link href="/vulnerabilities" style={{ fontSize: 12.5, color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>All CVEs</span>
                <ChevronRight size={14} />
              </Link>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              Telemetry classification across registered endpoints and exposed ports.
            </p>

            {/* Segmented Horizontal Progress Bar */}
            <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2, marginBottom: 16, backgroundColor: 'var(--bg-elevated)' }}>
              {totalVulns > 0 ? (
                <>
                  {critPct > 0 && <div style={{ width: `${critPct}%`, backgroundColor: '#EF4444' }} title={`Critical: ${criticalVulns}`} />}
                  {highPct > 0 && <div style={{ width: `${highPct}%`, backgroundColor: '#F97316' }} title={`High: ${highVulns}`} />}
                  {medPct > 0 && <div style={{ width: `${medPct}%`, backgroundColor: '#F59E0B' }} title={`Medium: ${mediumVulns}`} />}
                  {lowPct > 0 && <div style={{ width: `${lowPct}%`, backgroundColor: '#38BDF8' }} title={`Low: ${lowVulns}`} />}
                </>
              ) : (
                <div style={{ width: '100%', backgroundColor: '#10B981', opacity: 0.35 }} title="No vulnerabilities detected" />
              )}
            </div>

            {/* Severity Pill Counts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(239, 68, 68, 0.12)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.28)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>CRITICAL</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {String(criticalVulns).padStart(2, '0')}
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(249, 115, 22, 0.12)', borderRadius: 8, border: '1px solid rgba(249, 115, 22, 0.28)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F97316' }}>HIGH</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F97316', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {String(highVulns).padStart(2, '0')}
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.28)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>MEDIUM</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {String(mediumVulns).padStart(2, '0')}
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(56, 189, 248, 0.12)', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.28)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#38BDF8' }}>LOW</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#38BDF8', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {String(lowVulns).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Scanner Embedded Form */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>
            <form onSubmit={handleStartScan}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 8,
                    padding: '4px 12px',
                    gap: 8,
                  }}
                >
                  <Globe size={15} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="url"
                    value={quickScanUrl}
                    onChange={(e) => setQuickScanUrl(e.target.value)}
                    placeholder="https://company-target.com"
                    style={{ border: 'none', background: 'transparent', padding: '6px 0', fontSize: 13, width: '100%', outline: 'none', color: 'var(--text-primary)' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  Scan
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 11. RECENT FINDINGS TABLE (6 Cols) */}
        <div className="bento-col-6 bento-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Recent Vulnerability Findings
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
                  Pending triage & remediation action.
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
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFindings.length > 0 ? (
                    recentFindings.slice(0, 4).map((item: any) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
                          {item.asset}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.finding}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.type}</div>
                        </td>
                        <td>
                          <RiskBadge severity={item.severity} />
                        </td>
                        <td>
                          <span className={`badge ${item.status === 'RESOLVED' ? 'badge-safe' : item.status === 'IN PROGRESS' ? 'badge-warning' : 'badge-critical'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <Link href="/vulnerabilities" style={{ fontSize: 12.5, color: '#3B82F6', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <span>Details</span>
                            <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                        <CheckCircle2 size={24} style={{ color: '#10B981', margin: '0 auto 6px' }} />
                        <div>No open vulnerabilities pending approval</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              FEED: AUTO-CORRELATED
            </span>
            <Link href="/vulnerabilities" style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
              Open CVE Registry &rarr;
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
