'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  ShieldAlert, Shield, 
  ScanLine, Activity,
  Globe, Crosshair,
  Cpu, Radar, Users, FolderKanban, ShieldCheck, FileText, BrainCircuit
} from 'lucide-react';

import { CyberdomeLoader } from '@/components/ui/CyberdomeLoader';

// Dynamically import the 3D scene to avoid SSR issues with Three.js
const CyberDomeScene = dynamic(() => import('@/components/CyberDomeScene'), { 
  ssr: false,
  loading: () => <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100vh', background: '#050607' }} />
});

const Cyberdome3DMonitor = dynamic(
  () => import('@/components/ui/cyberdome-3d-monitor'),
  {
    ssr: false,
    loading: () => (
      <CyberdomeLoader
        fullscreen={false}
        label="INITIALIZING CYBER DOME DEFENSE GRID..."
        subtext="COMPILING THREE.JS PIPELINE · CALIBRATING NODES"
      />
    ),
  }
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Force dark mode on the landing page permanently
    document.documentElement.setAttribute('data-theme', 'dark');
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#050607', // Pure void black
      color: '#F4F7FA',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* 3D Cinematic Background */}
      <CyberDomeScene />
      
      {/* Dark gradient overlay to ensure text readability */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '100vh',
        background: 'radial-gradient(circle at center, transparent 0%, #050607 80%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Header matching the photo */}
        <header style={{ 
          background: scrolled ? 'rgba(5, 6, 7, 0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          transition: 'all 0.3s ease',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        }}>
          <div style={{
            maxWidth: 1400, margin: '0 auto', padding: '20px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(255,23,68,0.1)',
                border: '1px solid rgba(255,23,68,0.3)',
                boxShadow: '0 0 15px rgba(255,23,68,0.2)'
              }}>
                <Shield size={18} color="#FF1744" />
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.05em', fontFamily: 'Orbitron, sans-serif' }}>
                <span style={{ color: '#F4F7FA' }}>CYBER</span>
                <span style={{ color: '#FF1744', textShadow: '0 0 10px rgba(255,23,68,0.5)' }}>DOME</span>
              </span>
            </div>
            
            {/* Center Nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, fontWeight: 500, color: '#A5AFBA' }}>
              <Link href="#defense-grid" style={{ color: '#8AA6D6', textDecoration: 'none', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Radar size={15} /> 3D Defense Grid
              </Link>
              <Link href="/personal/url-check" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#F4F7FA'} onMouseLeave={e => e.currentTarget.style.color = '#A5AFBA'}>URL Check</Link>
              <Link href="/attack-surface" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#F4F7FA'} onMouseLeave={e => e.currentTarget.style.color = '#A5AFBA'}>Attack Surface</Link>
              <Link href="/scanner" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#F4F7FA'} onMouseLeave={e => e.currentTarget.style.color = '#A5AFBA'}>Scanner</Link>
            </nav>

            {/* Right Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: '#F4F7FA', textDecoration: 'none' }}>Sign In</Link>
              <Link href="/signup" style={{ 
                padding: '10px 24px', borderRadius: 6, 
                background: '#FF1744', color: '#FFF', 
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 0 20px rgba(255, 23, 68, 0.4)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                transition: 'transform 0.2s'
              }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                GET STARTED
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', transform: 'translateY(-5vh)' }}>
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 8, 
              padding: '6px 20px', borderRadius: 999, 
              background: 'rgba(255,23,68,0.05)', border: '1px solid rgba(255,23,68,0.2)',
              color: '#FF1744', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
              marginBottom: 32, textTransform: 'uppercase'
            }}>
              <Activity size={14} /> ENTERPRISE CYBERSECURITY PLATFORM
            </div>
            
            <h1 style={{ 
              fontSize: 72, fontWeight: 800, lineHeight: 1.1, 
              color: '#F4F7FA', letterSpacing: '-0.02em', marginBottom: 24,
            }}>
              Your Network's <br />
              <span style={{ 
                color: '#FF1744', 
                textShadow: '0 0 40px rgba(255, 23, 68, 0.6), 0 0 80px rgba(255, 23, 68, 0.2)'
              }}>
                Silent Guardian.
              </span>
            </h1>
            
            <p style={{ 
              fontSize: 18, color: '#A5AFBA', lineHeight: 1.6, 
              maxWidth: 640, margin: '0 auto 48px' 
            }}>
              Unify external attack surface mapping, vulnerability intelligence, and compliance workflows into one single pane of glass. Advanced digital defense for the modern enterprise.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <Link href="/scanner" style={{
                padding: '16px 36px', borderRadius: 8,
                background: '#FF1744', color: '#FFF',
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 10,
                boxShadow: '0 0 30px rgba(255, 23, 68, 0.3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                transition: 'all 0.2s'
              }} onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(255, 23, 68, 0.5)';
              }} onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 23, 68, 0.3)';
              }}>
                LAUNCH SCANNER <Crosshair size={18} />
              </Link>
              <Link href="/dashboard" style={{
                padding: '16px 36px', borderRadius: 8,
                background: '#11161D', color: '#F4F7FA',
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
              }} onMouseEnter={e => {
                e.currentTarget.style.background = '#151B23';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }} onMouseLeave={e => {
                e.currentTarget.style.background = '#11161D';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}>
                Explore Live Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive 3D Cyberdome Threat Defense Monitor */}
        <section id="defense-grid" style={{
          position: 'relative',
          padding: '60px 24px 100px',
          background: '#0C1118',
          borderTop: '1px solid rgba(138, 166, 214, 0.15)',
          borderBottom: '1px solid rgba(138, 166, 214, 0.15)',
          zIndex: 10
        }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 20px', borderRadius: 999,
                background: 'rgba(138, 166, 214, 0.08)',
                border: '1px solid rgba(138, 166, 214, 0.25)',
                color: '#8AA6D6', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
                marginBottom: 16, textTransform: 'uppercase'
              }}>
                <Radar size={14} /> AUTONOMOUS 3D DEFENSE GRID · LIVE DIGITAL TWIN
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 800, color: '#EAEEF5', marginBottom: 12, letterSpacing: '-0.02em' }}>
                Procedural Threat Defense Machinery
              </h2>
              <p style={{ color: '#8AA6D6', fontSize: 16, maxWidth: 680, margin: '0 auto', lineHeight: 1.6 }}>
                Explore the 5 synchronized defense nodes: Sensor Ingress, Multi-Model ML Fusion, Grounded AI Copilot, Command Center, and Autonomous SOAR Engine.
              </p>
            </div>

            <div style={{
              width: '100%',
              height: '760px',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(138, 166, 214, 0.22)',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.8), 0 0 30px rgba(138, 166, 214, 0.1)',
              position: 'relative',
              background: '#0C1118'
            }}>
              <Cyberdome3DMonitor />
            </div>

          </div>
        </section>

        {/* Phase 3 - Interactive Holographic Panels */}
        <section style={{ padding: '120px 24px', background: 'linear-gradient(180deg, transparent 0%, #050607 10%, #050607 100%)', position: 'relative' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#F4F7FA', marginBottom: 16 }}>
                Unified Intelligence Architecture
              </h2>
              <p style={{ color: '#A5AFBA', maxWidth: 600, margin: '0 auto', fontSize: 18 }}>
                The complete lifecycle of enterprise security.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
              
              {/* DISCOVER */}
              <ModuleCard 
                icon={Globe} 
                title="DISCOVER" 
                desc="Know your attack surface. Map exposed endpoints, vulnerabilities, and digital infrastructure."
                href="/attack-surface"
              />
              
              {/* DETECT */}
              <ModuleCard 
                icon={Radar} 
                title="DETECT" 
                desc="See threats as they emerge. Real-time network telemetry, IoT monitoring, and UEBA."
                href="/network"
              />
              
              {/* SIMULATE */}
              <ModuleCard 
                icon={FolderKanban} 
                title="SIMULATE" 
                desc="Model what could happen. Interactive Digital Twins and advanced Attack Graph visualizations."
                href="/simulate/lab"
              />

              {/* RESPOND */}
              <ModuleCard 
                icon={ShieldAlert} 
                title="RESPOND" 
                desc="Act before impact. Integrated incident response, MITRE mapping, and automated SOAR execution."
                href="/incidents"
              />

              {/* TRAIN */}
              <ModuleCard 
                icon={Users} 
                title="TRAIN" 
                desc="Build stronger security behavior. Phishing simulations and employee readiness training."
                href="/training/phishing-simulation"
              />

              {/* AI COPILOT */}
              <ModuleCard 
                icon={BrainCircuit} 
                title="AI COPILOT" 
                desc="Understand your security data. Context-aware AI using real-time RAG intelligence."
                href="/ai"
                highlight
              />

            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ padding: '120px 24px', background: '#050607', textAlign: 'center' }}>
          <div style={{ 
            maxWidth: 800, margin: '0 auto', padding: '64px',
            background: 'radial-gradient(circle at top, rgba(255,23,68,0.1) 0%, transparent 70%)',
            borderTop: '1px solid rgba(255,23,68,0.2)',
            borderRadius: 24
          }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: '#F4F7FA', marginBottom: 24 }}>
              ENTER CYBER<span style={{ color: '#FF1744' }}>DOME</span>
            </h2>
            <p style={{ color: '#A5AFBA', fontSize: 18, marginBottom: 40 }}>
              Your Network's Silent Guardian.
            </p>
            <Link href="/dashboard" style={{
              padding: '18px 40px', borderRadius: 8,
              background: '#FF1744', color: '#FFF',
              fontSize: 16, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 40px rgba(255, 23, 68, 0.4)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              ENTER THE COMMAND CENTER
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          padding: '48px 32px 36px',
          background: '#080A0D'
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={20} color="#FF1744" />
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em', fontFamily: 'Orbitron, sans-serif' }}>
                  <span style={{ color: '#E0E0E0' }}>CYBER</span>
                  <span style={{ color: '#FF1744' }}>DOME</span>
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#66717D' }}>
                Unified Cyber Safety Platform · Enterprise Defense Systems
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, color: '#A5AFBA' }}>
              <Link href="/attack-surface" style={{ color: 'inherit', textDecoration: 'none' }}>Attack Surface</Link>
              <Link href="/scanner" style={{ color: 'inherit', textDecoration: 'none' }}>Scanner</Link>
              <Link href="/vulnerabilities" style={{ color: 'inherit', textDecoration: 'none' }}>Intelligence</Link>
              <Link href="/ai" style={{ textDecoration: 'none', color: '#00D9FF' }}>AI Copilot</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, desc, href, highlight = false }: { icon: any, title: string, desc: string, href: string, highlight?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '36px', borderRadius: 12,
        background: '#0D1117',
        border: `1px solid ${highlight ? 'rgba(0,217,255,0.3)' : '#26313D'}`,
        boxShadow: highlight ? 'inset 0 0 20px rgba(0,217,255,0.05)' : 'none',
        transition: 'transform 0.3s, border-color 0.3s, box-shadow 0.3s',
        position: 'relative', overflow: 'hidden',
        height: '100%'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.borderColor = highlight ? '#00D9FF' : '#FF1744';
        e.currentTarget.style.boxShadow = highlight ? '0 10px 30px rgba(0,217,255,0.1)' : '0 10px 30px rgba(255,23,68,0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = highlight ? 'rgba(0,217,255,0.3)' : '#26313D';
        e.currentTarget.style.boxShadow = highlight ? 'inset 0 0 20px rgba(0,217,255,0.05)' : 'none';
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 120, height: 120,
          background: `radial-gradient(circle top right, ${highlight ? 'rgba(0,217,255,0.15)' : 'rgba(255,23,68,0.1)'} 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}/>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: highlight ? 'rgba(0,217,255,0.1)' : 'rgba(255,23,68,0.1)', 
            color: highlight ? '#00D9FF' : '#FF1744',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${highlight ? 'rgba(0,217,255,0.2)' : 'rgba(255,23,68,0.2)'}`
          }}>
            <Icon size={24} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F4F7FA', letterSpacing: '0.05em' }}>{title}</h3>
        </div>
        <p style={{ fontSize: 15, color: '#A5AFBA', lineHeight: 1.6 }}>{desc}</p>
      </div>
    </Link>
  );
}
