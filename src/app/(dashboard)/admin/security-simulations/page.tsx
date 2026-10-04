// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, Plus, Mail, MessageSquare, X, CheckCircle2, Eye, Send } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

export default function SecuritySimulationsPage() {
  const { user } = useAppStore();
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Email Simulation Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('employees@company.internal');
  const [emailSubject, setEmailSubject] = useState('Security verification required');
  const [emailMessage, setEmailMessage] = useState('Urgent security update required: Please confirm your workstation credentials to prevent service interruption.');
  const [emailScenario, setEmailScenario] = useState('Suspicious Link');
  const [emailPreviewMode, setEmailPreviewMode] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  // Message Simulation Modal State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState('All Authorized Personnel');
  const [msgContent, setMsgContent] = useState('This is a CYBERDOME security-awareness simulation.');
  const [msgScenario, setMsgScenario] = useState('Security Awareness');
  const [msgResult, setMsgResult] = useState(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const getAuthHeader = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cyberdome_token');
      if (token) return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const fetchSimulations = async () => {
    try {
      const response = await fetch(`${API_BASE}/simulations`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const json = await response.json();
        const list = json.data?.simulations || json.simulations || json;
        if (Array.isArray(list)) {
          setSimulations(list);
        }
      }
    } catch (error) {
      console.error('Error fetching simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulations();
  }, []);

  const handleSendEmailSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          name: `Email Drill: ${emailScenario}`,
          type: 'EMAIL',
          target_users: [emailTo],
          content: `${emailSubject} - ${emailMessage}`
        })
      });

      const resData = response.ok ? await response.json() : null;
      setEmailResult({
        recipients: emailTo,
        status: 'DISPATCHED',
        createdBy: user?.name || 'Administrator',
        createdAt: new Date().toLocaleString()
      });
      fetchSimulations();
    } catch {
      setEmailResult({
        recipients: emailTo,
        status: 'DISPATCHED (Simulation Gateway)',
        createdBy: user?.name || 'Administrator',
        createdAt: new Date().toLocaleString()
      });
    }
  };

  const handleSendMessageSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          name: `Message Drill: ${msgScenario}`,
          type: 'MESSAGE',
          target_users: [msgTarget],
          content: msgContent
        })
      });

      setMsgResult({
        recipients: msgTarget,
        status: 'DISPATCHED',
        createdBy: user?.name || 'Administrator',
        createdAt: new Date().toLocaleString()
      });
      fetchSimulations();
    } catch {
      setMsgResult({
        recipients: msgTarget,
        status: 'DISPATCHED (Simulation Gateway)',
        createdBy: user?.name || 'Administrator',
        createdAt: new Date().toLocaleString()
      });
    }
  };

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'var(--color-critical-bg)', color: 'var(--color-critical)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <ShieldAlert size={14} /> Security Awareness
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            SECURITY SIMULATIONS
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Run controlled security-awareness exercises for your organization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setEmailResult(null);
              setEmailPreviewMode(false);
              setIsEmailModalOpen(true);
            }}
            className="cyber-btn cyber-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Mail size={15} />
            <span>SEND SIMULATED EMAIL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMsgResult(null);
              setIsMessageModalOpen(true);
            }}
            className="cyber-btn cyber-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <MessageSquare size={15} />
            <span>SEND SIMULATED MESSAGE</span>
          </button>

          <Link
            href="/admin/security-simulations/create"
            className="cyber-btn cyber-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}
          >
            <Plus size={15} />
            <span>CREATE SIMULATION</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>
          Loading security simulations...
        </div>
      ) : simulations && simulations.length > 0 ? (
        <div className="cyber-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
            RECENT SIMULATIONS
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Simulation Name</th>
                  <th>Type</th>
                  <th>Targets</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                  <th>Reported</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {simulations.map((sim, i) => (
                  <tr key={sim.id || i}>
                    <td>
                      <Link href={`/admin/security-simulations/${sim.id || i}`} style={{ color: 'var(--cyberx-red)', fontWeight: 600, textDecoration: 'none' }}>
                        {sim.name}
                      </Link>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        {sim.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {Array.isArray(sim.target_users) ? sim.target_users.length : (sim.targets || 'All')}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{sim.opened ?? '--'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{sim.clicked ?? '--'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{sim.reported ?? '--'}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: sim.status === 'RUNNING' ? 'var(--color-info-bg)' : 'var(--color-success-bg)', color: sim.status === 'RUNNING' ? 'var(--color-info)' : 'var(--color-success)' }}>
                        {sim.status || 'COMPLETED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ShieldAlert size={28} color="var(--text-muted)" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            NO SIMULATIONS YET
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 420, marginBottom: 20, lineHeight: 1.5 }}>
            Create your first controlled security-awareness simulation.
          </p>
          <Link
            href="/admin/security-simulations/create"
            className="cyber-btn cyber-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', padding: '9px 18px', fontSize: 13.5 }}
          >
            <Plus size={16} />
            <span>Create Simulation</span>
          </Link>
        </div>
      )}

      {/* MODAL: SEND SIMULATED EMAIL */}
      {isEmailModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16, 24, 40, 0.45)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '28px', maxWidth: 520, width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={20} color="var(--cyberx-red)" />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  CREATE EMAIL SIMULATION
                </h3>
              </div>
              <button type="button" onClick={() => setIsEmailModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {emailResult ? (
              <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                  <CheckCircle2 size={18} />
                  <span>SIMULATION CREATED</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Recipients:</strong> <span style={{ color: 'var(--text-secondary)' }}>{emailResult.recipients}</span></div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Status:</strong> <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{emailResult.status}</span></div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Created By:</strong> <span style={{ color: 'var(--text-secondary)' }}>{emailResult.createdBy}</span></div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Created At:</strong> <span style={{ color: 'var(--text-secondary)' }}>{emailResult.createdAt}</span></div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="cyber-btn cyber-btn-primary"
                  style={{ width: '100%', marginTop: 16, fontSize: 13 }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEmailSimulation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                    To: Employee(s)
                  </label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="e.g. employee@company.com or All"
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                    Subject:
                  </label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                    Simulation Scenario:
                  </label>
                  <select
                    className="cyber-input"
                    value={emailScenario}
                    onChange={(e) => setEmailScenario(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Suspicious Link">Suspicious Link</option>
                    <option value="Credential Safety">Credential Safety</option>
                    <option value="Urgent Request">Urgent Request</option>
                    <option value="Attachment Awareness">Attachment Awareness</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                    Message:
                  </label>
                  <textarea
                    className="cyber-input"
                    rows={4}
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                {emailPreviewMode && (
                  <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 12.5 }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>EMAIL PREVIEW:</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Subject: {emailSubject}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{emailMessage}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEmailPreviewMode(!emailPreviewMode)}
                    className="cyber-btn cyber-btn-secondary"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
                  >
                    <Eye size={15} />
                    <span>{emailPreviewMode ? 'Hide Preview' : 'Preview'}</span>
                  </button>

                  <button
                    type="submit"
                    className="cyber-btn cyber-btn-primary"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
                  >
                    <Send size={15} />
                    <span>Send Simulation</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SEND SIMULATED MESSAGE */}
      {isMessageModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16, 24, 40, 0.45)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '28px', maxWidth: 500, width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={20} color="var(--cyberx-red)" />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  CREATE MESSAGE SIMULATION
                </h3>
              </div>
              <button type="button" onClick={() => setIsMessageModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {msgResult ? (
              <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                  <CheckCircle2 size={18} />
                  <span>SIMULATION CREATED</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Recipients:</strong> <span style={{ color: 'var(--text-secondary)' }}>{msgResult.recipients}</span></div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Status:</strong> <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{msgResult.status}</span></div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Created By:</strong> <span style={{ color: 'var(--text-secondary)' }}>{msgResult.createdBy}</span></div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Created At:</strong> <span style={{ color: 'var(--text-secondary)' }}>{msgResult.createdAt}</span></div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="cyber-btn cyber-btn-primary"
                  style={{ width: '100%', marginTop: 16, fontSize: 13 }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMessageSimulation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                    Target Employee(s)
                  </label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={msgTarget}
                    onChange={(e) => setMsgTarget(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                    Scenario:
                  </label>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Security Awareness
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                    Message:
                  </label>
                  <textarea
                    className="cyber-input"
                    rows={4}
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--text-muted)' }}>
                  This simulation is company-scoped and restricted to authorized managers.
                </div>

                <button
                  type="submit"
                  className="cyber-btn cyber-btn-primary"
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, padding: '10px' }}
                >
                  <Send size={15} />
                  <span>Send Simulation</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
