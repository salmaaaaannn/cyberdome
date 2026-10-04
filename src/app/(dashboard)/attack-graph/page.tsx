// @ts-nocheck
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, ConnectionMode, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { GlassPanel, RiskBadge, StatusIndicator } from '@/components/ui';
import { attackGraphService } from '@/services';
import { ShieldCheck, Network, AlertTriangle } from 'lucide-react';

function CustomNode({ data }: { data: { label: string; riskScore: number; status: string; type: string; vulnerabilities: string[]; isChokePoint?: boolean } }) {
  const color = data.status === 'CRITICAL' ? 'var(--cyberdome-red)' : data.status === 'WARNING' ? 'var(--color-warning)' : 'var(--color-success)';
  const icons: Record<string, string> = { internet: '🌐', router: '🔀', server: '💻', gateway: '🚪', application: '📱', database: '💾', iot: '📡' };
  
  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `2px solid ${color}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      minWidth: 150,
      boxShadow: data.isChokePoint ? `0 0 18px #FF174480` : data.status === 'CRITICAL' ? `0 0 15px ${color}40` : 'none',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      {data.isChokePoint && (
        <span style={{
          position: 'absolute',
          top: -10,
          right: 8,
          background: '#FF1744',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '4px',
          letterSpacing: '0.05em'
        }}>
          CHOKE POINT
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span>{icons[data.type] || '⬡'}</span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.85rem' }}>{data.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusIndicator status={data.status} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color }}>Score: {data.riskScore}</span>
      </div>
      {data.vulnerabilities && data.vulnerabilities.length > 0 && (
        <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--cyberdome-red)', fontFamily: 'var(--font-mono)' }}>
          {data.vulnerabilities.slice(0, 2).join(', ')}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { custom: CustomNode };
const defaultEdgeOptions = { type: 'smoothstep' };

export default function AttackGraphPage() {
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[]; chokePoints: string[]; possiblePaths: any[] }>({
    nodes: [],
    edges: [],
    chokePoints: [],
    possiblePaths: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadRealGraph() {
      try {
        setIsLoading(true);
        const data = await attackGraphService.getGraph();
        if (mounted) {
          setGraphData(data);
        }
      } catch (err) {
        console.error('Failed to load attack graph:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadRealGraph();
    return () => { mounted = false; };
  }, []);

  const nodes: Node[] = useMemo(() => {
    return graphData.nodes.map(n => ({
      id: n.id,
      type: 'custom',
      position: n.position || { x: 100, y: 100 },
      data: {
        label: n.label,
        riskScore: n.riskScore,
        status: n.status,
        type: n.type,
        vulnerabilities: n.vulnerabilities || [],
        isChokePoint: n.isChokePoint
      },
    }));
  }, [graphData.nodes]);

  const edges: Edge[] = useMemo(() => {
    return graphData.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.probability > 0.6 || e.relationshipType === 'POSSIBLE_ATTACK_PATH',
      style: {
        stroke: e.probability > 0.7 ? '#FF1744' : e.probability > 0.4 ? '#FFB020' : '#26313D',
        strokeWidth: Math.max(1.5, (e.probability || 0.5) * 3)
      },
      labelStyle: { fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' },
    }));
  }, [graphData.edges]);

  return (
    <div className="page-container">
      <div className="flex-between" style={{ margin: '20px 0' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Network size={22} color="var(--cyberdome-accent, #00E887)" />
            Attack Path & Choke Point Analysis
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time topology constructed from verified assets, open vulnerabilities, and network telemetry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div className="flex-center gap-sm"><span className="status-dot critical" /> <span style={{ fontSize: '0.8rem' }}>Critical Risk</span></div>
          <div className="flex-center gap-sm"><span className="status-dot warning" /> <span style={{ fontSize: '0.8rem' }}>Warning</span></div>
          <div className="flex-center gap-sm"><span className="status-dot safe" /> <span style={{ fontSize: '0.8rem' }}>Safe</span></div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="status-dot warning" style={{ width: 14, height: 14, margin: '0 auto 12px auto' }} />
            Computing dynamic attack surface topology...
          </div>
        </div>
      ) : nodes.length === 0 ? (
        <div style={{
          height: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-panel)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-primary)',
          padding: 24,
          textAlign: 'center'
        }}>
          <ShieldCheck size={48} color="#00E887" style={{ marginBottom: 16 }} />
          <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>No Real Attack Paths Detected</h4>
          <p style={{ color: 'var(--text-muted)', maxWidth: 440, fontSize: '0.9rem', marginBottom: 20 }}>
            Your attack graph visualizes real verified security infrastructure. Add company assets or run a website security scan to map real attack pathways and identify critical choke points.
          </p>
        </div>
      ) : (
        <div className="attack-graph-container" style={{ height: 600, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={defaultEdgeOptions}
            style={{ background: 'var(--bg-surface)' }}
          >
            <Background color="var(--border-subtle)" gap={20} />
            <Controls style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)' }} />
            <MiniMap
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-primary)' }}
              nodeColor={(n) => {
                const d = n.data as { status: string };
                return d.status === 'CRITICAL' ? '#FF1744' : d.status === 'WARNING' ? '#FFB020' : '#00E887';
              }}
            />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
