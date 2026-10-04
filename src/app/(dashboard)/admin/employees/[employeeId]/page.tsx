// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, User, ShieldAlert, Laptop, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeader() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cyberdome_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const { employeeId } = params;
  
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployee() {
      try {
        const res = await fetch(`${API_BASE}/admin/employees`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json || [];
          if (Array.isArray(list)) {
            const found = list.find((e) => e.id === employeeId || e.userId === employeeId);
            if (found) {
              setEmployee(found);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching employee:', err);
      } finally {
        setLoading(false);
      }
    }
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const empName = employee
    ? employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'
    : 'Sarah Chen';

  const empEmail = employee?.email || 'sarah.chen@company.internal';
  const empRole = employee?.role || 'EMPLOYEE';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
      <Link href="/admin/employee-risk" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '20px', fontSize: '13.5px' }}>
        <ArrowLeft size={16} /> Back to Employee Risk
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
          <User size={28} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
              {empName}
            </h1>
            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              {empRole}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 4 }}>
            {empEmail}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Section 1 - Security Risk */}
        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--color-warning)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Security Risk</h2>
          </div>
          <div style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)', borderRadius: '4px', fontSize: '12px', fontWeight: '600', marginBottom: '10px' }}>
              INSUFFICIENT TELEMETRY
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>
              Insufficient data to calculate risk score.
            </p>
          </div>
        </div>

        {/* Section 2 - Device Security */}
        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Laptop size={18} style={{ color: 'var(--text-muted)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Device Security</h2>
          </div>
          <div style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '13.5px', fontWeight: '600', marginBottom: '6px' }}>
              DEVICE TELEMETRY UNAVAILABLE
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>
              Connect an authorized endpoint or browser telemetry source.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Section 3 - Security Awareness */}
        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <BookOpen size={18} style={{ color: 'var(--color-info)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Security Awareness</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Simulations Received', value: '0' },
              { label: 'Opened', value: '0' },
              { label: 'Clicked', value: '0' },
              { label: 'Reported', value: '0' },
              { label: 'Training Completed', value: '--' },
            ].map((stat, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4 - Activity Timeline */}
        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={18} style={{ color: 'var(--text-muted)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Activity Timeline</h2>
          </div>
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No security events recorded for this employee.
          </div>
        </div>
      </div>
    </div>
  );
}
