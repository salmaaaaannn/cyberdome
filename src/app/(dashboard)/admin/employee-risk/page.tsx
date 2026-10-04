// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Search, User, Shield, Info } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeader() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cyberdome_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
}

export default function EmployeeRiskPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch(`${API_BASE}/admin/employees`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json || [];
          if (Array.isArray(list)) {
            setEmployees(list);
          }
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, []);

  const getEmployeeName = (emp) => {
    if (emp.name) return emp.name;
    const combined = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return combined || 'Employee';
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = getEmployeeName(emp).toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'var(--color-critical-bg)', color: 'var(--color-critical)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <ShieldAlert size={14} /> Security Telemetry
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            EMPLOYEE SECURITY RISK
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Monitor and manage employee security posture across your organization.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: '20px', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
          <input
            type="text"
            className="cyber-input"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%', fontSize: 13 }}
          />
        </div>
      </div>

      <div className="cyber-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading employees...</div>
        ) : filteredEmployees.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>ROLE</th>
                  <th>DEVICE</th>
                  <th>RISK</th>
                  <th>LAST EVENT</th>
                  <th>TRAINING</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const empName = getEmployeeName(emp);
                  return (
                    <tr key={emp.id || emp.userId}>
                      <td>
                        <Link href={`/admin/employees/${emp.id || emp.userId}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>
                            {empName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: 13.5 }}>{empName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{emp.role || 'EMPLOYEE'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>No telemetry</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                          Insufficient Telemetry
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                        {emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : '--'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>--</td>
                      <td>
                        <Link
                          href={`/admin/employees/${emp.id || emp.userId}`}
                          className="cyber-btn cyber-btn-secondary"
                          style={{ fontSize: 12, padding: '4px 10px', textDecoration: 'none' }}
                        >
                          View Employee
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
              <Shield size={28} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
              NO EMPLOYEE SECURITY EVENTS
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
              Employee security risk will appear after authorized telemetry or security-awareness simulation events are received.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
