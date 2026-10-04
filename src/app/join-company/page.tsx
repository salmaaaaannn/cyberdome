// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CyberSafetyLogo from '@/components/ui/CyberSafetyLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAppStore } from '@/stores/appStore';
import {
  User,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function JoinCompanyPage() {
  const [step, setStep] = useState(1);
  const [companyCode, setCompanyCode] = useState('');
  const [verifiedCompanyName, setVerifiedCompanyName] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { joinCompany } = useAppStore();
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedCode = companyCode.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length < 3) {
      setError('Please enter a valid company access pass.');
      return;
    }

    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${API_BASE}/auth/verify-company-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_code: trimmedCode }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail?.message || errJson?.error?.message || 'Invalid or unregistered company access pass.');
      }

      const json = await res.json();
      if (json.success && json.data) {
        setVerifiedCompanyName(json.data.company_name || trimmedCode);
        setStep(2);
      } else {
        throw new Error('Could not verify company access pass.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Verification failed. Please check the passcode and try again.';
      if (
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('load failed')
      ) {
        setError('Cannot connect to the CYBERDOME API server. Please ensure the backend is running on http://localhost:8000.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passDigits = (password.match(/\d/g) || []).length;
    if (password.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }
    if (passDigits < 2) {
      setError('Password must contain at least 2 numbers (0-9).');
      return;
    }

    setLoading(true);

    try {
      await joinCompany({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        companyCode: companyCode.trim().toUpperCase(),
      });
      router.push('/employee/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Failed to join company. Please try again.';
      if (
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('load failed')
      ) {
        setError('Cannot connect to the CYBERDOME API server. Please ensure the backend is running on http://localhost:8000.');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <CyberSafetyLogo size={80} showSubtitle={false} />
        </div>

        {step === 1 ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 6,
                }}
              >
                Join Your Company
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Enter the access pass code provided by your company administrator to join the group workspace.
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--color-critical-bg)',
                  border: '1px solid var(--color-critical-border)',
                  color: 'var(--color-critical)',
                  fontSize: 13,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                  Company Access Pass / Join Code
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-elevated)', gap: 8 }}>
                  <KeyRound size={16} style={{ color: 'var(--cyberx-red)', flexShrink: 0 }} />
                  <input type="text" value={companyCode} onChange={(e) => setCompanyCode(e.target.value.toUpperCase())} placeholder="e.g. SALMAN-SEC" required style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--cyberx-red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Verifying Passcode...' : 'Verify Access Pass'}
                <ArrowRight size={16} />
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 6,
                padding: '6px 12px',
                backgroundColor: 'var(--color-success-bg)',
                borderRadius: 20,
                width: 'fit-content',
                margin: '0 auto 16px',
                border: '1px solid var(--color-success)'
              }}>
                <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)' }}>
                  Passcode Verified &bull; Employee Access
                </span>
              </div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 6,
                }}
              >
                Create Account
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Joining company <strong style={{ color: 'var(--cyberx-red)' }}>{verifiedCompanyName || companyCode.toUpperCase()}</strong>
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--color-critical-bg)',
                  border: '1px solid var(--color-critical-border)',
                  color: 'var(--color-critical)',
                  fontSize: 13,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Full Name</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-elevated)', gap: 8 }}>
                  <User size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Work Email</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-elevated)', gap: 8 }}>
                  <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Min 5 chars, 2 nums</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-elevated)', gap: 8 }}>
                  <Lock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 5 chars, 2 numbers (e.g. employee01)" required style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Confirm Password</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '9px 12px', backgroundColor: 'var(--bg-elevated)', gap: 8 }}>
                  <Lock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--cyberx-red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Joining...' : 'Join Company'}
                <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: 18, borderTop: '1px solid var(--border-primary)', paddingTop: 14, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--cyberx-red)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
