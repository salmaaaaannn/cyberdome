// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassPanel, RiskBadge, StatusIndicator, DemoBanner, MetricCard } from '@/components/ui';
import { detectionService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { ShieldCheck, Target, Search } from 'lucide-react';

export default function DetectionRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await detectionService.getRules();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to load detection rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  useRealtimeEvents((event) => {
    if (['detection_created', 'security_event'].includes(event.type)) {
      loadRules();
    }
  });

  const activeRules = rules.filter(r => (r.status || '').toLowerCase() === 'active');
  const totalHits = rules.reduce((s, r) => s + (r.hits || 0), 0);

  const filteredRules = rules.filter(r => {
    const nameMatch = r.name ? r.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const descMatch = r.description ? r.description.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const ruleIdMatch = r.ruleId ? r.ruleId.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    return nameMatch || descMatch || ruleIdMatch;
  });

  return (
    <div className="page-container">
      <DemoBanner />

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 20 }}>
        <MetricCard label="Total Rules" value={rules.length} icon="📋" />
        <MetricCard label="Active Rules" value={activeRules.length} color="var(--color-success)" icon="✅" />
        <MetricCard label="Total Detections" value={totalHits} icon="🎯" color="var(--color-info)" />
        <MetricCard label="Engine Mode" value="Deterministic" icon="⚡" color="var(--color-success)" />
      </div>

      <GlassPanel style={{ marginTop: 20 }}>
        <div className="flex-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4>Deterministic Detection Rules</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Explainable security detection logic applied to normalized network, IoT, and identity telemetry.
            </p>
          </div>

          <div style={{ position: 'relative', width: 280 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search detection rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ width: '100%', padding: '6px 10px 6px 32px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {filteredRules.length > 0 ? (
          filteredRules.map(rule => (
            <div key={rule.id} className="cyber-card" style={{ marginBottom: 12, padding: 16 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="flex-center gap-sm" style={{ justifyContent: 'flex-start', marginBottom: 4 }}>
                    <RiskBadge severity={rule.severity} />
                    <StatusIndicator status={(rule.status || '').toLowerCase() === 'active' ? 'SAFE' : 'UNKNOWN'} label={rule.status} />
                    <span className="badge badge-info">{rule.source || 'TELEMETRY'}</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ID: {rule.ruleId || rule.id}
                    </span>
                  </div>
                  <h5>{rule.name}</h5>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rule.description}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: (rule.hits || 0) > 0 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                    {rule.hits || 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>detections</div>
                </div>
              </div>

              {rule.rule && (
                <pre style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'auto', maxHeight: 120 }}>
                  {typeof rule.rule === 'object' ? JSON.stringify(rule.rule, null, 2) : rule.rule}
                </pre>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {(rule.tags || ['baseline', 'explainable']).map((t: string) => (
                  <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-surface)', borderRadius: 100, color: 'var(--text-muted)' }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No detection rules configured yet
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
