// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassPanel, StatusIndicator, DemoBanner, MetricCard, GlowButton } from '@/components/ui';
import { soarService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { Play, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export default function SOARPage() {
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pbList, execList] = await Promise.all([
        soarService.getPlaybooks(),
        soarService.getExecutions()
      ]);
      if (Array.isArray(pbList)) setPlaybooks(pbList);
      if (Array.isArray(execList)) setExecutions(execList);
    } catch (e) {
      console.error('Failed to load SOAR data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeEvents((event) => {
    if (['incident_updated', 'security_event'].includes(event.type)) {
      loadData();
    }
  });

  const handleExecute = async (playbookId: string) => {
    try {
      setExecutingId(playbookId);
      setFeedback(null);
      const res = await soarService.executePlaybook(playbookId, {});
      setFeedback({
        type: 'success',
        message: `Playbook executed successfully (Status: ${res.status || 'SUCCESS'})`
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Execution failed: ${err.message || 'Error occurred'}`
      });
    } finally {
      setExecutingId(null);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const activeCount = playbooks.filter(p => p.status === 'active' || p.status === 'ACTIVE').length;
  const totalExecutions = executions.length;

  return (
    <div className="page-container">
      <DemoBanner />

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          backgroundColor: feedback.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
          border: `1px solid ${feedback.type === 'success' ? 'var(--color-success-border)' : 'var(--color-critical-border)'}`,
          color: feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-critical)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 20 }}>
        <MetricCard label="Playbooks" value={playbooks.length} icon="🔄" />
        <MetricCard label="Active" value={activeCount} color="var(--color-success)" icon="✅" />
        <MetricCard label="Executions" value={totalExecutions} icon="▶" color="var(--color-info)" />
        <MetricCard label="Safety Status" value="Demo-Safe" icon="🛡" color="var(--color-success)" />
      </div>

      {/* Playbooks Section */}
      <GlassPanel style={{ marginTop: 20 }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h4>Automated SOAR Playbooks</h4>
          <span className="badge badge-safe" style={{ fontSize: '0.75rem' }}>Deterministic Execution</span>
        </div>

        {playbooks.length > 0 ? (
          playbooks.map(pb => {
            const isExecuting = executingId === pb.id;
            const steps = Array.isArray(pb.steps) ? pb.steps : [];

            return (
              <div key={pb.id} className="cyber-card" style={{ marginBottom: 16, padding: 20 }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div>
                    <h5>{pb.name}</h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pb.description}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusIndicator status={(pb.status || '').toLowerCase() === 'active' ? 'SAFE' : 'UNKNOWN'} label={pb.status || 'Active'} />
                    <button
                      onClick={() => handleExecute(pb.id)}
                      disabled={isExecuting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 6,
                        background: 'var(--cyberdome-red)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: isExecuting ? 'not-allowed' : 'pointer',
                        opacity: isExecuting ? 0.7 : 1
                      }}
                    >
                      <Play size={12} />
                      <span>{isExecuting ? 'Running...' : 'Execute'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Trigger: <span style={{ color: 'var(--text-secondary)' }}>{pb.trigger || pb.trigger_type || 'MANUAL'}</span></span>
                  <span>Executions: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pb.executions || 0}</span></span>
                  <span>Avg Duration: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pb.avgDuration || 'Sub-second'}</span></span>
                </div>

                {steps.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {steps.map((step: any, i: number) => (
                      <div key={step.id || i} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: step.status === 'success' ? 'rgba(0, 232, 135, 0.15)' : 'var(--bg-surface)',
                          border: `1px solid ${step.status === 'success' ? 'var(--color-success)' : 'var(--border-primary)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: step.status === 'success' ? 'var(--color-success)' : 'var(--text-muted)'
                        }}>
                          {step.status === 'success' ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {step.name || step.action}
                        </span>
                        {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border-primary)', marginLeft: 4 }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No security playbooks configured yet
          </div>
        )}
      </GlassPanel>

      {/* Real Executions Audit Log Section */}
      <GlassPanel style={{ marginTop: 20 }}>
        <h4 style={{ marginBottom: 16 }}>Playbook Execution History</h4>
        {executions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>EXECUTION ID</th>
                  <th>PLAYBOOK</th>
                  <th>STATUS</th>
                  <th>ACTOR</th>
                  <th>STARTED AT</th>
                  <th>COMPLETED AT</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex: any) => (
                  <tr key={ex.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{ex.id}</td>
                    <td style={{ fontWeight: 600 }}>{ex.playbook_name || ex.playbook_id}</td>
                    <td>
                      <span className={`badge ${ex.status === 'SUCCESS' ? 'badge-safe' : ex.status === 'FAILED' ? 'badge-critical' : 'badge-warning'}`}>
                        {ex.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{ex.actor_id || 'System / Admin'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {ex.started_at ? new Date(ex.started_at).toLocaleString() : 'Recently'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {ex.completed_at ? new Date(ex.completed_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No playbook executions recorded
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

