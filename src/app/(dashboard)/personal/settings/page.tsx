'use client';
import React, { useState } from 'react';
import { GlassPanel, GlowButton, StatusIndicator } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';

export default function PersonalSettingsPage() {
  const { user } = useAppStore();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
          PERSONAL SECURITY SETTINGS
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
          Manage your account security preferences and privacy settings.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <GlassPanel style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 16 }}>Profile Information</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full Name</label>
              <input type="text" className="input-field" defaultValue={user?.name || 'Personal Security User'} style={{ marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Address</label>
              <input type="email" className="input-field" defaultValue={user?.email || 'user@demo.cyberdome.local'} disabled style={{ marginTop: 4, opacity: 0.7 }} />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 16 }}>Security Notifications</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Email Security Alerts</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receive immediate notifications when critical security issues or scam campaigns match your checks.</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={smsAlerts} onChange={e => setSmsAlerts(e.target.checked)} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>SMS Urgent Warnings</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max 1 automatic notification per day per security guidelines.</div>
              </div>
            </label>
          </div>
        </GlassPanel>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {savedNotice && <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>✓ Preferences saved successfully</span>}
          <GlowButton variant="primary" size="md" type="submit">
            Save Preferences
          </GlowButton>
        </div>
      </form>
    </div>
  );
}
