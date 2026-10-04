// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel, DemoBanner, MetricCard, SecurityScore } from '@/components/ui';
import { Radar, ShieldAlert, Server, CheckCircle2, TrendingUp, Cpu, Radio, Shield } from 'lucide-react';
import { dashboardService } from '@/services';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await dashboardService.getMetrics();
        setMetrics(data);
      } catch (e) {
        console.error('Error fetching analytics metrics:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="page-container" style={{ textAlign: 'center', padding: 40 }}>Loading analytics...</div>;
  }

  const secScore = metrics?.securityScore ?? 0;
  const totalAssets = metrics?.totalAssets ?? 0;
  const critVulns = metrics?.criticalVulnerabilities ?? 0;
  const highVulns = metrics?.highVulnerabilities ?? 0;
  const medVulns = metrics?.mediumVulnerabilities ?? 0;
  const lowVulns = metrics?.lowVulnerabilities ?? 0;
  const resolvedIncidents = metrics?.resolvedIncidents ?? 0;

  const threatsByType = metrics?.threatsByType || [];
  const detectionsBySource = metrics?.detectionsBySource || [];
  return (
    <div className="page-container" style={{ maxWidth: 1300, margin: '0 auto' }}>
      <DemoBanner />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Threat Intelligence & Analytics
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', marginTop: 4 }}>
          Aggregate visibility across attack vectors, telemetry sources, and vulnerability velocity.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <MetricCard label="Security Score" value={secScore > 0 ? `${secScore}/100` : "No data available"} color="var(--color-warning)" icon={<Shield size={18} color="var(--color-warning)" />} change={secScore > 0 ? "Calculated by backend" : ""} trendDirection="up" />
        <MetricCard label="Protected Assets" value={totalAssets > 0 ? totalAssets : "No data available"} icon={<Server size={18} />} color="var(--color-info)" change="Active inventory" />
        <MetricCard label="Critical Vulnerabilities" value={critVulns > 0 ? critVulns : (totalAssets > 0 ? 0 : "No data available")} icon={<ShieldAlert size={18} color="var(--color-critical)" />} color="var(--color-critical)" change={critVulns > 0 ? "Requires immediate triage" : ""} trendDirection="down" />
        <MetricCard label="Resolved Incidents" value={resolvedIncidents > 0 ? resolvedIncidents : "No data available"} icon={<CheckCircle2 size={18} color="var(--color-success)" />} color="var(--color-success)" change="" trendDirection="up" />
      </div>

      {/* 2-Column Analytical Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Threats by Attack Vector */}
        <div className="glass-panel">
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Threats by Attack Category
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Incident telemetry mapped against MITRE ATT&CK vectors.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {threatsByType.length > 0 ? threatsByType.map((t: any) => (
              <div key={t.type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.type}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.count} events</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="fill"
                    style={{
                      width: `${(t.count / 70) * 100}%`,
                      backgroundColor: t.count > 40 ? 'var(--color-critical)' : t.count > 25 ? 'var(--color-warning)' : 'var(--color-info)'
                    }}
                  />
                </div>
              </div>
            )) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available</div>
            )}
          </div>
        </div>

        {/* Detections by Telemetry Source */}
        <div className="glass-panel">
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Detections by Telemetry Sensor
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Volume of security events ingested from network, endpoints, and identity.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {detectionsBySource.length > 0 ? detectionsBySource.map((d: any) => (
              <div key={d.source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{d.source}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.count} signals</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="fill"
                    style={{
                      width: `${(d.count / 350) * 100}%`,
                      backgroundColor: 'var(--color-info)'
                    }}
                  />
                </div>
              </div>
            )) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Vulnerability Severity Distribution Matrix */}
      <div className="glass-panel">
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          Vulnerability Severity Distribution
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Categorized exposure across all active internal and DMZ assets.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ padding: 18, backgroundColor: 'var(--color-critical-bg)', borderRadius: 8, border: '1px solid var(--color-critical-border)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-critical)', fontFamily: 'var(--font-mono)' }}>{critVulns}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-critical)', marginTop: 4 }}>CRITICAL SEVERITY</div>
          </div>
          <div style={{ padding: 18, backgroundColor: 'var(--color-warning-bg)', borderRadius: 8, border: '1px solid var(--color-warning-border)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>{highVulns}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-warning)', marginTop: 4 }}>HIGH RISK</div>
          </div>
          <div style={{ padding: 18, backgroundColor: 'var(--color-warning-bg)', borderRadius: 8, border: '1px solid var(--color-warning-border)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>{medVulns}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-warning)', marginTop: 4 }}>MEDIUM RISK</div>
          </div>
          <div style={{ padding: 18, backgroundColor: 'var(--color-info-bg)', borderRadius: 8, border: '1px solid var(--color-info-border)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-info)', fontFamily: 'var(--font-mono)' }}>{lowVulns}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-info)', marginTop: 4 }}>LOW RISK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
