'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserCheck, ShieldAlert, ShieldCheck, AlertCircle, CheckCircle2,
  Mail, MessageSquare, PhoneCall, KeyRound, Globe, Award, Sparkles,
  ArrowRight, RefreshCw, Send, ChevronRight, BookOpen, UserX, AlertTriangle, Zap
} from 'lucide-react';
import { HumanBehaviorChoice, BehaviorPatternType, HumanBehaviorScenario } from '@/types';
import { useAppStore } from '@/stores/appStore';

const SCENARIOS: HumanBehaviorScenario[] = [
  {
    id: 'sc-phish-email',
    title: 'Urgent Microsoft 365 Password Expiry Notice',
    channel: 'email',
    sender: 'support@m1crosoft-security-verify.net',
    subject: 'URGENT: Your Corporate Password Expires in 4 Hours',
    messageBody: 'Your company Active Directory password is scheduled to expire today. Failure to update within 4 hours will result in automatic account lockout. Click below immediately to maintain access:\n\n[https://login.microsoftonline.m1crosoft-security-verify.net/reset]',
    warningSigns: [
      'Lookalike domain name: "m1crosoft-security-verify.net" instead of microsoft.com',
      'Artificial sense of urgency (4-hour deadline threat)',
      'Unsolicited password reset link bypassing internal IT helpdesk',
    ],
    safeAction: 'REPORT',
    riskImpact: 35,
    explanation: 'This is a classic credential harvesting phishing email. Legitimate organizations never send external links with short deadlines demanding password changes.',
    recommendedTrainingId: 'course-phishing-defense',
    recommendedTrainingTitle: 'Phishing Awareness & Domain Verification',
  },
  {
    id: 'sc-fake-it-whatsapp',
    title: 'Executive WhatsApp Impersonation (CEO Request)',
    channel: 'whatsapp',
    sender: '+1 (555) 019-9941 (CEO Profile Picture)',
    messageBody: 'Hey, I am currently locked in an emergency board meeting and cannot take calls. I need you to purchase three $200 Apple gift cards for a client presentation right now and send the redemption codes here. I will expense it this afternoon.',
    warningSigns: [
      'Unusual out-of-channel request for sensitive financial transaction',
      'Impersonation of corporate executive with excuse for not calling',
      'Pressure to bypass standard corporate procurement procedures',
    ],
    safeAction: 'VERIFY_SENDER',
    riskImpact: 40,
    explanation: 'Executive Business Email Compromise (BEC) and WhatsApp smishing lure employees by exploiting authority and fear of questioning leadership.',
    recommendedTrainingId: 'course-social-engineering',
    recommendedTrainingTitle: 'Social Engineering & Executive Fraud Defense',
  },
  {
    id: 'sc-otp-vishing',
    title: 'Bank Fraud Department Security Call',
    channel: 'call',
    sender: '+1 (800) 555-0199 (Spoofed Caller ID)',
    messageBody: 'Hello, this is Bank Fraud Prevention. We have flagged a suspicious $1,420 charge originating from overseas. To immediately cancel this transaction, we just sent a 6-digit confirmation code to your device. Please read that code back to me now to confirm your identity.',
    warningSigns: [
      'Caller demanding a 6-digit OTP code received by SMS',
      'High stress emotional trigger with fear of imminent financial loss',
      'Banks explicitly state: "We will NEVER ask for your one-time passcode over the phone"',
    ],
    safeAction: 'IGNORE',
    riskImpact: 45,
    explanation: 'Attackers initiate a login or password reset in real time and trick the victim into disclosing the secondary 2FA code over the telephone.',
    recommendedTrainingId: 'course-otp-safety',
    recommendedTrainingTitle: 'OTP & Multi-Factor Scam Interception',
  },
  {
    id: 'sc-fake-login-portal',
    title: 'Shared Corporate Document Notification',
    channel: 'portal',
    sender: 'notifications@sharepoint-portal-auth.com',
    subject: 'Q3 Financial Performance Report shared with you',
    messageBody: 'A member of the finance team shared "FY26-Q3-Projections.xlsx" with your account. Sign in with your corporate email credentials to view the document.\n\n[Open Encrypted Document in Cloud]',
    warningSigns: [
      'Generic sender with third-party domain',
      'Unexpected financial document without context or prior notice',
      'Redirects to an unauthorized login form asking for single sign-on credentials',
    ],
    safeAction: 'REPORT',
    riskImpact: 30,
    explanation: 'Fake document sharing notifications lead victims to pixel-perfect mockups of enterprise authentication portals.',
    recommendedTrainingId: 'course-cloud-identity',
    recommendedTrainingTitle: 'Cloud Identity & OAuth Application Security',
  },
];

export default function HumanBehaviorLabPage() {
  const router = useRouter();
  const { user } = useAppStore();

  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [awarenessScore, setAwarenessScore] = useState(82);
  const [humanRiskScore, setHumanRiskScore] = useState(18);
  const [decisionHistory, setDecisionHistory] = useState<Array<{
    scenarioId: string;
    choice: HumanBehaviorChoice;
    isSafe: boolean;
    feedback: string;
    warningSigns: string[];
    trainingTitle: string;
  }>>([]);
  const [lastFeedback, setLastFeedback] = useState<{
    scenario: HumanBehaviorScenario;
    choice: HumanBehaviorChoice;
    isSafe: boolean;
  } | null>(null);

  // Behavioral Classification (Pattern)
  const [behaviorPattern, setBehaviorPattern] = useState<BehaviorPatternType>('CAUTIOUS');

  // Gamified achievements
  const [achievements, setAchievements] = useState<string[]>([
    'Phishing Spotter',
    'Verification Expert',
  ]);

  const activeScenario = SCENARIOS[activeScenarioIdx];

  const handleMakeDecision = (choice: HumanBehaviorChoice) => {
    const isSafe = choice === activeScenario.safeAction || (activeScenario.safeAction === 'REPORT' && choice === 'VERIFY_SENDER');

    let newAwareness = awarenessScore;
    let newRisk = humanRiskScore;

    if (choice === 'OPEN_LINK') {
      newAwareness = Math.max(20, awarenessScore - activeScenario.riskImpact);
      newRisk = Math.min(95, humanRiskScore + activeScenario.riskImpact);
      setBehaviorPattern('CLICK-PRONE');
    } else if (choice === 'REPORT') {
      newAwareness = Math.min(98, awarenessScore + 6);
      newRisk = Math.max(5, humanRiskScore - 6);
      setBehaviorPattern('REPORTING-ORIENTED');
      if (!achievements.includes('Human Firewall')) {
        setAchievements(prev => [...prev, 'Human Firewall']);
      }
    } else if (choice === 'VERIFY_SENDER') {
      newAwareness = Math.min(96, awarenessScore + 4);
      newRisk = Math.max(8, humanRiskScore - 4);
      setBehaviorPattern('CAUTIOUS');
    } else {
      // IGNORE
      newAwareness = Math.min(90, awarenessScore + 2);
    }

    setAwarenessScore(newAwareness);
    setHumanRiskScore(newRisk);

    const record = {
      scenarioId: activeScenario.id,
      choice,
      isSafe,
      feedback: activeScenario.explanation,
      warningSigns: activeScenario.warningSigns,
      trainingTitle: activeScenario.recommendedTrainingTitle,
    };

    setDecisionHistory(prev => [record, ...prev]);
    setLastFeedback({
      scenario: activeScenario,
      choice,
      isSafe,
    });
  };

  const handleNextScenario = () => {
    setLastFeedback(null);
    setActiveScenarioIdx((prev) => (prev + 1) % SCENARIOS.length);
  };

  // BRIDGE: Connect Human Behavior to Technical 3D Attack Simulation
  const handleInjectIntoAttackSimulator = () => {
    router.push('/simulate/lab');
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-surface)' }}>
              <UserCheck size={20} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Human Behavior & Social Engineering Lab
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 9999, background: 'var(--color-critical-bg)', color: 'var(--color-critical)', border: '1px solid var(--color-critical-border)' }}>
              HUMAN-IN-THE-LOOP SIMULATION
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Simulate realistic human security decisions, evaluate behavioral risk patterns, and observe how human choices trigger technical attack chains.
          </p>
        </div>

        {/* Bridge Button: Connect to 3D Attack Lab */}
        <button
          type="button"
          onClick={handleInjectIntoAttackSimulator}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 8,
            backgroundColor: 'var(--color-critical)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
          }}
        >
          <Zap size={16} />
          Bridge to Technical Attack Lab (3D)
        </button>
      </div>

      {/* METRICS ROW: Trust Meter + Human Risk Score + Pattern */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Security Awareness Meter */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            Security Awareness Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)' }}>
              {awarenessScore}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span>
          </div>
          <div style={{ width: '100%', height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 9999, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${awarenessScore}%`, height: '100%', backgroundColor: 'var(--color-success)', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Human Risk Score */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            Human Risk Index
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: humanRiskScore > 40 ? 'var(--color-critical)' : 'var(--text-secondary)' }}>
              {humanRiskScore}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span>
          </div>
          <div style={{ width: '100%', height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 9999, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: `${humanRiskScore}%`, height: '100%', backgroundColor: humanRiskScore > 40 ? 'var(--color-critical)' : 'var(--color-warning)', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Behavior Pattern Classification */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            Observed Pattern
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} style={{ color: 'var(--color-warning)' }} />
            {behaviorPattern}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Training-oriented behavior category
          </div>
        </div>

        {/* Gamified Badges */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)', padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Earned Awareness Badges
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {achievements.map((ach) => (
              <span
                key={ach}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: 'var(--color-warning-bg)',
                  color: 'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Award size={12} />
                {ach}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN LAB WORKSPACE: SCENARIO VIEWER & DECISION ENGINE */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* LEFT: SIMULATED INBOX / INTERACTION CONTAINER */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 14,
            border: '1px solid var(--border-primary)',
            padding: 24,
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-primary)', paddingBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeScenario.channel === 'email' ? <Mail size={18} style={{ color: 'var(--color-critical)' }} /> :
               activeScenario.channel === 'whatsapp' ? <MessageSquare size={18} style={{ color: 'var(--color-success)' }} /> :
               activeScenario.channel === 'call' ? <PhoneCall size={18} style={{ color: 'var(--color-info)' }} /> :
               <Globe size={18} style={{ color: 'var(--color-warning)' }} />}
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Scenario {activeScenarioIdx + 1} of {SCENARIOS.length}: {activeScenario.title}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextScenario}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Skip Scenario <ChevronRight size={14} />
            </button>
          </div>

          {/* Message Meta */}
          <div style={{ background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-primary)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              <strong>From:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{activeScenario.sender}</span>
            </div>
            {activeScenario.subject && (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                <strong>Subject:</strong> {activeScenario.subject}
              </div>
            )}
          </div>

          {/* Message Body Content */}
          <div
            style={{
              padding: 20,
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              backgroundColor: 'var(--bg-surface)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              marginBottom: 24,
            }}
          >
            {activeScenario.messageBody}
          </div>

          {/* HUMAN BEHAVIOR DECISION ENGINE: 4 REALISTIC OPTIONS */}
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
              How do you respond as an employee?
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleMakeDecision('OPEN_LINK')}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-critical-border)',
                  backgroundColor: 'var(--color-critical-bg)',
                  color: 'var(--color-critical)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                [Open Link / Comply]
              </button>

              <button
                type="button"
                onClick={() => handleMakeDecision('VERIFY_SENDER')}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-warning-border)',
                  backgroundColor: 'var(--color-warning-bg)',
                  color: 'var(--color-warning)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                [Verify Out-of-Band]
              </button>

              <button
                type="button"
                onClick={() => handleMakeDecision('REPORT')}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-success-border)',
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                [Report to Security SOC]
              </button>

              <button
                type="button"
                onClick={() => handleMakeDecision('IGNORE')}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                [Ignore / Delete]
              </button>
            </div>
          </div>

          {/* INSTANT EXPLANATION & EDUCATIONAL FEEDBACK */}
          {lastFeedback && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 10,
                backgroundColor: lastFeedback.isSafe ? '#F6FEF9' : 'var(--color-critical-bg)',
                border: lastFeedback.isSafe ? '1px solid var(--color-success-border)' : '1px solid var(--color-critical-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {lastFeedback.isSafe ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <AlertCircle size={18} style={{ color: 'var(--color-critical)' }} />
                )}
                <span style={{ fontSize: 14, fontWeight: 700, color: lastFeedback.isSafe ? 'var(--color-success)' : 'var(--color-critical)' }}>
                  Your Decision: {lastFeedback.choice} — {lastFeedback.isSafe ? 'Protected the Organization' : 'Triggered Attack Risk'}
                </span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                {lastFeedback.scenario.explanation}
              </p>

              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Key Warning Signs in this Simulation:
              </div>
              <ul style={{ margin: '0 0 12px 18px', padding: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                {lastFeedback.scenario.warningSigns.map((sign, i) => (
                  <li key={i}>{sign}</li>
                ))}
              </ul>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Recommended Training: <strong>{lastFeedback.scenario.recommendedTrainingTitle}</strong>
                </span>
                <Link
                  href="/academy"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--color-critical)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Open in Security Academy <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: ATTACK CHAIN PROPAGATION & TRAINING RECOMMENDER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Attack Chain Visualization of Human Decision */}
          <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-primary)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={16} style={{ color: 'var(--color-critical)' }} />
              Cyber Attack Chain Connection
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
              How human error propagates across the corporate cyber infrastructure:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { step: '1. Human Decision', desc: 'Employee clicks credential harvesting link', status: 'COMPROMISED' },
                { step: '2. Identity Abuse', desc: 'Stolen token used in credential stuffing', status: 'ACTIVE' },
                { step: '3. Web Application', desc: 'DMZ reverse proxy bypass via auth token', status: 'TARGETED' },
                { step: '4. Network Pivot', desc: 'Lateral port scan across internal VPC subnet', status: 'MONITORED' },
                { step: '5. Core Database', desc: 'Data exfiltration attempt on Customer DB', status: 'PROTECTED' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: idx === 0 ? 'var(--color-critical-bg)' : 'var(--bg-subtle)',
                    border: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.step}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: item.status === 'COMPROMISED' ? 'var(--color-critical-bg)' : 'var(--bg-hover)',
                      color: item.status === 'COMPROMISED' ? 'var(--color-critical)' : 'var(--text-secondary)',
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Academy Training Recommendation */}
          <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-primary)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={16} style={{ color: 'var(--color-info)' }} />
              Targeted Training Direct Link
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
              Adaptive recommendations based on current session decisions:
            </p>
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-info)' }}>
                {activeScenario.recommendedTrainingTitle}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                15-minute interactive security drill with credential verification best practices.
              </div>
            </div>
            <Link
              href="/academy"
              className="cyber-btn cyber-btn-primary"
              style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none', display: 'block', padding: '9px 12px' }}
            >
              Start Drill in Academy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
