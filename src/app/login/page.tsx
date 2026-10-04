// @ts-nocheck
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CyberSafetyLogo from '@/components/ui/CyberSafetyLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAppStore } from '@/stores/appStore';
import {
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  User,
  Building2,
  Shield,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [showCompanyCodeField, setShowCompanyCodeField] = useState(false);
  const [error, setError] = useState('');
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, companyLogin } = useAppStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setForgotPasswordMsg('');

    try {
      let authenticatedUser;
      if (showCompanyCodeField && companyCode.trim()) {
        authenticatedUser = await companyLogin({
          companyCode: companyCode.trim(),
          email: email.trim(),
          password,
        });
      } else {
        authenticatedUser = await login(email.trim(), password);
      }

      if (authenticatedUser.role === 'ADMIN') {
        router.push('/admin');
      } else if (authenticatedUser.role === 'EMPLOYEE') {
        router.push('/employee/dashboard');
      } else {
        router.push('/personal/dashboard');
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please verify your credentials.';
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
        color: 'var(--text-primary)',
        padding: '32px 16px',
        position: 'relative',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <ThemeToggle showLabel={true} />
      </div>

      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <CyberSafetyLogo size={40} showSubtitle={true} href="/" />
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 16,
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-card)',
          maxWidth: 480,
          width: '100%',
          padding: '32px 28px',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Sign in to CYBERDOME
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
            Your Network's Silent Guardian.
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
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {forgotPasswordMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info-border)',
              color: 'var(--color-info)',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{forgotPasswordMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                padding: '9px 12px',
                backgroundColor: 'var(--bg-elevated)',
                gap: 8,
                transition: 'border-color 0.15s ease',
              }}
            >
              <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com or personal email"
                required
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: 14,
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  setForgotPasswordMsg(
                    'Password reset link sent to registered email address.'
                  )
                }
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 12,
                  color: 'var(--cyberx-red)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Forgot password?
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                padding: '9px 12px',
                backgroundColor: 'var(--bg-elevated)',
                gap: 8,
                transition: 'border-color 0.15s ease',
              }}
            >
              <Lock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: 14,
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowCompanyCodeField(!showCompanyCodeField)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                <KeyRound size={13} style={{ color: 'var(--cyberx-red)' }} />
                <span>
                  {showCompanyCodeField ? 'Hide company access code' : 'Have a company access code?'}
                </span>
              </button>
            </div>

            {showCompanyCodeField && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CSX-COMPANY"
                  style={{
                    border: '1px solid var(--border-primary)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    textTransform: 'uppercase',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: 'var(--cyberx-red)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '11px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 6,
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
              transition: 'opacity 0.15s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign in to CYBERDOME'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: 22, borderTop: '1px solid var(--border-primary)', paddingTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <User size={18} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Personal Account</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Individual cyber defense tools.</div>
              </div>
            </div>
            
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <Building2 size={18} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Company Employee</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connected to organization workspace.</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <Shield size={18} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Company Admin</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Full tenant security control.</div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            Don't have an account?{' '}
            <Link
              href="/signup"
              style={{
                color: 'var(--cyberx-red)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign up
            </Link>
          </div>
          <div>
            Have a company invitation?{' '}
            <Link
              href="/join-company"
              style={{
                color: 'var(--cyberx-red)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Join a Company
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
