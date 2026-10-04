'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CyberSafetyLogo from '@/components/ui/CyberSafetyLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAppStore } from '@/stores/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  GraduationCap,
  Shield,
  PhoneCall,
  KeyRound,
  Globe,
  Laptop,
  ChevronDown,
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  Activity,
  ScrollText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  User as UserIcon,
  ShieldAlert,
  ClipboardList,
  Radar,
} from 'lucide-react';

export default function UnifiedNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, unreadNotifications } = useAppStore();

  const [safetyToolsOpen, setSafetyToolsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const safetyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (safetyRef.current && !safetyRef.current.contains(e.target as Node)) {
        setSafetyToolsOpen(false);
      }
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setWorkspaceOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setSafetyToolsOpen(false);
      setWorkspaceOpen(false);
      setProfileOpen(false);
      setMobileDrawerOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const role = user?.role === 'NORMAL_USER' ? 'USER' : user?.role || 'USER';

  // Home route depends on role
  const homePath =
    role === 'ADMIN' ? '/admin' : role === 'EMPLOYEE' ? '/employee/dashboard' : '/personal/dashboard';

  // User initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CS';

  // Safety tools items (Universal across all roles)
  const safetyTools = [
    {
      name: 'Fraud Call Check',
      path: '/personal/fraud-call',
      desc: 'Verify unknown caller numbers and phone scam reports',
      icon: PhoneCall,
    },
    {
      name: 'OTP Scam Protection',
      path: '/personal/otp-scam',
      desc: 'Analyze urgency language and fake authentication requests',
      icon: KeyRound,
    },
    {
      name: 'URL Safety Checker',
      path: '/personal/url-check',
      desc: 'Scan phishing links, typosquatting domains, and malware URLs',
      icon: Globe,
    },
    {
      name: 'Device Security',
      path: '/personal/device-security',
      desc: 'Review OS updates, disk encryption, and firewall status',
      icon: Laptop,
    },
  ];

  // Workspace items dynamically mapped based on role
  const getWorkspaceItems = () => {
    if (role === 'ADMIN') {
      return [
        { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Security Simulations', path: '/admin/security-simulations', icon: ShieldAlert },
        { name: 'Employee Risk', path: '/admin/employee-risk', icon: Users },
        { name: 'Employee Devices', path: '/admin/devices', icon: Laptop },
        { name: 'Security Simulation Lab', path: '/simulate/lab', icon: Activity },
        { name: 'Human Behavior Lab', path: '/simulate/human-behavior', icon: ShieldAlert },
        { name: 'Digital Twin (3D)', path: '/digital-twin', icon: Radar },
        { name: 'What-If Simulator', path: '/what-if', icon: Activity },
        { name: 'Attack Surface', path: '/attack-surface', icon: Globe },
        { name: 'User Management', path: '/admin?tab=users', icon: Users },
        { name: 'Notification Center', path: '/notifications', icon: Bell },
        { name: 'Presentation Mode', path: '/presentation', icon: Activity },
        { name: 'Security Reports', path: '/reports', icon: FileText },
      ];
    }
    if (role === 'EMPLOYEE') {
      return [
        { name: 'Employee Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
        { name: 'Security Simulation Lab', path: '/simulate/lab', icon: Activity },
        { name: 'Human Behavior Lab', path: '/simulate/human-behavior', icon: ShieldAlert },
        { name: 'My Security Activity', path: '/employee/my-security', icon: Activity },
        { name: 'Security Awareness Drills', path: '/training/phishing-simulation', icon: ShieldAlert },
        { name: 'Assigned Tasks', path: '/employee/alerts', icon: ClipboardList },
        { name: 'My Reports', path: '/reports', icon: FileText },
      ];
    }
    // Normal User
    return [
      { name: 'My Dashboard', path: '/personal/dashboard', icon: LayoutDashboard },
      { name: 'My Activity', path: '/personal/dashboard#activity', icon: Activity },
      { name: 'My Reports', path: '/reports', icon: FileText },
    ];
  };

  const workspaceItems = getWorkspaceItems();

  const isSafetyToolActive = safetyTools.some((t) => pathname.startsWith(t.path));
  const isWorkspaceActive = workspaceItems.some((w) => pathname === w.path || (w.path !== '/admin' && pathname.startsWith(w.path)));

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 64,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-primary)',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        {/* Left: Mobile Toggle + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
            className="show-mobile-btn"
            aria-label="Open Navigation Menu"
          >
            <Menu size={22} />
          </button>

          <CyberSafetyLogo size={32} showSubtitle={false} href={homePath} />
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav
          className="hide-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {/* Home */}
          <Link
            href={homePath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 500,
              color: pathname === homePath ? 'var(--color-critical)' : 'var(--text-secondary)',
              background: pathname === homePath ? 'var(--color-critical-bg)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Home size={16} />
            <span>Home</span>
          </Link>

          {/* Academy */}
          <Link
            href="/academy"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 500,
              color: pathname.startsWith('/academy') ? 'var(--color-critical)' : 'var(--text-secondary)',
              background: pathname.startsWith('/academy') ? 'var(--color-critical-bg)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <GraduationCap size={16} />
            <span>Academy</span>
          </Link>

          {/* Safety Tools Dropdown */}
          <div ref={safetyRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSafetyToolsOpen(!safetyToolsOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                color: isSafetyToolActive ? 'var(--color-critical)' : 'var(--text-secondary)',
                background: isSafetyToolActive ? 'var(--color-critical-bg)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Shield size={16} />
              <span>Safety Tools</span>
              <ChevronDown
                size={14}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: safetyToolsOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {safetyToolsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: 320,
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  border: '1px solid var(--border-primary)',
                  boxShadow: '0 10px 25px rgba(16, 24, 40, 0.1)',
                  padding: 8,
                  zIndex: 60,
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  PERSONAL CYBER DEFENSE
                </div>
                {safetyTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = pathname.startsWith(tool.path);
                  return (
                    <Link
                      key={tool.path}
                      href={tool.path}
                      onClick={() => setSafetyToolsOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: isActive ? 'var(--color-critical-bg)' : 'transparent',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: isActive ? '#FEE4E2' : 'var(--bg-hover)',
                          color: isActive ? 'var(--color-critical)' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                          {tool.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.35, marginTop: 2 }}>
                          {tool.desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workspace Dropdown */}
          <div ref={workspaceRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                color: isWorkspaceActive ? 'var(--color-critical)' : 'var(--text-secondary)',
                background: isWorkspaceActive ? 'var(--color-critical-bg)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutDashboard size={16} />
              <span>Workspace</span>
              <ChevronDown
                size={14}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: workspaceOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {workspaceOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: 260,
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  border: '1px solid var(--border-primary)',
                  boxShadow: '0 10px 25px rgba(16, 24, 40, 0.1)',
                  padding: 8,
                  zIndex: 60,
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  {role === 'ADMIN' ? 'ADMINISTRATION' : role === 'EMPLOYEE' ? 'EMPLOYEE WORKSPACE' : 'PERSONAL WORKSPACE'}
                </div>
                {workspaceItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setWorkspaceOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 8,
                        background: isActive ? 'var(--color-critical-bg)' : 'transparent',
                        textDecoration: 'none',
                        color: isActive ? 'var(--color-critical)' : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Icon size={16} color={isActive ? 'var(--color-critical)' : 'var(--text-muted)'} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right: ThemeToggle + Notifications + User Profile Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications link with unread badge */}
          <Link
            href="/notifications"
            style={{
              position: 'relative',
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadNotifications > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--color-critical)',
                }}
              />
            )}
          </Link>

          {/* User Profile Pill & Dropdown */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 10px 4px 5px',
                borderRadius: 9999,
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--color-critical-bg)',
                  border: '1px solid var(--color-critical-border)',
                  color: 'var(--color-critical)',
                  fontWeight: 700,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </div>

              <div className="hide-mobile" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.name || 'Khan Salman'}
                </div>
              </div>

              {/* Clean Small Role Badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  background:
                    role === 'ADMIN' ? 'var(--color-critical-bg)' : role === 'EMPLOYEE' ? 'var(--color-info-bg)' : 'var(--bg-hover)',
                  color:
                    role === 'ADMIN' ? 'var(--color-critical)' : role === 'EMPLOYEE' ? 'var(--color-info)' : 'var(--text-secondary)',
                  border: `1px solid ${
                    role === 'ADMIN' ? 'var(--color-critical-border)' : role === 'EMPLOYEE' ? 'var(--color-info-border)' : 'var(--border-primary)'
                  }`,
                  letterSpacing: '0.04em',
                }}
              >
                {role === 'USER' ? 'PERSONAL' : role}
              </span>

              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 250,
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  border: '1px solid var(--border-primary)',
                  boxShadow: '0 10px 25px rgba(16, 24, 40, 0.1)',
                  padding: 8,
                  zIndex: 60,
                }}
              >
                <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--bg-hover)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user?.name || 'Khan Salman'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, wordBreak: 'break-all' }}>
                    {user?.email || 'admin@cybersafety.io'}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {role === 'ADMIN'
                        ? 'Administrator'
                        : role === 'EMPLOYEE'
                        ? 'Authorized Employee'
                        : 'Personal Account'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '6px 0' }}>
                  <Link
                    href="/personal/settings"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserIcon size={15} color="var(--text-muted)" />
                    <span>Profile &amp; Account</span>
                  </Link>

                  <Link
                    href="/personal/device-security"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Shield size={15} color="var(--text-muted)" />
                    <span>Security Posture</span>
                  </Link>
                </div>

                <div style={{ borderTop: '1px solid var(--bg-hover)', paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--color-critical)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-critical-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={15} color="var(--color-critical)" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Smooth AnimatePresence) */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(16, 24, 40, 0.4)',
                backdropFilter: 'blur(4px)',
                zIndex: 90,
              }}
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                width: 290,
                background: 'var(--bg-surface)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 20px rgba(16, 24, 40, 0.1)',
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  borderBottom: '1px solid var(--border-primary)',
                }}
              >
                <CyberSafetyLogo size={28} showSubtitle={false} href={homePath} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 6,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
                <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  PERSONAL SAFETY
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Link
                    href={homePath}
                    onClick={() => setMobileDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13.5,
                      color: pathname === homePath ? 'var(--color-critical)' : 'var(--text-secondary)',
                      background: pathname === homePath ? 'var(--color-critical-bg)' : 'transparent',
                      textDecoration: 'none',
                    }}
                  >
                    <Home size={16} /> Home
                  </Link>

                  <Link
                    href="/academy"
                    onClick={() => setMobileDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13.5,
                      color: pathname.startsWith('/academy') ? 'var(--color-critical)' : 'var(--text-secondary)',
                      background: pathname.startsWith('/academy') ? 'var(--color-critical-bg)' : 'transparent',
                      textDecoration: 'none',
                    }}
                  >
                    <GraduationCap size={16} /> Academy
                  </Link>

                  {safetyTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = pathname.startsWith(tool.path);
                    return (
                      <Link
                        key={tool.path}
                        href={tool.path}
                        onClick={() => setMobileDrawerOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 13.5,
                          color: isActive ? 'var(--color-critical)' : 'var(--text-secondary)',
                          background: isActive ? 'var(--color-critical-bg)' : 'transparent',
                          textDecoration: 'none',
                        }}
                      >
                        <Icon size={16} /> {tool.name}
                      </Link>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {role === 'ADMIN' ? 'ADMINISTRATION' : role === 'EMPLOYEE' ? 'EMPLOYEE WORKSPACE' : 'MY WORKSPACE'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {workspaceItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setMobileDrawerOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 13.5,
                          color: isActive ? 'var(--color-critical)' : 'var(--text-secondary)',
                          background: isActive ? 'var(--color-critical-bg)' : 'transparent',
                          textDecoration: 'none',
                        }}
                      >
                        <Icon size={16} /> {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-primary)', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--color-critical-bg)',
                      color: 'var(--color-critical)',
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {user?.name || 'Khan Salman'}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 9999,
                        background: 'var(--color-critical-bg)',
                        color: 'var(--color-critical)',
                      }}
                    >
                      {role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '8px',
                    borderRadius: 8,
                    border: '1px solid var(--color-critical-border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--color-critical)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
