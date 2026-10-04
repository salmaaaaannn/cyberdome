// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel, DemoBanner, MetricCard, RiskBadge, CyberToggle } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { notificationEngineService, notificationService } from '@/services';
import { NotificationLog, DailyLimitRecord, NotificationChannel, SecurityNotification } from '@/types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ShieldAlert,
  Smartphone,
  Mail,
  Lock,
  KeyRound,
  Filter,
  Info,
  RefreshCw,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user, notificationPrefs, setNotificationPrefs } = useAppStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'history' | 'admin-logs' | 'preferences'>('history');
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [dailyLimit, setDailyLimit] = useState<DailyLimitRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; reason?: string } | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await notificationEngineService.getLogs();
      const status = await notificationEngineService.getDailyLimitStatus(user?.id || 'usr-admin-01');
      const backendNotifs = await notificationService.getNotifications();
      setLogs(allLogs);
      setNotifications(backendNotifs);
      setDailyLimit(status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [user?.id]);

  const handleTestDispatch = async (eventType: NotificationLog['eventType']) => {
    setTestResult(null);
    try {
      const res = await notificationEngineService.dispatchSecurityEvent({
        userId: user?.id || 'usr-admin-01',
        userName: user?.name || 'Khan Salman',
        userEmail: user?.email || 'admin@cybersafety.io',
        userPhone: user?.phone || '+1 (555) 019-2831',
        eventId: eventType === 'OTP' ? 'OTP-' + Math.floor(100000 + Math.random() * 900000) : 'EVT-ALERT-' + Date.now(),
        eventTitle:
          eventType === 'OTP'
            ? 'Sign-in Verification Code (OTP)'
            : eventType === 'CRITICAL_CVE'
            ? 'Critical RCE Exploitation Detected on Gateway'
            : 'Suspicious Lateral Movement Alert',
        eventType,
        channel: 'both',
        isSimulation: false,
      });

      setTestResult({ status: res.status, reason: res.reason });
      await loadLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const deliveredLogs = logs.filter((l) => l.status === 'DELIVERED');
  const suppressedLogs = logs.filter((l) => l.status === 'SUPPRESSED');

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <DemoBanner />

      {/* Top Banner explaining Daily Limit */}
      <div
        style={{
          margin: '16px 0 20px',
          padding: '12px 18px',
          background: 'var(--color-info-bg)',
          border: '1px solid var(--color-info-border)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--color-info)' }}>
          <Info size={18} />
          <span>
            <strong>Security Notification Engine Rule:</strong> Maximum ONE automatic security alert per user per day.
            Secondary alerts are logged and suppressed to prevent notification fatigue. <em>Authentication OTPs are strictly exempt.</em>
          </span>
        </div>

        {dailyLimit && (
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-info)' }}>
            Daily Sent: {dailyLimit.automaticNotificationSentCount} / 1 • Suppressed: {dailyLimit.suppressedEventsCount}
          </div>
        )}
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <MetricCard label="Total Dispatches" value={logs.length} icon="🔔" />
        <MetricCard label="Delivered" value={deliveredLogs.length} color="var(--color-success)" icon="✅" />
        <MetricCard label="Suppressed (Daily Limit)" value={suppressedLogs.length} icon="🛑" color="var(--color-warning)" />
        <MetricCard label="OTP Verifications (Exempt)" value={logs.filter((l) => l.isOTP).length} color="var(--color-info)" icon="🔑" />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-subtle)', margin: '24px 0 20px' }}>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 16px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'history' ? 700 : 500,
            color: activeTab === 'history' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
            borderBottom: activeTab === 'history' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Notification History
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin-logs')}
            style={{
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'admin-logs' ? 700 : 500,
              color: activeTab === 'admin-logs' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
              borderBottom: activeTab === 'admin-logs' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Admin Delivery & Suppression Logs</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'var(--color-critical-bg)', color: 'var(--cyberdome-red)', borderRadius: 10 }}>
              Live Engine
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('preferences')}
          style={{
            padding: '10px 16px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'preferences' ? 700 : 500,
            color: activeTab === 'preferences' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
            borderBottom: activeTab === 'preferences' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Delivery Preferences
        </button>
      </div>

      {/* TAB 1: NOTIFICATION HISTORY */}
      {activeTab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 20 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>Recent Alerts & Messages</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} style={{ padding: 14, borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RiskBadge severity={n.severity} />
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-surface)', borderRadius: 4, border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          {n.channel === 'both' ? '📧 + 📱 Multi-channel' : n.channel === 'email' ? '📧 Email' : '📱 SMS'}
                        </span>
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: n.status === 'delivered' ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
                          color: n.status === 'delivered' ? 'var(--color-success)' : 'var(--cyberdome-red)',
                        }}
                      >
                        {n.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{n.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>{n.message}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>Event: {n.eventId}</span>
                      <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available</div>
              )}
            </div>
          </div>

          {/* Quick Test Trigger Panel */}
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 20 }}>
            <h5 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>Test Notification Engine</h5>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Test the engine rule: Dispatching multiple security alerts will trigger daily rate-limit suppression.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => handleTestDispatch('CRITICAL_CVE')}
                style={{
                  padding: '9px 14px',
                  borderRadius: 6,
                  background: 'var(--cyberdome-red)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ShieldAlert size={16} />
                <span>Test Security Alert (Daily Limit 1/day)</span>
              </button>

              <button
                onClick={() => handleTestDispatch('OTP')}
                style={{
                  padding: '9px 14px',
                  borderRadius: 6,
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <KeyRound size={16} />
                <span>Test OTP Code (Exempt from Limit)</span>
              </button>
            </div>

            {testResult && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  background: testResult.status === 'DELIVERED' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  border: `1px solid ${testResult.status === 'DELIVERED' ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
                  color: testResult.status === 'DELIVERED' ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              >
                <strong>Outcome: {testResult.status}</strong>
                {testResult.reason && <div style={{ marginTop: 4 }}>{testResult.reason}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN DELIVERY & SUPPRESSION LOGS */}
      {activeTab === 'admin-logs' && isAdmin && (
        <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Administrative Notification & Suppression Telemetry</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Audit log of all outbound messages, delivery states, and suppression explanations.
              </p>
            </div>
            <button onClick={loadLogs} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <RefreshCw size={16} />
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Recipient / User</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Event & Title</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Channel</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Engine Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Suppression Reason</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.userName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.userEmail}</div>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{log.eventTitle}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.eventId}</div>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{log.channel}</span>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: log.status === 'DELIVERED' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                        color: log.status === 'DELIVERED' ? 'var(--color-success)' : 'var(--color-warning)',
                      }}
                    >
                      {log.status}
                    </span>
                    {log.isOTP && (
                      <span style={{ marginLeft: 6, fontSize: '0.68rem', padding: '2px 6px', background: 'var(--color-info-bg)', color: 'var(--color-info)', borderRadius: 4 }}>
                        OTP EXEMPT
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: log.suppressionReason ? 'var(--color-warning)' : 'var(--text-muted)', maxWidth: 280 }}>
                    {log.suppressionReason || '—'}
                  </td>

                  <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: DELIVERY PREFERENCES */}
      {activeTab === 'preferences' && (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 24 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700 }}>Notification Channels & Alert Subscriptions</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                <h6 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Outbound Delivery Channels
                </h6>
                <CyberToggle active={notificationPrefs.email} onChange={(v) => setNotificationPrefs({ email: v })} label="Email Notifications (SMTP Gateway)" />
                <div style={{ height: 10 }} />
                <CyberToggle active={notificationPrefs.sms} onChange={(v) => setNotificationPrefs({ sms: v })} label="SMS Notifications (Twilio / Telephony Gateway)" />
              </div>

              <div>
                <h6 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Automated Security Event Types
                </h6>
                <CyberToggle active={notificationPrefs.criticalCve} onChange={(v) => setNotificationPrefs({ criticalCve: v })} label="Critical CVE & Exploit Detections" />
                <div style={{ height: 10 }} />
                <CyberToggle active={notificationPrefs.incidents} onChange={(v) => setNotificationPrefs({ incidents: v })} label="Major Security Incidents" />
                <div style={{ height: 10 }} />
                <CyberToggle active={notificationPrefs.ueba} onChange={(v) => setNotificationPrefs({ ueba: v })} label="UEBA Anomaly & Impossible Travel Alerts" />
                <div style={{ height: 10 }} />
                <CyberToggle active={notificationPrefs.iot} onChange={(v) => setNotificationPrefs({ iot: v })} label="IoT Botnet & Rogue Device Alerts" />
                <div style={{ height: 10 }} />
                <CyberToggle active={notificationPrefs.phishing} onChange={(v) => setNotificationPrefs({ phishing: v })} label="Security Simulation Summaries" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
