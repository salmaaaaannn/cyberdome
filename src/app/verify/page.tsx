'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import CyberSafetyLogo from '@/components/ui/CyberSafetyLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAppStore } from '@/stores/appStore';
import { ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

export default function VerifyPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAppStore();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.join('').length !== 6) return;
    setLoading(true);
    setTimeout(() => {
      const role = user?.role || 'USER';
      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'EMPLOYEE') {
        router.push('/employee/dashboard');
      } else {
        router.push('/personal/dashboard');
      }
    }, 600);
  };

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[i] = val.slice(-1);
    setCode(newCode);
    if (val && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        padding: 24,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <ThemeToggle showLabel={true} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-surface)',
          padding: '40px 32px',
          borderRadius: 16,
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-card)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <CyberSafetyLogo size={36} />
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--color-critical-bg)',
            color: 'var(--color-critical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <ShieldCheck size={24} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Two-Factor Authentication
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 14, lineHeight: 1.5 }}>
          Enter the 6-digit verification code sent to your enterprise authenticator app or email.
        </p>

        <form onSubmit={handleVerify}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            {code.map((d, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: 46,
                  height: 54,
                  fontSize: 22,
                  fontWeight: 700,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  background: 'var(--bg-panel)',
                  border: '1.5px solid var(--border-primary)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-critical)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(217, 45, 32, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-primary)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.join('').length !== 6}
            className="cyber-btn cyber-btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || code.join('').length !== 6 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? 'Verifying Identity...' : 'Verify & Continue'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={() => {
              setCode(['', '', '', '', '', '']);
              document.getElementById('otp-0')?.focus();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} /> Resend verification code
          </button>
        </div>
      </motion.div>
    </div>
  );
}
