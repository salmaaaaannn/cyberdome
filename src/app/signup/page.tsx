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
  Building2,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Phone,
  Globe,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function SignupPage() {
  const [accountType, setAccountType] = useState<'PERSONAL' | 'COMPANY' | 'EMPLOYEE'>('PERSONAL');

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Company Specific Fields
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [accessPass, setAccessPass] = useState('');

  // Employee Specific Fields
  const [employeeCompanyPass, setEmployeeCompanyPass] = useState('');
  const [verifiedAdminCompany, setVerifiedAdminCompany] = useState('');
  const [isVerifyingPass, setIsVerifyingPass] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup, companySignup, joinCompany } = useAppStore();
  const router = useRouter();

  const handleVerifyEmployeePass = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length < 3) {
      setVerifiedAdminCompany('');
      return;
    }
    setIsVerifyingPass(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${API_BASE}/auth/verify-company-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_code: trimmed }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setVerifiedAdminCompany(json.data.company_name || 'Admin Workspace');
          setError('');
        } else {
          setVerifiedAdminCompany('');
        }
      } else {
        setVerifiedAdminCompany('');
      }
    } catch {
      setVerifiedAdminCompany('');
    } finally {
      setIsVerifyingPass(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
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
      if (accountType === 'PERSONAL') {
        await signup({ name, email, password });
        router.push('/personal/dashboard');
      } else if (accountType === 'COMPANY') {
        if (!companyName.trim()) {
          setError('Company Name is required.');
          setLoading(false);
          return;
        }

        if (accessPass.trim()) {
          const passCodeDigits = (accessPass.trim().match(/\d/g) || []).length;
          if (accessPass.trim().length < 5) {
            setError('Company Access Pass must be at least 5 characters long.');
            setLoading(false);
            return;
          }
          if (passCodeDigits < 2) {
            setError('Company Access Pass must contain at least 2 numbers (e.g. SALMAN01).');
            setLoading(false);
            return;
          }
        }

        const passCode = accessPass.trim()
          ? accessPass.trim().toUpperCase()
          : (companyName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) + '01');

        let cleanDomain = companyDomain.trim().toLowerCase().replace(/\s+/g, '-');
        if (!cleanDomain || cleanDomain.length < 3) {
          const baseName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company';
          cleanDomain = `${baseName}.local`;
        }

        await companySignup({
          companyName: companyName.trim(),
          domain: cleanDomain,
          adminName: name.trim(),
          workEmail: email.trim(),
          phone: phone.trim() || undefined,
          password,
          accessCode: passCode,
        });

        router.push('/admin');
      } else if (accountType === 'EMPLOYEE') {
        const pass = employeeCompanyPass.trim().toUpperCase();
        if (!pass) {
          setError('Admin Company Pass is required for employee registration.');
          setLoading(false);
          return;
        }

        await joinCompany({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          companyCode: pass,
        });

        router.push('/employee/dashboard');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account. Please try again.';
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 16,
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-card)',
          maxWidth: 520,
          width: '100%',
          padding: '32px 28px',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 21,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Create your CYBERDOME account
          </h1>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            backgroundColor: 'var(--bg-elevated)',
            padding: 4,
            borderRadius: 10,
            marginBottom: 20,
            gap: 4,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAccountType('PERSONAL');
              setError('');
            }}
            style={{
              padding: '9px 8px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
              backgroundColor: accountType === 'PERSONAL' ? 'var(--bg-surface)' : 'transparent',
              color: accountType === 'PERSONAL' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: accountType === 'PERSONAL' ? 'var(--shadow-card)' : 'none',
            }}
          >
            <User size={15} />
            Personal
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountType('COMPANY');
              setError('');
            }}
            style={{
              padding: '9px 8px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
              backgroundColor: accountType === 'COMPANY' ? 'var(--bg-surface)' : 'transparent',
              color: accountType === 'COMPANY' ? 'var(--cyberx-red)' : 'var(--text-secondary)',
              boxShadow: accountType === 'COMPANY' ? 'var(--shadow-card)' : 'none',
            }}
          >
            <Building2 size={15} />
            Company Admin
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountType('EMPLOYEE');
              setError('');
            }}
            style={{
              padding: '9px 8px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
              backgroundColor: accountType === 'EMPLOYEE' ? 'var(--bg-surface)' : 'transparent',
              color: accountType === 'EMPLOYEE' ? 'var(--cyberx-red)' : 'var(--text-secondary)',
              boxShadow: accountType === 'EMPLOYEE' ? 'var(--shadow-card)' : 'none',
            }}
          >
            <ShieldCheck size={15} />
            Employee
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            {accountType === 'PERSONAL'
              ? 'For individuals who want to use CYBERDOME.'
              : accountType === 'COMPANY'
              ? 'Create a secure CYBERDOME workspace for your organization as Admin.'
              : 'Join your organization group using the access passcode created by your Admin.'}
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

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {accountType === 'COMPANY' && (
            <>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Company Name
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
                  }}
                >
                  <Building2 size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompanyName(val);
                      if (!accessPass || accessPass.endsWith('01') || accessPass.endsWith('-SEC')) {
                        const code = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                        setAccessPass(code ? `${code}01` : '');
                      }
                    }}
                    placeholder="e.g. Acme Global Defense"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Company Domain
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Optional</span>
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
                  }}
                >
                  <Globe size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder="e.g. acmedefense.com (or auto-generated)"
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
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  If left blank, CYBERDOME automatically creates a local workspace domain for your company.
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Company Access Pass (Employee Join Code)
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--cyberx-red)', fontWeight: 600 }}>Min 5 chars, 2 numbers</span>
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
                  }}
                >
                  <KeyRound size={16} style={{ color: 'var(--cyberx-red)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={accessPass}
                    onChange={(e) => setAccessPass(e.target.value.toUpperCase())}
                    placeholder="e.g. SALMAN01 or PASS20"
                    required
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: 14,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  Min 5 characters & at least 2 numbers. Employees will enter this passcode at <strong>/join-company</strong> to join your group.
                </p>
              </div>
            </>
          )}

          {accountType === 'EMPLOYEE' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Admin Company Pass (Join Code)
                </label>
                {verifiedAdminCompany ? (
                  <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} /> Connected: {verifiedAdminCompany}
                  </span>
                ) : isVerifyingPass ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verifying pass...</span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--cyberx-red)', fontWeight: 600 }}>Required</span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: verifiedAdminCompany ? '1px solid var(--color-success)' : '1px solid var(--border-primary)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-elevated)',
                  gap: 8,
                  transition: 'border-color 0.2s ease',
                }}
              >
                <KeyRound size={16} style={{ color: verifiedAdminCompany ? 'var(--color-success)' : 'var(--cyberx-red)', flexShrink: 0 }} />
                <input
                  type="text"
                  value={employeeCompanyPass}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setEmployeeCompanyPass(val);
                    if (val.length >= 4) {
                      handleVerifyEmployeePass(val);
                    } else {
                      setVerifiedAdminCompany('');
                    }
                  }}
                  onBlur={() => {
                    if (employeeCompanyPass) {
                      handleVerifyEmployeePass(employeeCompanyPass);
                    }
                  }}
                  placeholder="e.g. SALMAN01"
                  required
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                {verifiedAdminCompany
                  ? `Your account will automatically connect to ${verifiedAdminCompany}'s company group managed by your Admin.`
                  : 'Enter the company access pass created by your Admin to connect directly to their workspace.'}
              </p>
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 5,
              }}
            >
              {accountType === 'COMPANY'
                ? 'Admin Full Name'
                : accountType === 'EMPLOYEE'
                ? 'Employee Full Name'
                : 'Full Name'}
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
              }}
            >
              <User size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={accountType === 'EMPLOYEE' ? 'e.g. Alex Morgan' : 'e.g. Jane Doe'}
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
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 5,
              }}
            >
              {accountType === 'COMPANY'
                ? 'Work Email (Admin)'
                : accountType === 'EMPLOYEE'
                ? 'Work Email (Employee)'
                : 'Email Address'}
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
              }}
            >
              <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={accountType === 'COMPANY' ? 'admin@company.com' : 'you@example.com'}
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

          {accountType === 'COMPANY' && (
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                Phone (optional)
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
                }}
              >
                <Phone size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
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
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Password
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Min 5 chars, 2 nums</span>
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
                }}
              >
                <Lock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 5 chars, 2 numbers"
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
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                Confirm Password
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
                }}
              >
                <Lock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              border: '1px solid rgba(59, 130, 246, 0.6)',
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
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading
              ? 'Processing...'
              : accountType === 'PERSONAL'
              ? 'Create Personal Account'
              : accountType === 'COMPANY'
              ? 'Create Company Workspace (Admin)'
              : 'Join Company as Employee'}
            <ArrowRight size={16} />
          </button>
        </form>

        {accountType !== 'EMPLOYEE' ? (
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
            <button
              type="button"
              onClick={() => {
                setAccountType('EMPLOYEE');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--text-muted)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Have an admin company pass? Join as an Employee
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
            <button
              type="button"
              onClick={() => {
                setAccountType('COMPANY');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--text-muted)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Are you an Admin? Create Company Workspace
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            borderTop: '1px solid var(--border-primary)',
            paddingTop: 14,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--cyberx-red)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
