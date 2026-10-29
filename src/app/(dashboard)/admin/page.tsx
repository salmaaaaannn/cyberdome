// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { companyService, employeeService, incidentService } from '@/services';
import { CompanyProfile, CompanyUser, AuditLogEntry, UserRole } from '@/types';
import {
  Users,
  Shield,
  ShieldAlert,
  Laptop,
  CheckCircle2,
  TrendingDown,
  Search,
  Plus,
  Save,
  Check,
  Building2,
  ScrollText,
  Settings,
  Activity,
  FileText,
  LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'users' | 'audit' | 'system'>('overview');
  const [employees, setEmployees] = useState<CompanyUser[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [editingRoles, setEditingRoles] = useState<Record<string, UserRole>>({});
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [inviteDept, setInviteDept] = useState('Cyber Operations');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');

  useEffect(() => {
    companyService.getCompanyProfile('demo-company-1').then(setCompanyProfile);
    employeeService.getEmployees('demo-company-1').then(setEmployees);
    companyService.getAuditLogs('demo-company-1').then(setAuditLogs);
  }, []);

  const handleRoleChangeSelect = (userId: string, newRole: UserRole) => {
    setEditingRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveRole = async (userId: string) => {
    const targetRole = editingRoles[userId];
    if (!targetRole) return;
    await employeeService.updateEmployeeRole(userId, targetRole as 'ADMIN' | 'EMPLOYEE');
    const updated = await employeeService.getEmployees('demo-company-1');
    setEmployees(updated);
    setSavedSuccessId(userId);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    await employeeService.inviteEmployee({
      companyId: companyProfile?.id || 'comp-enterprise-1',
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      department: inviteDept,
    });

    const updated = await employeeService.getEmployees('demo-company-1');
    setEmployees(updated);
    setInviteSuccessMsg(`Invitation dispatched to ${inviteEmail} with ${inviteRole} clearance.`);
    setInviteName('');
    setInviteEmail('');
    setTimeout(() => {
      setInviteSuccessMsg('');
      setIsInviteOpen(false);
    }, 2500);
  };

  const filteredUsers = employees.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#38BDF8', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Shield size={13} /> Security Operations
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Security Operations Dashboard
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            Monitor employee security posture, run simulations, and manage organizational risk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteOpen(true)}
          className="cyber-btn cyber-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 14 }}
        >
          <Plus size={16} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Employee Security</span>
            <Users size={18} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            {employees.length} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Total Employees</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Secure:</span> <span style={{ fontWeight: 600 }}>--</span></div>
            <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Elevated Risk:</span> <span style={{ fontWeight: 600 }}>--</span></div>
            <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>High Risk:</span> <span style={{ fontWeight: 600 }}>--</span></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6, display: 'inline-block' }}>
            Insufficient telemetry
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Security Simulations</span>
            <ShieldAlert size={18} color="var(--text-muted)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Simulations Sent</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>0</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Employees Tested</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>0</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Click Rate:</span> <span style={{ fontWeight: 600 }}>--</span></div>
            <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Report Rate:</span> <span style={{ fontWeight: 600 }}>--</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 6 }}>
              No simulations yet
            </div>
            <Link
              href="/admin/security-simulations/create"
              className="cyber-btn cyber-btn-primary"
              style={{ fontSize: 12, padding: '5px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={13} /> Create Simulation
            </Link>
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Device Security</span>
            <Laptop size={18} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            0 <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Monitored Devices</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Healthy:</span> <span style={{ fontWeight: 600 }}>--</span></div>
            <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>At Risk:</span> <span style={{ fontWeight: 600 }}>--</span></div>
            <div style={{ fontSize: 12, gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)' }}>Insufficient Telemetry:</span> <span style={{ fontWeight: 600 }}>--</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 6 }}>
              No device telemetry
            </div>
            <Link
              href="/admin/devices"
              className="cyber-btn cyber-btn-secondary"
              style={{ fontSize: 12, padding: '5px 10px', textDecoration: 'none' }}
            >
              View Devices
            </Link>
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Organization Risk</span>
            <TrendingDown size={18} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Risk Score</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            --<span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6, display: 'inline-block' }}>
              Insufficient data
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-primary)', marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '2.5px solid #3B82F6' : '2.5px solid transparent',
            color: activeTab === 'overview' ? '#3B82F6' : 'var(--text-muted)',
          }}
        >
          <LayoutDashboard size={16} />
          <span>Security Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'employees' ? '2.5px solid #3B82F6' : '2.5px solid transparent',
            color: activeTab === 'employees' ? '#3B82F6' : 'var(--text-muted)',
          }}
        >
          <Building2 size={16} />
          <span>Employee Directory</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'users' ? '2.5px solid #3B82F6' : '2.5px solid transparent',
            color: activeTab === 'users' ? '#3B82F6' : 'var(--text-muted)',
          }}
        >
          <Users size={16} />
          <span>User &amp; Role Management</span>
          <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 9999, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            {employees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'audit' ? '2.5px solid #3B82F6' : '2.5px solid transparent',
            color: activeTab === 'audit' ? '#3B82F6' : 'var(--text-muted)',
          }}
        >
          <ScrollText size={16} />
          <span>Activity Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'system' ? '2.5px solid #3B82F6' : '2.5px solid transparent',
            color: activeTab === 'system' ? '#3B82F6' : 'var(--text-muted)',
          }}
        >
          <Settings size={16} />
          <span>System Settings</span>
        </button>
      </div>

      {/* TAB: SECURITY OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <Link href="/admin/security-simulations" style={{ textDecoration: 'none' }}>
                <div className="cyber-card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s', height: '100%' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-critical-bg)', color: 'var(--color-critical)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <ShieldAlert size={20} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Security Simulations</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Run controlled security-awareness exercises
                  </p>
                </div>
              </Link>
              
              <Link href="/admin/employee-risk" style={{ textDecoration: 'none' }}>
                <div className="cyber-card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s', height: '100%' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-info-bg)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Users size={20} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Employee Risk</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Monitor employee security posture
                  </p>
                </div>
              </Link>

              <Link href="/admin/devices" style={{ textDecoration: 'none' }}>
                <div className="cyber-card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s', height: '100%' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Laptop size={20} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Employee Devices</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Track device security and telemetry
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Employee Risk</h3>
              <Link href="/admin/employee-risk" style={{ fontSize: 13, color: 'var(--cyberx-red)', fontWeight: 600, textDecoration: 'none' }}>
                View All Employees →
              </Link>
            </div>
            <div className="cyber-card" style={{ padding: '20px' }}>
              {employees.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    NO EMPLOYEE SECURITY EVENTS
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 450, margin: '0 auto' }}>
                    Employee security risk will appear after authorized telemetry or security-awareness simulation events are received.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Risk</th>
                        <th>Device</th>
                        <th>Last Activity</th>
                        <th>Simulation Result</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.slice(0, 5).map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>{emp.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.email}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                              Insufficient Telemetry
                            </span>
                          </td>
                          <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                            No Telemetry
                          </td>
                          <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                            {emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : '--'}
                          </td>
                          <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                            --
                          </td>
                          <td>
                            <Link
                              href={`/admin/employees/${emp.id}`}
                              className="cyber-btn cyber-btn-secondary"
                              style={{ fontSize: 12, padding: '4px 10px', textDecoration: 'none', display: 'inline-block' }}
                            >
                              View Employee
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Recent Activity</h3>
            <div className="cyber-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={32} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
                No security events yet
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400 }}>
                Run a security simulation or connect telemetry to see activity.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="cyber-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Enterprise Employee Directory
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Corporate members authorized with work emails and designated security training tracks.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Workstation Hygiene</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <Link href={`/admin/employees/${emp.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer' }}>{emp.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>{emp.email}</div>
                      </Link>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{emp.department}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          background: emp.role === 'ADMIN' ? 'var(--color-critical-bg)' : 'var(--color-info-bg)',
                          color: emp.role === 'ADMIN' ? 'var(--color-critical)' : 'var(--color-info)',
                        }}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          background: emp.status === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                          color: emp.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-warning)',
                        }}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Insufficient Telemetry
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USER & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="cyber-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Platform Users &amp; Role Assignments
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Only authorized administrators can modify account roles. Changes update permissions and navigation immediately.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-primary)', borderRadius: 8, padding: '6px 12px', background: 'var(--bg-surface)', width: 280 }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Assign Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const currentSelectedRole = editingRoles[u.id] || u.role;
                  const isModified = editingRoles[u.id] && editingRoles[u.id] !== u.role;
                  const isCurrentLoggedUser = user?.id === u.id || user?.email.toLowerCase() === u.email.toLowerCase();

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'var(--bg-hover)',
                              color: 'var(--text-secondary)',
                              fontWeight: 600,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {u.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                              {u.name} {isCurrentLoggedUser && <span style={{ fontSize: 11, color: 'var(--color-critical)', fontWeight: 500 }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Created {new Date(u.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>

                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: 9999,
                            background:
                              u.role === 'ADMIN' ? 'var(--color-critical-bg)' : u.role === 'EMPLOYEE' ? 'var(--color-info-bg)' : 'var(--bg-hover)',
                            color:
                              u.role === 'ADMIN' ? 'var(--color-critical)' : u.role === 'EMPLOYEE' ? 'var(--color-info)' : 'var(--text-secondary)',
                            border: `1px solid ${
                              u.role === 'ADMIN' ? 'var(--color-critical-border)' : u.role === 'EMPLOYEE' ? 'var(--color-info-border)' : 'var(--border-primary)'
                            }`,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td>
                        <select
                          value={currentSelectedRole}
                          onChange={(e) => handleRoleChangeSelect(u.id, e.target.value as UserRole)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: isModified ? '1.5px solid var(--color-critical)' : '1px solid var(--border-primary)',
                            background: isModified ? 'var(--color-critical-bg)' : 'var(--bg-surface)',
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="USER">USER</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleSaveRole(u.id)}
                          disabled={!isModified}
                          className="cyber-btn cyber-btn-primary"
                          style={{
                            padding: '6px 14px',
                            fontSize: 12.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: isModified ? 1 : 0.4,
                            cursor: isModified ? 'pointer' : 'default',
                          }}
                        >
                          {savedSuccessId === u.id ? (
                            <>
                              <Check size={14} /> Saved
                            </>
                          ) : (
                            <>
                              <Save size={14} /> Save Changes
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
            Compliance &amp; Security Audit Log
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{log.actor}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.target}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SYSTEM SETTINGS */}
      {activeTab === 'system' && (
        <div className="cyber-card" style={{ padding: '28px', maxWidth: 700 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Security Administration Settings
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Configure access controls, session timeout policies, and automated risk thresholds.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--bg-hover)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Strict Role Authorization</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Enforce 403 Forbidden on all unauthorized route attempts</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)' }}>Active (Mandatory)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--bg-hover)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Automatic Session Invalidation on Logout</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Purges tokens and redirects to login screen</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)' }}>Enforced</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Personal Safety Tools Access</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Fraud Call, OTP, URL Safety, and Device Security shared with all roles</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-info)' }}>Enabled (All Roles)</span>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16, 24, 40, 0.45)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '32px', maxWidth: 460, width: '100%', boxShadow: '0 10px 30px rgba(16,24,40,0.15)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Invite Team Member
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, marginBottom: 20 }}>
              Send an authorized onboarding invitation to an employee or administrator.
            </p>

            {inviteSuccessMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: 13, marginBottom: 16 }}>
                {inviteSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="e.g. Maya Lin"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Work Email
                </label>
                <input
                  type="email"
                  className="cyber-input"
                  placeholder="maya@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Clearance Role
                  </label>
                  <select
                    className="cyber-input"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Department
                  </label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="cyber-btn cyber-btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cyber-btn cyber-btn-primary"
                  style={{ flex: 1 }}
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
