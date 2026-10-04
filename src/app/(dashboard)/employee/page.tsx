// @ts-nocheck
'use client';

import { Shield, BookOpen, Clock, Activity, Laptop } from 'lucide-react';

export default function EmployeeDashboardPage() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
          <Shield style={{ color: 'var(--cyberx-red)' }} size={32} />
          My Security
        </h1>
        <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '16px' }}>
          Your personal security status and awareness.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* KPI Cards */}
        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
            <Activity size={16} /> Security Status
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success)' }}>Active</div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
            <Shield size={16} /> Security Awareness Score
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-muted)' }}>--</div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
            <Clock size={16} /> Recent Security Events
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>0</div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
            <BookOpen size={16} /> Training Completed
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>0</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Sections */}
        <div className="cyber-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '500', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
            <BookOpen size={20} /> My Simulations
          </h2>
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
            No security simulations received yet.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="cyber-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '500', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
              <Laptop size={20} /> My Devices
            </h2>
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
              No device telemetry available.
            </div>
          </div>

          <div className="cyber-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '500', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
              <Shield size={20} /> My Risk
            </h2>
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
              Insufficient data to determine risk level.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
