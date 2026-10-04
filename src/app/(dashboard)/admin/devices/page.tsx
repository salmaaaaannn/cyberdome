// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Laptop, Shield } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeader() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cyberdome_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
}

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const res = await fetch(`${API_BASE}/admin/devices`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json || [];
          if (Array.isArray(list)) {
            setDevices(list);
          }
        }
      } catch (err) {
        console.error('Error fetching devices:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDevices();
  }, []);

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          <Laptop size={14} /> Endpoint Management
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          EMPLOYEE DEVICES
        </h1>
        <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Monitor device security posture and endpoint telemetry.
        </p>
      </div>

      <div className="cyber-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading devices...</div>
        ) : devices.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Employee</th>
                  <th>Last Seen</th>
                  <th>Telemetry</th>
                  <th>Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((dev) => (
                  <tr key={dev.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dev.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>--</td>
                    <td style={{ color: 'var(--text-muted)' }}>--</td>
                    <td style={{ color: 'var(--text-muted)' }}>--</td>
                    <td style={{ color: 'var(--text-muted)' }}>--</td>
                    <td style={{ color: 'var(--text-muted)' }}>--</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
              <Laptop size={28} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
              NO DEVICE TELEMETRY
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
              Connect an authorized endpoint or browser telemetry source to calculate device security risk.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
