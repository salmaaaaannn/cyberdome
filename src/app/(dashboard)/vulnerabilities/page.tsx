// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel, MetricCard, RiskBadge, DemoBanner, CyberTabs } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { websiteAssessmentService } from '@/services';
import { Vulnerability, WebsiteAssessment } from '@/types';
import Link from 'next/link';
import { ShieldAlert, Bug, AlertTriangle, ArrowRight, Globe, Server, CheckCircle2 } from 'lucide-react';

export default function VulnerabilitiesPage() {
  const { websiteAssessmentTarget, activeWebsiteAssessment, setActiveWebsiteAssessment } = useAppStore();
  const [assessment, setAssessment] = useState<WebsiteAssessment | null>(activeWebsiteAssessment);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEBSITE_TARGET' | 'ENTERPRISE'>('ALL');
  const [severityFilter, setSeverityFilter] = useState('All');

  useEffect(() => {
    if (!assessment) {
      websiteAssessmentService.getWebsiteAssessment('assess-example-01').then(res => {
        setAssessment(res);
        setActiveWebsiteAssessment(res);
      });
    }
  }, [assessment, setActiveWebsiteAssessment]);

  const targetVulns = assessment?.vulnerabilities || [];
  const enterpriseVulns = [];

  let combinedVulns: Vulnerability[] = [];
  if (sourceFilter === 'WEBSITE_TARGET') {
    combinedVulns = targetVulns;
  } else if (sourceFilter === 'ENTERPRISE') {
    combinedVulns = enterpriseVulns;
  } else {
    combinedVulns = [...targetVulns, ...enterpriseVulns];
  }

  const filtered = severityFilter === 'All'
    ? combinedVulns
    : combinedVulns.filter(v => v.severity === severityFilter);

  const critCount = combinedVulns.filter(v => v.severity === 'CRITICAL').length;
  const highCount = combinedVulns.filter(v => v.severity === 'HIGH').length;
  const kevCount = combinedVulns.filter(v => v.cisaKev).length;
  const exploitCount = combinedVulns.filter(v => v.exploitAvailable).length;

  return (
    <div className="page-container" style={{ maxWidth: 1300, margin: '0 auto' }}>
      <DemoBanner />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Vulnerability Assessment
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, marginTop: 4 }}>
              Known CVE weaknesses correlated with observable web technologies and infrastructure.
            </p>
          </div>

          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-hover)',
            padding: 3,
            borderRadius: 8,
            gap: 2
          }}>
            {(['ALL', 'WEBSITE_TARGET', 'ENTERPRISE'] as const).map(f => (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: sourceFilter === f ? 600 : 500,
                  backgroundColor: sourceFilter === f ? 'var(--bg-surface)' : 'transparent',
                  color: sourceFilter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderRadius: 6,
                  border: 'none',
                  boxShadow: sourceFilter === f ? '0 1px 2px rgba(16,24,40,0.06)' : 'none',
                  cursor: 'pointer'
                }}>
                {f === 'ALL' ? 'All Vulnerabilities' : f === 'WEBSITE_TARGET' ? `Target: ${assessment?.domain || 'Website'}` : 'Enterprise Assets'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Context Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 8,
        border: '1px solid var(--border-primary)',
        marginBottom: 24,
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={18} style={{ color: 'var(--color-info)' }} />
          <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Active Assessment Target: <strong style={{ color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>{assessment?.targetUrl || websiteAssessmentTarget || 'https://example.com'}</strong>
          </span>
        </div>
        <Link href="/website-security" className="btn btn-secondary btn-sm" style={{ color: 'var(--cyberx-red)' }}>
          Re-Assess Website →
        </Link>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <MetricCard label="Active CVEs" value={combinedVulns.length} icon={<Bug size={18} />} />
        <MetricCard label="Critical Severity" value={critCount} color="var(--color-critical)" icon={<ShieldAlert size={18} color="var(--color-critical)" />} />
        <MetricCard label="High Severity" value={highCount} color="var(--color-warning)" icon={<AlertTriangle size={18} color="var(--color-warning)" />} />
        <MetricCard label="CISA KEV Catalog" value={kevCount} color="var(--color-critical)" icon={<ShieldAlert size={18} color="var(--color-critical)" />} />
      </div>

      {/* Vulnerabilities Table Container */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Vulnerability Registry
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Severity prioritized list of correlated weaknesses.
            </p>
          </div>
          <CyberTabs tabs={['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']} activeTab={severityFilter} onTabChange={setSeverityFilter} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((v, i) => (
            <div
              key={v.id}
              style={{
                padding: '20px 24px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                backgroundColor: 'var(--bg-surface)',
                transition: 'background-color 0.15s ease'
              }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyberx-red)', fontSize: 14 }}>
                    {v.cveId}
                  </span>
                  <RiskBadge severity={v.severity} />
                  {v.cisaKev && <span className="badge badge-critical">CISA KEV ACTIVE</span>}
                  {v.exploitAvailable && <span className="badge badge-critical">EXPLOIT CODE KNOWN</span>}
                </div>

                <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {v.title}
                </h4>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 800 }}>
                  {v.description}
                </p>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>
                  <span>Affected: <strong style={{ color: 'var(--text-primary)' }}>{v.affectedAssets.join(', ')}</strong></span>
                  <span>•</span>
                  <span>{v.patchAvailable ? '✓ Patch available' : '⚠ Virtual patch recommended'}</span>
                </div>
              </div>

              {/* CVSS & EPSS Scores */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>CVSS SCORE</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: v.cvssScore >= 9 ? 'var(--color-critical)' : 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
                    {v.cvssScore}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>EPSS PROBABILITY</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: v.epssScore >= 0.4 ? 'var(--color-critical)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {(v.epssScore * 100).toFixed(1)}%
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'center' }}>
                  Remediate →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
