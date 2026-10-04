// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { GlassPanel, StatusIndicator, MetricCard, GlowButton, RiskBadge } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { Box, Layers, Play, RefreshCw, AlertTriangle, ShieldCheck, ExternalLink, Cpu } from 'lucide-react';
import { digitalTwinService } from '@/services';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

// Dynamic import with ssr: false for Three.js / R3F Canvas
const DigitalTwin3DScene = dynamic(() => import('@/components/3d/DigitalTwin3DScene'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 520, background: 'var(--bg-subtle)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Cpu size={28} className="animate-spin" color="var(--cyberdome-red)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading 3D Digital Twin Infrastructure...</span>
      </div>
    </div>
  ),
});

export default function DigitalTwinPage() {
  const { activeSimulation, resetWhatIfPropagation } = useAppStore();
  const [nodes, setNodes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const [nList, cList] = await Promise.all([
          digitalTwinService.getNodes(),
          digitalTwinService.getConnections(),
        ]);
        if (mounted) {
          setNodes(nList || []);
          setConnections(cList || []);
          if (nList && nList.length > 0) {
            setSelectedNodeId(nList[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load digital twin state:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  useRealtimeEvents((event) => {
    if (event.type === 'asset_status_changed' && event.data?.asset_id) {
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === event.data.asset_id || n.entityId === event.data.asset_id
            ? { ...n, status: event.data.status || n.status, riskScore: event.data.risk_score ?? n.riskScore }
            : n
        )
      );
    } else if (['detection_created', 'incident_created', 'security_event'].includes(event.type)) {
      digitalTwinService.getNodes().then((nList) => {
        if (nList && nList.length > 0) setNodes(nList);
      });
    }
  });

  const selected = nodes.find((n) => n.id === selectedNodeId);

  const nodeColors: Record<string, string> = { SAFE: '#00E887', ONLINE: '#00E887', WARNING: '#FFB020', CRITICAL: '#FF1744', OFFLINE: '#66717D' };
  const typeIcons: Record<string, string> = { internet: '🌐', firewall: '🔥', server: '💻', application: '📱', database: '💾', iot: '📡', cloud: '☁', router: '🔀', workstation: '🖥️' };

  const isSimActive = !!activeSimulation && activeSimulation.status === 'SIMULATING';
  const compromisedCount = activeSimulation?.compromisedNodeIds?.length || 0;

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Active What-If Simulation Alert Banner */}
      {isSimActive && (
        <div
          style={{
            margin: '16px 0 20px',
            padding: '14px 20px',
            background: 'rgba(217, 45, 32, 0.08)',
            border: '1px solid var(--cyberdome-red)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="var(--cyberdome-red)" />
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--cyberdome-red)' }}>
                [WHAT-IF SIMULATION RUNNING]: Attack Scenario Cascade Active
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {compromisedCount} asset{compromisedCount > 1 ? 's' : ''} compromised along attack cascade paths. Real baseline assets are unaffected.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={resetWhatIfPropagation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} /> Reset Simulation State
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 16 }}>
        <MetricCard label="Network Digital Nodes" value={nodes.length} icon="🌀" color="var(--color-info)" />
        <MetricCard label="Inter-Asset Connections" value={connections.length} icon="🔗" />
        <MetricCard
          label="Active Attack Paths"
          value={isSimActive ? activeSimulation.activeAttackPathIds.length : connections.filter((c) => c.status === 'critical').length}
          color="var(--cyberdome-red)"
          icon="⚡"
        />
        <MetricCard
          label="Digital Twin Health"
          value={isSimActive ? `${100 - activeSimulation.projectedRisk}%` : nodes.length > 0 ? `${Math.max(0, 100 - Math.round(nodes.reduce((acc, n) => acc + (n.riskScore || 0), 0) / nodes.length))}%` : '100%'}
          color={isSimActive ? 'var(--cyberdome-red)' : 'var(--color-success)'}
          icon="💚"
        />
      </div>

      {/* Main Digital Twin Canvas + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '2.5fr 1fr' : '1fr', gap: 20, marginTop: 24 }}>
        <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 20 }}>
          {/* Header & View Mode Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Security Digital Twin Environment</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Real-time 3D telemetry mirroring verified database assets, IoT devices, and active network connections.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6, background: 'var(--bg-subtle)', padding: 3, borderRadius: 6 }}>
              <button
                onClick={() => setViewMode('3D')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: viewMode === '3D' ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === '3D' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: viewMode === '3D' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === '3D' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                3D Spatial Twin
              </button>
              <button
                onClick={() => setViewMode('2D')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: viewMode === '2D' ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === '2D' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: viewMode === '2D' ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === '2D' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                2D Schematic Map
              </button>
            </div>
          </div>

          {/* Interactive Visualizer Canvas */}
          {isLoading ? (
            <div style={{ height: 540, background: 'var(--bg-subtle)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Cpu size={28} className="animate-spin" color="var(--cyberdome-red)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading 3D Digital Twin Infrastructure...</span>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel)', borderRadius: 8, border: '1px dashed var(--border-primary)', padding: 24, textAlign: 'center' }}>
              <Box size={48} color="#00E887" style={{ marginBottom: 16 }} />
              <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>No Digital Twin Nodes Discovered</h4>
              <p style={{ color: 'var(--text-muted)', maxWidth: 440, fontSize: '0.9rem', marginBottom: 20 }}>
                The 3D Digital Twin renders your real infrastructure topology. Register assets, enroll endpoint agents, or connect IoT devices to generate a live 3D telemetry twin.
              </p>
              <Link href="/assets" style={{ textDecoration: 'none' }}>
                <GlowButton variant="primary">Add Assets to Topology</GlowButton>
              </Link>
            </div>
          ) : viewMode === '3D' ? (
            <div style={{ height: 540, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <DigitalTwin3DScene
                nodes={nodes}
                connections={connections}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => setSelectedNodeId(id)}
                activeSimulation={activeSimulation}
              />
            </div>
          ) : (
            <div style={{ position: 'relative', height: 540, background: 'var(--bg-subtle)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              {/* 2D Schematic SVG */}
              <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                {connections.map((conn) => {
                  const src = nodes.find((n) => n.id === conn.source);
                  const tgt = nodes.find((n) => n.id === conn.target);
                  if (!src || !tgt) return null;
                  const isCompromised = activeSimulation?.compromisedNodeIds?.includes(conn.source) && activeSimulation?.compromisedNodeIds?.includes(conn.target);
                  const color = isCompromised || conn.status === 'critical' ? '#FF1744' : '#CBD5E1';

                  return (
                    <line
                      key={conn.id}
                      x1={`${(src.position.x / 8) * 100}%`}
                      y1={`${(src.position.y / 6) * 100}%`}
                      x2={`${(tgt.position.x / 8) * 100}%`}
                      y2={`${(tgt.position.y / 6) * 100}%`}
                      stroke={color}
                      strokeWidth={isCompromised ? 3 : 1.5}
                      strokeDasharray={isCompromised ? '5 5' : 'none'}
                    />
                  );
                })}
              </svg>

              {/* 2D Nodes */}
              {nodes.map((node) => {
                const isCompromised = activeSimulation?.compromisedNodeIds?.includes(node.id);
                const isSelected = selectedNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      position: 'absolute',
                      left: `${(node.position.x / 8) * 100}%`,
                      top: `${(node.position.y / 6) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      background: isCompromised ? 'var(--color-critical-bg)' : isSelected ? 'var(--color-info-bg)' : 'var(--bg-surface)',
                      border: `2px solid ${isCompromised ? 'var(--cyberdome-red)' : nodeColors[node.status] || 'var(--border-primary)'}`,
                      borderRadius: 6,
                      boxShadow: isCompromised ? '0 0 12px rgba(255,23,68,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                      zIndex: isSelected ? 10 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      minWidth: 100,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{typeIcons[node.type] || '💻'}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{node.name}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{node.ip}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Node Inspector Sidebar */}
        {selected && (
          <div
            className="white-card"
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                  Node Telemetry Inspector
                </span>
                <h4 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 700 }}>{selected.name}</h4>
              </div>
              <RiskBadge severity={selected.status === 'CRITICAL' ? 'CRITICAL' : selected.status === 'WARNING' ? 'MEDIUM' : 'LOW'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Node ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selected.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>IP Address</span>
                <span style={{ fontFamily: 'monospace' }}>{selected.ip}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Asset Type</span>
                <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selected.type}</span>
              </div>

              {Object.entries(selected.metadata || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                href="/what-if"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--cyberdome-red)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <Play size={14} /> Simulate Attack on Node
              </Link>

              <Link
                href="/attack-graph"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <ExternalLink size={14} /> View Attack Path In Graph
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
