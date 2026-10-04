'use client';
// @ts-nocheck

import React from 'react';
import Link from 'next/link';
import CyberSafetyLogo from '@/components/ui/CyberSafetyLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PhishingSimulationLanding() {
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%',
          maxWidth: 560,
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 16,
          padding: '36px 32px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-primary)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <CyberSafetyLogo size={60} showSubtitle={false} href="/" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-info)' }}>
            <ShieldCheck size={32} />
          </div>
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          SECURITY AWARENESS EXERCISE
        </h1>

        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
          This was a simulated security exercise.
          <br />
          <strong style={{ color: 'var(--color-success)' }}>No password or credential was collected.</strong>
        </p>

        {/* What happened */}
        <div style={{ textAlign: 'left', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-primary)', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            What happened:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--color-success)" />
              <span>Simulation opened</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--color-success)" />
              <span>Security scenario detected</span>
            </div>
          </div>
        </div>

        {/* Recommended */}
        <div style={{ textAlign: 'left', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-primary)', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            Recommended:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Verify sender</li>
            <li>Check URL</li>
            <li>Avoid urgent credential requests</li>
            <li>Report suspicious messages</li>
          </ul>
        </div>

        <Link href="/academy" style={{ textDecoration: 'none' }}>
          <button
            type="button"
            className="cyber-btn cyber-btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <span>Continue Training</span>
            <ArrowRight size={16} />
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
