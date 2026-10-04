'use client';
import React, { useState } from 'react';
import { GlassPanel, GlowButton, StatusIndicator } from '@/components/ui';

export default function PhishingTrainingPage() {
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSender, setEmailSender] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setEmailSubject('');
      setEmailSender('');
      setEmailBody('');
    }, 4000);
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
          PHISHING DEFENSE & SIMULATION
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
          Sharpen your ability to spot Spear-Phishing, Business Email Compromise (BEC), and malicious payloads.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <GlassPanel>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SIMULATION SCORE</div>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', color: 'var(--color-success)', marginTop: 4 }}>
            100% Passed
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Zero simulation clicks across the last 4 unannounced corporate security tests.
          </p>
        </GlassPanel>

        <GlassPanel>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>REPORTING SPEED</div>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', color: 'var(--color-info)', marginTop: 4 }}>
            2.4 Minutes Avg
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            SOC response time ranks in the top 5% of organization employees.
          </p>
        </GlassPanel>
      </div>

      {/* Report Suspicious Email Form */}
      <GlassPanel style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 8 }}>Report Suspicious Email to SOC</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Received an email asking for urgent wire transfers, password resets, or containing suspicious attachments? Submit it directly to the automated CyberDome triage sandbox.
        </p>

        {reportSubmitted ? (
          <div style={{
            padding: 20,
            background: 'rgba(0, 232, 135, 0.08)',
            border: '1px solid rgba(0, 232, 135, 0.3)',
            borderRadius: 'var(--radius-sm)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '2rem' }}>✓</span>
            <h4 style={{ color: 'var(--color-success)', marginTop: 8 }}>Report Sent to Security Operations Center</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              The email headers and links have been isolated in our automated sandbox. If malicious, organization-wide mail filters will update immediately.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sender Address</label>
                <input
                  type="text"
                  className="input-field"
                  value={emailSender}
                  onChange={e => setEmailSender(e.target.value)}
                  placeholder="e.g. ceo-urgent@acme-defense-verify.com"
                  required
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Subject Line</label>
                <input
                  type="text"
                  className="input-field"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="e.g. URGENT: Wire Transfer Authorization needed before 4PM"
                  required
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Body or Suspicious Link</label>
              <textarea
                rows={4}
                className="input-field"
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Paste the email content or link here..."
                required
                style={{ marginTop: 4, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <GlowButton variant="primary" size="md" type="submit">
                Submit Report to SOC
              </GlowButton>
            </div>
          </form>
        )}
      </GlassPanel>
    </div>
  );
}
