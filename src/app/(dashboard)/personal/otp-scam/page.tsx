'use client';
import React, { useState } from 'react';
import { GlassPanel, GlowButton, StatusIndicator } from '@/components/ui';

interface ScamAnalysis {
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  whySuspicious: string;
  safetySteps: string[];
  forbiddenData: string[];
  recommendation: string;
}

export default function OTPScamProtectionPage() {
  const [messageText, setMessageText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScamAnalysis | null>(null);

  const handleAnalyze = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = customText || messageText;
    if (!text.trim()) return;

    setAnalyzing(true);
    setAnalysis(null);

    const API_BASE = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')
      : 'http://localhost:8000/api/v1';

    const token = typeof window !== 'undefined' ? localStorage.getItem('cyberdome_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/personal/otp-scam`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message_text: text }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setAnalysis({
            riskLevel: d.riskLevel === 'CRITICAL' ? 'CRITICAL' : d.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
            title: d.isScam ? 'High-Urgency Social Engineering & OTP Theft Indicator' : 'Low Social Engineering Risk',
            whySuspicious: d.identifiedTactics && d.identifiedTactics.length > 0
              ? d.identifiedTactics.join('; ')
              : 'Message contains potential requests for sensitive authentication elements.',
            safetySteps: [
              'DO NOT share any 4, 6, or 8-digit OTP with anyone under any circumstances.',
              'Legitimate bank staff, utility providers, and technical support representatives CANNOT and WILL NOT ever ask for your OTP or UPI PIN.',
              'Read the OTP SMS carefully: it almost always states "Do NOT share this code with anyone, including bank employees."',
              'If someone claims to be from your bank, disconnect immediately and call the official customer care number printed directly on the back of your debit/credit card.'
            ],
            forbiddenData: [
              'SMS One-Time Passwords (OTP)',
              'UPI PIN or ATM Debit Card PIN',
              'Card CVV (3-digit code on back)',
              'Remote Access App Codes (AnyDesk, TeamViewer, RustDesk)',
              'Netbanking Login Passwords'
            ],
            recommendation: d.advice || 'Block this sender/caller immediately. Report the incident to your bank fraud hotline and your local cybercrime portal.'
          });
          setAnalyzing(false);
          return;
        }
      }
    } catch {}

    setAnalysis({
      riskLevel: 'CRITICAL',
      title: 'High-Urgency Social Engineering & OTP Theft Indicator',
      whySuspicious: 'The message creates artificial panic to compel you into revealing one-time authentication codes.',
      safetySteps: [
        'DO NOT share any 4, 6, or 8-digit OTP with anyone under any circumstances.',
        'Legitimate staff will NEVER ask for your OTP or UPI PIN.',
      ],
      forbiddenData: [
        'SMS One-Time Passwords (OTP)',
        'UPI PIN or ATM Debit Card PIN',
      ],
      recommendation: 'Block this sender/caller immediately.'
    });
    setAnalyzing(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Important Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(255, 23, 68, 0.08)',
        border: '1px solid rgba(255, 23, 68, 0.3)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--cyberdome-red)', fontWeight: 700 }}>
            NEVER PASTE OR SUBMIT YOUR ACTUAL OTP CODE
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            — Describe the situation or paste only the request context. CyberDome never requests real OTPs.
          </span>
        </div>
        <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>STRICT PRIVACY</span>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
          OTP & URGENT MESSAGE SCAM PROTECTION
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
          Analyze suspicious SMS messages, WhatsApp requests, or caller claims asking for security codes.
        </p>
      </div>

      <GlassPanel style={{ marginBottom: 24 }}>
        <form onSubmit={handleAnalyze}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 8 }}>
            PASTE MESSAGE TEXT OR DESCRIBE WHAT THE CALLER ASKED (EXCLUDING ACTUAL CODES)
          </label>
          <textarea
            rows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="e.g.: 'Someone claiming to be from my bank called saying my card is blocked and they need the verification code sent to my phone to reactivate it.'"
            disabled={analyzing}
            style={{
              width: '100%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.95rem',
              padding: 12,
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.5
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>EXAMPLES:</span>
              <button
                type="button"
                onClick={() => {
                  const sample = "Caller said: 'Dear user, your electricity power will be disconnected at 9:30 PM due to pending bill update. Call this officer and share the verification code.'";
                  setMessageText(sample);
                  handleAnalyze(undefined, sample);
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem' }}>
                Fake Electricity Cut Message
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = "Received SMS: 'Your bank account has been locked due to missing PAN KYC. Click link to verify and enter the OTP received.'";
                  setMessageText(sample);
                  handleAnalyze(undefined, sample);
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem' }}>
                Bank KYC Expiry Lure
              </button>
            </div>

            <GlowButton variant="primary" size="md" type="submit" disabled={analyzing || !messageText.trim()}>
              {analyzing ? 'Analyzing Message...' : 'Analyze Scam Risk'}
            </GlowButton>
          </div>
        </form>
      </GlassPanel>

      {/* Analysis Breakdown */}
      {analysis && (
        <GlassPanel style={{ borderLeft: '4px solid var(--cyberdome-red)' }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-critical">THREAT DETECTED: {analysis.riskLevel}</span>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{analysis.title}</span>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>WHY THIS IS DANGEROUS:</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5, fontSize: '0.88rem' }}>
              {analysis.whySuspicious}
            </p>
          </div>

          {/* Actionable Steps */}
          <div style={{ marginTop: 18 }}>
            <strong style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>MANDATORY SAFETY STEPS:</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {analysis.safetySteps.map((step, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 4,
                  fontSize: '0.85rem'
                }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Forbidden Data */}
          <div style={{ marginTop: 18 }}>
            <strong style={{ color: 'var(--cyberdome-red)', fontSize: '0.9rem' }}>NEVER DISCLOSE THESE TO ANYONE:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {analysis.forbiddenData.map((item, idx) => (
                <span key={idx} className="badge badge-critical" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                  🚫 {item}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 20,
            padding: '12px 16px',
            background: 'rgba(255, 23, 68, 0.08)',
            border: '1px solid rgba(255, 23, 68, 0.25)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <strong style={{ color: 'var(--cyberdome-red)', fontSize: '0.85rem' }}>RECOMMENDED ACTION:</strong>
            <p style={{ color: 'var(--text-primary)', marginTop: 4, fontSize: '0.85rem' }}>
              {analysis.recommendation}
            </p>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
