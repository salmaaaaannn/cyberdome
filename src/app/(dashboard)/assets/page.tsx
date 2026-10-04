'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Server, Search, Plus, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Clock, Cpu, Database,
  Globe, Wifi, Cloud, Shield, ChevronDown, X,
} from 'lucide-react';
import { assetService } from '@/services';
import { Asset, AssetStatus } from '@/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_COLOR: Record<string, string> = {
  active:      '#00E887',
  inactive:    '#8B949E',
  compromised: '#FF1744',
  maintenance: '#FFB020',
};

const CRITICALITY_COLOR: Record<string, string> = {
  CRITICAL: '#FF1744',
  HIGH:     '#FF6B35',
  MEDIUM:   '#FFB020',
  LOW:      '#00E887',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status.toLowerCase()] || '#8B949E';
  const s = status.toLowerCase();
  const Icon = s === 'active' ? CheckCircle : s === 'compromised' ? XCircle : s === 'maintenance' ? Clock : AlertTriangle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: color + '18', color, fontSize: 12, fontWeight: 600,
      border: '1px solid ' + color + '30',
    }}>
      <Icon size={11} /> {status.toUpperCase()}
    </span>
  );
}

function CriticalityBadge({ level }: { level: string }) {
  const color = CRITICALITY_COLOR[(level || '').toUpperCase()] || '#8B949E';
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 4,
      background: color + '22', color, fontSize: 11, fontWeight: 700,
      border: '1px solid ' + color + '40', letterSpacing: '0.04em',
    }}>
      {(level || '—').toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Register Modal                                                      */
/* ------------------------------------------------------------------ */

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
  background: 'var(--bg-panel)', border: '1px solid var(--border-primary)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  fontFamily: 'inherit',
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' as const, cursor: 'pointer', paddingRight: 30 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 };
const saveBtnStyle: React.CSSProperties = {
  padding: '9px 24px', borderRadius: 8, border: 'none',
  background: 'var(--cyberdome-red)',
  color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', fontSize: 13,
};

const ASSET_TYPES = ['SERVER','DATABASE','WEBSITE','DOMAIN','CLOUD','IOT_DEVICE','NETWORK','FIREWALL','APPLICATION'];
const CRITICALITY_LEVELS = ['CRITICAL','HIGH','MEDIUM','LOW'];
const STATUSES = ['ACTIVE','INACTIVE','MAINTENANCE'];

interface RegisterModalProps { onClose: () => void; onSaved: () => void; }

function RegisterModal({ onClose, onSaved }: RegisterModalProps) {
  const [form, setForm] = useState({
    name: '', asset_type: 'SERVER', hostname: '', ip_address: '',
    domain: '', status: 'ACTIVE', criticality: 'HIGH', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Asset name is required.'); return; }
    setSaving(true); setError('');
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('cyberdome_token') || '';
      const res = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.detail?.message || json?.detail || 'Failed to create asset.'); return; }
      onSaved();
    } catch { setError('Network error. Is the backend running?'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)', width: '100%', maxWidth: 540, padding: 28, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Register New Asset</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>
        {error && <div style={{ background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--color-critical-text)', fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Asset Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. prod-web-01" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ position: 'relative' }}>
                <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)} style={selectStyle}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Criticality</label>
              <div style={{ position: 'relative' }}>
                <select value={form.criticality} onChange={e => set('criticality', e.target.value)} style={selectStyle}>
                  {CRITICALITY_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Hostname</label>
              <input value={form.hostname} onChange={e => set('hostname', e.target.value)} placeholder="prod-web-01.corp" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>IP Address</label>
              <input value={form.ip_address} onChange={e => set('ip_address', e.target.value)} placeholder="192.168.1.10" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Domain</label>
              <input value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ position: 'relative' }}>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 22, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={saving} style={saveBtnStyle}>{saving ? 'Registering…' : 'Register Asset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAssets(await assetService.getAssets()); }
    catch { setAssets([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.ip.includes(q) || a.hostname.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'ALL' || a.status.toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalAssets = assets.length;
  const activeCount = assets.filter(a => (a.status as string).toLowerCase() === 'active').length;
  const criticalCount = assets.filter(a => (a.status as string).toLowerCase() === 'compromised').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', fontFamily: 'var(--font-body, Inter, sans-serif)', padding: '28px 32px', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--cyberdome-red-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={18} color="var(--cyberdome-red)" />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Asset Manager</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Register and track your enterprise infrastructure assets</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button id="register-asset-btn" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, cursor: 'pointer', background: 'var(--cyberdome-red)', border: 'none', color: '#FFFFFF', fontWeight: 700, fontSize: 13 }}>
            <Plus size={14} /> Register Asset
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Assets', value: totalAssets, color: 'var(--color-info)', icon: <Server size={18} /> },
          { label: 'Active',       value: activeCount,  color: 'var(--color-success)', icon: <CheckCircle size={18} /> },
          { label: 'Compromised',  value: criticalCount, color: 'var(--color-critical)', icon: <AlertTriangle size={18} /> },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, IP, hostname…" style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        {['ALL','ACTIVE','INACTIVE','COMPROMISED','MAINTENANCE'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: filterStatus === s ? 'var(--cyberdome-red)' : 'var(--border-primary)', background: filterStatus === s ? 'var(--cyberdome-red-subtle)' : 'var(--bg-surface)', color: filterStatus === s ? 'var(--cyberdome-red)' : 'var(--text-secondary)' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading assets…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--cyberdome-red-subtle)', border: '1px dashed var(--cyberdome-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--cyberdome-red)' }}>
              <Server size={24} />
            </div>
            <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {search || filterStatus !== 'ALL' ? 'No assets match your filter' : 'No Assets Registered'}
            </h4>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
              {search || filterStatus !== 'ALL' ? 'Try adjusting your search or filter.' : 'Register your first infrastructure asset to start tracking it in CYBERDOME.'}
            </p>
            {!search && filterStatus === 'ALL' && (
              <button onClick={() => setShowModal(true)} style={{ ...saveBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Plus size={14} /> Register Your First Asset
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr 1fr 1.2fr', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span>Asset</span><span>Type</span><span>IP / Hostname</span><span>Status</span><span>Criticality</span><span>Registered</span>
            </div>
            {filtered.map((asset, i) => (
              <div key={asset.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr 1fr 1.2fr', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center', transition: 'background 0.12s', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--color-info-bg)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Server size={14} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{asset.name}</div>
                    {asset.hostname && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{asset.hostname}</div>}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{asset.type}</span>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{asset.ip || asset.hostname || '—'}</div>
                <StatusBadge status={asset.status} />
                <CriticalityBadge level={(asset as any).criticality || 'HIGH'} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{asset.lastScan ? new Date(asset.lastScan).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
              </div>
            ))}
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {filtered.length} of {totalAssets} assets
            </div>
          </>
        )}
      </div>

      {showModal && <RegisterModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
