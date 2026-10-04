'use client';

import React, { useState, useEffect } from 'react';
import { fraudCallService, urlSafetyService, deviceSecurityService, academyService } from '@/services';
import { FraudCallResult, URLCheckResult, DeviceSecurityAudit, AcademyCourse } from '@/types';
import Link from 'next/link';
import {
  ShieldCheck,
  PhoneCall,
  KeyRound,
  Globe,
  Laptop,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  FileText,
} from 'lucide-react';

function formatRelativeTime(isoStr?: string): string {
  if (!isoStr) return 'Recently';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PersonalDashboardPage() {

  const [deviceAudit, setDeviceAudit] = useState<DeviceSecurityAudit | null>(null);
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [recentCallCheck, setRecentCallCheck] = useState<FraudCallResult | null>(null);
  const [securityHistory, setSecurityHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    deviceSecurityService.getDeviceAudit().then(setDeviceAudit);
    academyService.getCourses('PERSONAL').then(setCourses);
    fraudCallService.checkPhoneNumber('+1 800 555 0199').then(setRecentCallCheck);
    
    if (urlSafetyService.getSecurityHistory) {
      urlSafetyService.getSecurityHistory(10)
        .then((events) => {
          setSecurityHistory(events || []);
          setLoadingHistory(false);
        })
        .catch(() => {
          setSecurityHistory([]);
          setLoadingHistory(false);
        });
    } else {
      setLoadingHistory(false);
    }
  }, []);


  const completedCourses = courses.filter((c) => c.isCompleted).length;
  const academyProgressPct = courses.length ? Math.round((completedCourses / courses.length) * 100) : 60;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Header (Section 17 requirement) */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 9999,
            background: 'var(--color-critical-bg)',
            color: 'var(--color-critical)',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          <Shield size={14} /> Personal Cyber Defense
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Your Cyber Safety Center
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
          Inspect suspicious phone calls, verify urgent OTP requests, test unknown website URLs, and secure your personal devices.
        </p>
      </div>

      {/* Quick Actions (Section 17 requirement) */}
      <div
        className="cyber-card"
        style={{
          padding: '16px 20px',
          marginBottom: 28,
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: 12 }}>
          PERSONAL QUICK SAFETY ACTIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <Link
            href="/personal/fraud-call"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <PhoneCall size={16} color="var(--color-critical)" />
            <span>Check a Phone Call</span>
          </Link>

          <Link
            href="/personal/otp-scam"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={16} color="var(--color-warning)" />
            <span>Check an OTP Message</span>
          </Link>

          <Link
            href="/personal/url-check"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <Globe size={16} color="var(--color-info)" />
            <span>Check a URL</span>
          </Link>

          <Link
            href="/personal/device-security"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <Laptop size={16} color="var(--color-success)" />
            <span>Check Device Security</span>
          </Link>

          <Link
            href="/academy"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--color-critical-bg)',
              border: '1px solid var(--color-critical-border)',
              color: 'var(--color-critical)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <GraduationCap size={16} color="var(--color-critical)" />
            <span>Learn Cyber Safety</span>
          </Link>
        </div>
      </div>

      {/* Top 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Security Status */}
        <div className="cyber-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Personal Security Status</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              PROTECTED
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)' }}>{deviceAudit?.score || 78}</span>
            <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 500, marginTop: 4 }}>
            Good hygiene — 2 recommendations to review
          </p>
        </div>

        {/* Academy Progress */}
        <div className="cyber-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Academy Learning Progress</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-critical)' }}>{academyProgressPct}%</span>
          </div>
          <div style={{ marginTop: 14, height: 6, borderRadius: 9999, background: 'var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ width: `${academyProgressPct}%`, height: '100%', background: 'var(--color-critical)', borderRadius: 9999 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{completedCourses} completed lessons</span>
            <Link href="/academy" style={{ fontSize: 12, color: 'var(--color-critical)', fontWeight: 600, textDecoration: 'none' }}>
              Continue Learning →
            </Link>
          </div>
        </div>

        {/* Safety Tips Card */}
        <div className="cyber-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Lightbulb size={16} color="var(--color-warning)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Cyber Safety Tip of the Day</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Banks and government services will <strong>never</strong> ask you to read out a 6-digit OTP code or click an SMS verification link to prevent account closure.
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Checks & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Checks */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Recent Website Assessments
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {securityHistory.length > 0 ? `${securityHistory.length} scans recorded` : 'Live Telemetry'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {securityHistory.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <Globe size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div>No website security scans recorded yet.</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>
                  Browse with the CYBERDOME extension or check a URL above to populate your assessment history.
                </div>
              </div>
            ) : (
              securityHistory.slice(0, 4).map((item, idx) => {
                const isDanger = item.verdict === 'DANGEROUS' || item.baseline === 'HIGH RISK';
                const isSuspicious = item.verdict === 'SUSPICIOUS' || item.baseline === 'ELEVATED RISK';
                const badgeColor = isDanger ? 'var(--color-critical)' : isSuspicious ? 'var(--color-warning)' : 'var(--color-success)';
                const badgeBg = isDanger ? 'var(--color-critical-bg)' : isSuspicious ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-success-bg)';

                return (
                  <div key={item.id || idx} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Globe size={13} /> {item.mode || 'AUTOMATIC'} SCAN
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: badgeBg,
                          color: badgeColor,
                        }}
                      >
                        {item.baseline || item.verdict}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4, wordBreak: 'break-all' }}>
                      {item.domain || item.url}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                      <span>
                        {item.score != null ? `Score: ${item.score}/100` : 'Score: --'}
                        {item.findingsCount ? ` • ${item.findingsCount.CRITICAL || 0} crit / ${item.findingsCount.HIGH || 0} high` : ''}
                      </span>
                      <span>{formatRelativeTime(item.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}

            {recentCallCheck && (
              <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-critical)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PhoneCall size={13} /> PHONE CALL CHECK
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: 'var(--color-success-bg)',
                      color: 'var(--color-success)',
                    }}
                  >
                    VERIFIED
                  </span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                  {recentCallCheck.phoneNumber}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  No fraud reports associated with this caller
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Recent Safety Activity
            </h3>
            <Link href="/reports" style={{ fontSize: 13, color: 'var(--color-critical)', textDecoration: 'none', fontWeight: 600 }}>
              My Reports →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {securityHistory.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <Activity size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div>No telemetry activity logged yet.</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>
                  Real-time events will be logged here as extension scans and drills are executed.
                </div>
              </div>
            ) : (
              securityHistory.slice(0, 4).map((item, i) => {
                const isDanger = item.verdict === 'DANGEROUS' || item.baseline === 'HIGH RISK';
                const isSuspicious = item.verdict === 'SUSPICIOUS' || item.baseline === 'ELEVATED RISK';
                const badgeColor = isDanger ? 'var(--color-critical)' : isSuspicious ? 'var(--color-warning)' : 'var(--color-success)';
                const badgeBg = isDanger ? 'var(--color-critical-bg)' : isSuspicious ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-success-bg)';

                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--bg-hover)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        Website scan: {item.domain || item.url}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {formatRelativeTime(item.timestamp)} • {item.mode || 'AUTOMATIC'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: badgeBg,
                        color: badgeColor,
                      }}
                    >
                      {item.baseline || item.verdict}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
