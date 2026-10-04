// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Shield, BookOpen, Clock, Activity, Laptop, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeader() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cyberdome_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
}

export default function EmployeeDashboardPage() {
  const { user } = useAppStore();
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMySimulations() {
      try {
        const res = await fetch(`${API_BASE}/simulations`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.simulations || json.simulations || json || [];
          if (Array.isArray(list)) {
            setSimulations(list);
          }
        }
      } catch (err) {
        console.error('Error fetching employee simulations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMySimulations();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 9999,
            background: 'var(--color-info-bg)',
            color: 'var(--color-info)',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          <ShieldCheck size={14} /> Employee Workspace
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          MY SECURITY
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
          Your personal security status, awareness drills, and workstation health.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Security Status</span>
            <Activity size={16} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-success)' }}>
            Active
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Authenticated Session
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Security Awareness Score</span>
            <Shield size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            -- <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>/ 100</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Pending simulation results
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Recent Security Events</span>
            <Clock size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            0
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            No detected threats
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Training Completed</span>
            <BookOpen size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            0
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            <Link href="/academy" style={{ color: 'var(--cyberx-red)', textDecoration: 'none', fontWeight: 600 }}>
              Visit Academy →
            </Link>
          </div>
        </div>
      </div>

      {/* Sections: My Simulations, My Devices, My Risk */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* My Simulations */}
        <div className="cyber-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} /> Simulations
            </h3>
            <Link href="/training/safe-landing" style={{ fontSize: 12.5, color: 'var(--cyberx-red)', textDecoration: 'none', fontWeight: 600 }}>
              View Simulation Exercise Demo →
            </Link>
          </div>
          {simulations.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Exercise Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((sim, i) => (
                    <tr key={sim.id || i}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sim.name}</td>
                      <td>{sim.type}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                          {sim.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{sim.created_at ? new Date(sim.created_at).toLocaleDateString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
                No security simulations received yet.
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* My Devices */}
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Laptop size={18} /> My Devices
            </h3>
            <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
                No device telemetry available.
              </p>
            </div>
          </div>

          {/* My Risk */}
          <div className="cyber-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} /> My Risk
            </h3>
            <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
                Insufficient data to determine risk level.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
