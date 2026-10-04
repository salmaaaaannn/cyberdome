// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel, MetricCard, StatusIndicator, DemoBanner } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { assetService, websiteAssessmentService } from '@/services';
import { WebsiteAssessment, ObservableAsset } from '@/types';
import Link from 'next/link';
import { Globe, Server, Crosshair, ShieldCheck, ExternalLink } from 'lucide-react';

export default function AttackSurfacePage() {
  const { websiteAssessmentTarget, activeWebsiteAssessment, setActiveWebsiteAssessment } = useAppStore();
  const [viewMode, setViewMode] = useState<'WEBSITE' | 'ENTERPRISE'>('WEBSITE');
  const [assessment, setAssessment] = useState<WebsiteAssessment | null>(activeWebsiteAssessment);
  const [filterType, setFilterType] = useState('ALL');
  const [internalAssets, setInternalAssets] = useState<any[]>([]);

  useEffect(() => {
    if (!assessment) {
      websiteAssessmentService.getWebsiteAssessment('assess-example-01').then(res => {
        setAssessment(res);
        setActiveWebsiteAssessment(res);
      });
    }
  }, [assessment, setActiveWebsiteAssessment]);

  useEffect(() => {
    assetService.getAssets().then(setInternalAssets);
  }, []);

  const targetDomain = assessment?.domain || 'example.com';
  const observableAssets = assessment?.observableAssets || [];
  const filteredObservable = filterType === 'ALL'
    ? observableAssets
    : observableAssets.filter(a => a.type.toUpperCase() === filterType);

  return (
    <div className="page-container" style={{ maxWidth: 1300, margin: '0 auto' }}>
      <DemoBanner />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Attack Surface Management
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, marginTop: 4 }}>
              Observable perimeter discovery, exposed public services, DNS zones, and enterprise asset inventory.
            </p>
          </div>

          {/* Mode Switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-hover)',
            padding: 3,
            borderRadius: 8,
            gap: 2
          }}>
            <button
              onClick={() => setViewMode('WEBSITE')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: viewMode === 'WEBSITE' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'WEBSITE' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: viewMode === 'WEBSITE' ? 600 : 500,
                boxShadow: viewMode === 'WEBSITE' ? '0 1px 2px rgba(16,24,40,0.06)' : 'none',
                cursor: 'pointer'
              }}>
              Website Attack Surface
            </button>
            <button
              onClick={() => setViewMode('ENTERPRISE')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: viewMode === 'ENTERPRISE' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'ENTERPRISE' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: viewMode === 'ENTERPRISE' ? 600 : 500,
                boxShadow: viewMode === 'ENTERPRISE' ? '0 1px 2px rgba(16,24,40,0.06)' : 'none',
                cursor: 'pointer'
              }}>
              Enterprise Inventory
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: WEBSITE ATTACK SURFACE */}
      {viewMode === 'WEBSITE' && (
        <>
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
              <div>
                <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                  Current Target Context: <strong style={{ color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>{assessment?.targetUrl || websiteAssessmentTarget || 'https://example.com'}</strong>
                </span>
              </div>
            </div>
            <Link href="/website-security" className="btn btn-secondary btn-sm" style={{ color: 'var(--cyberx-red)' }}>
              Switch Target Domain →
            </Link>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <MetricCard label="Observable Assets" value={assessment?.totalObservableAssets || 12} icon={<Globe size={18} />} color="var(--color-info)" />
            <MetricCard label="Subdomains" value={assessment?.subdomainsCount || 4} icon={<Crosshair size={18} />} color="var(--color-info)" />
            <MetricCard label="Exposed Services" value={assessment?.servicesCount || 5} icon={<Server size={18} />} color="var(--color-warning)" />
            <MetricCard label="Detected Technologies" value={assessment?.technologiesCount || 6} icon={<ShieldCheck size={18} />} />
          </div>

          {/* Observable Assets Table */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Observable Perimeter for {targetDomain}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  Passive non-destructive discovery of DNS records, hosts, public ports, and certificates.
                </p>
              </div>

              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['ALL', 'DOMAIN', 'SUBDOMAIN', 'SERVICE', 'TECHNOLOGY', 'CERTIFICATE'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: filterType === f ? 600 : 500,
                      backgroundColor: filterType === f ? 'var(--color-critical-bg)' : 'var(--bg-elevated)',
                      color: filterType === f ? 'var(--color-critical)' : 'var(--text-muted)',
                      border: `1px solid ${filterType === f ? 'var(--color-critical-border)' : 'var(--border-subtle)'}`,
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ASSET NAME</th>
                    <th>TYPE</th>
                    <th>TARGET IDENTIFIER</th>
                    <th>EXPOSURE</th>
                    <th>DISCOVERY DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObservable.map(asset => (
                    <tr key={asset.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{asset.name}</td>
                      <td><span className="badge badge-info">{asset.type.toUpperCase()}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-info)' }}>{asset.target}</td>
                      <td>
                        <span className={`badge ${asset.exposure === 'PUBLIC' ? 'badge-warning' : 'badge-safe'}`}>
                          {asset.exposure}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{asset.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW MODE 2: ENTERPRISE ASSET INVENTORY */}
      {viewMode === 'ENTERPRISE' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <MetricCard label="Internal Assets" value={internalAssets.length} icon={<Server size={18} />} color="var(--color-info)" />
            <MetricCard label="DMZ Servers" value="3" icon={<Globe size={18} />} color="var(--color-warning)" />
            <MetricCard label="Cloud Resources" value="6" icon={<Server size={18} />} />
            <MetricCard label="Databases" value="2" icon={<ShieldCheck size={18} />} color="var(--color-success)" />
          </div>

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                Internal Corporate Asset Inventory
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ASSET</th>
                    <th>TYPE</th>
                    <th>IP ADDRESS</th>
                    <th>STATUS</th>
                    <th>RISK SCORE</th>
                    <th>VULNERABILITIES</th>
                    <th>LOCATION</th>
                  </tr>
                </thead>
                <tbody>
                  {internalAssets.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{a.hostname}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{a.type}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{a.ip}</td>
                      <td><StatusIndicator status={a.status} label={a.status} /></td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.riskScore >= 80 ? 'var(--color-critical)' : a.riskScore >= 50 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {a.riskScore}
                        </span>
                      </td>
                      <td>
                        {a.criticalVulns > 0 && <span style={{ color: 'var(--color-critical)', fontWeight: 700 }}>{a.criticalVulns}C </span>}
                        {a.vulnerabilities}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
