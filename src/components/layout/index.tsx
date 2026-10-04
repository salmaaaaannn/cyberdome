'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CyberSafetyLogo from '@/components/ui/CyberSafetyLogo';
import { useAppStore } from '@/stores/appStore';
import { permissionService } from '@/services';
import UnifiedNavbar from './UnifiedNavbar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import {
  Home,
  GraduationCap,
  PhoneCall,
  KeyRound,
  Globe,
  Laptop,
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  Bell,
  Activity,
  FileText,
  Users,
  UserCheck,
  Radar,
  ScrollText,
  Settings,
  LogOut,
  ChevronRight,
  Search,
  HelpCircle,
  FolderKanban,
  Cpu,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';

export { default as Navbar } from './UnifiedNavbar';
export { default as UnifiedNavbar } from './UnifiedNavbar';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAppStore();

  const role = user?.role === 'NORMAL_USER' ? 'USER' : user?.role || 'USER';

  const homePath =
    role === 'ADMIN' ? '/admin' : role === 'EMPLOYEE' ? '/employee/dashboard' : '/personal/dashboard';

  // 1. Shared Personal Safety Section (Accessible to ALL 3 roles)
  const personalSafetyItems: NavItem[] = [
    { name: 'Home', path: homePath, icon: Home },
    { name: 'Academy', path: '/academy', icon: GraduationCap },
    { name: 'Fraud Call Check', path: '/personal/fraud-call', icon: PhoneCall },
    { name: 'OTP Scam Protection', path: '/personal/otp-scam', icon: KeyRound },
    { name: 'URL Safety Checker', path: '/personal/url-check', icon: Globe },
    { name: 'Device Security', path: '/personal/device-security', icon: Laptop },
  ];

  // Build Sections based on role
  let sections: NavSection[] = [];

  if (role === 'ADMIN') {
    sections = [
      {
        label: 'PERSONAL SAFETY',
        items: personalSafetyItems,
      },
      {
        label: 'DISCOVER',
        items: [
          { name: 'Attack Surface', path: '/attack-surface', icon: Globe },
          { name: 'Web Scanner', path: '/scanner', icon: Search },
          { name: 'Vulnerabilities', path: '/vulnerabilities', icon: ShieldAlert },
        ],
      },
      {
        label: 'DETECT',
        items: [
          { name: 'Network Detection', path: '/network', icon: Radar },
          { name: 'IoT Security', path: '/iot', icon: Cpu },
          { name: 'User Behavior (UEBA)', path: '/ueba', icon: UserCheck },
          { name: 'Attack Graph', path: '/attack-graph', icon: FolderKanban },
        ],
      },
      {
        label: 'SIMULATE',
        items: [
          { name: 'Security Simulation Lab', path: '/simulate/lab', icon: Activity },
          { name: 'Human Behavior Lab', path: '/simulate/human-behavior', icon: UserCheck },
          { name: 'Digital Twin (3D)', path: '/digital-twin', icon: Cpu },
          { name: 'What-If Simulator', path: '/what-if', icon: Radar },
        ],
      },
      {
        label: 'RESPOND',
        items: [
          { name: 'Incidents Queue', path: '/incidents', icon: ShieldAlert },
          { name: 'MITRE ATT&CK', path: '/mitre', icon: Radar },
          { name: 'Detection Rules (Sigma)', path: '/detection-rules', icon: ScrollText },
          { name: 'SOAR Playbooks', path: '/soar', icon: ShieldCheck },
        ],
      },
      {
        label: 'TRAIN & INTELLIGENCE',
        items: [
          { name: 'Security Awareness Simulation', path: '/training/phishing-simulation', icon: ShieldAlert },
          { name: 'AI Security Copilot', path: '/ai', icon: Activity },
          { name: 'Threat Analytics', path: '/analytics', icon: Radar },
          { name: 'Security Reports', path: '/reports', icon: FileText },
        ],
      },
      {
        label: 'SECURITY OPERATIONS',
        items: [
          { name: 'Security Simulations', path: '/admin/security-simulations', icon: ShieldAlert },
          { name: 'Employee Risk', path: '/admin/employee-risk', icon: Users },
          { name: 'Employee Devices', path: '/admin/devices', icon: Laptop },
        ],
      },
      {
        label: 'OPERATIONS & ADMIN',
        items: [
          { name: 'Notification Center', path: '/notifications', icon: Bell },
          { name: 'Presentation Mode', path: '/presentation', icon: Activity },
          { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
          { name: 'Activity Audit Logs', path: '/admin?tab=audit', icon: ScrollText },
        ],
      },
    ];
  } else if (role === 'EMPLOYEE') {
    sections = [
      {
        label: 'PERSONAL SAFETY',
        items: personalSafetyItems,
      },
      {
        label: 'EMPLOYEE WORKSPACE',
        items: [
          { name: 'Employee Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
          { name: 'Security Simulation Lab', path: '/simulate/lab', icon: Activity },
          { name: 'Human Behavior Lab', path: '/simulate/human-behavior', icon: UserCheck },
          { name: 'My Security Activity', path: '/employee/my-security', icon: ShieldCheck },
          { name: 'Security Awareness Drills', path: '/training/phishing-simulation', icon: ShieldAlert },
          { name: 'Assigned Alerts', path: '/employee/alerts', icon: Bell },
          { name: 'AI Assistant', path: '/ai', icon: Activity },
          { name: 'My Reports', path: '/reports', icon: FileText },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { name: 'Notifications', path: '/notifications', icon: Bell },
          { name: 'Settings', path: '/personal/settings', icon: Settings },
        ],
      },
    ];
  } else {
    // Normal User
    sections = [
      {
        label: 'PERSONAL SAFETY',
        items: personalSafetyItems,
      },
      {
        label: 'MY WORKSPACE',
        items: [
          { name: 'My Dashboard', path: '/personal/dashboard', icon: LayoutDashboard },
          { name: 'My Activity', path: '/personal/dashboard#activity', icon: Activity },
          { name: 'AI Safety Copilot', path: '/ai', icon: Activity },
          { name: 'My Reports', path: '/reports', icon: FileText },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { name: 'Notifications', path: '/notifications', icon: Bell },
          { name: 'Settings', path: '/personal/settings', icon: Settings },
        ],
      },
    ];
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CS';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="sidebar" aria-label="Cyber Safety Navigation">
      {/* Brand Header */}
      <div className="sidebar-header" style={{ padding: '20px 20px 16px' }}>
        <CyberSafetyLogo size={30} showSubtitle={true} href={homePath} />
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav" style={{ padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sections.map((section, sIdx) => (
          <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="sidebar-section-title">
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.path ||
                (item.path !== '/' && item.path !== '/dashboard' && item.path !== '/admin' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Profile Card at Bottom */}
      <div className="sidebar-footer" style={{ padding: '16px 18px', borderTop: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'var(--color-critical-bg)',
                color: 'var(--color-critical)',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid var(--color-critical-border)',
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, lineHeight: 1.25 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'Khan Salman'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: role === 'ADMIN' ? 'var(--color-critical-bg)' : role === 'EMPLOYEE' ? 'var(--color-info-bg)' : 'var(--bg-hover)',
                    color: role === 'ADMIN' ? 'var(--color-critical)' : role === 'EMPLOYEE' ? 'var(--color-info)' : 'var(--text-secondary)',
                    border: `1px solid ${
                      role === 'ADMIN' ? 'var(--color-critical-border)' : role === 'EMPLOYEE' ? 'var(--color-info-border)' : 'var(--border-primary)'
                    }`,
                    letterSpacing: '0.04em',
                  }}
                >
                  {role === 'ADMIN' ? 'ADMIN' : role === 'EMPLOYEE' ? 'EMPLOYEE' : 'PERSONAL'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function TopNavbar() {
  const { user, unreadNotifications, logout } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const role = user?.role === 'NORMAL_USER' ? 'USER' : user?.role || 'USER';

  const getBreadcrumbs = () => {
    const titles: Record<string, string> = {
      '/dashboard': 'Security Overview',
      '/admin': 'Security Administration',
      '/employee/dashboard': 'Employee Security Center',
      '/employee/my-security': 'Workstation Health',
      '/employee/phishing': 'Security Awareness Training',
      '/employee/alerts': 'Assigned Tasks',
      '/personal/dashboard': 'Cyber Safety Center',
      '/personal/url-check': 'URL Safety Checker',
      '/personal/fraud-call': 'Fraud Call Check',
      '/personal/otp-scam': 'OTP Scam Protection',
      '/personal/device-security': 'Device Security',
      '/academy': 'Cyber Safety Academy',
      '/reports': 'Security Reports',
      '/analytics': 'Threat Monitoring',
      '/vulnerabilities': 'Vulnerability Intelligence',
      '/scanner': 'Website Scanner',
      '/attack-surface': 'Attack Surface Management',
      '/personal/settings': 'Settings',
    };
    return titles[pathname] || 'Cyber Safety';
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CS';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="top-navbar">
      {/* Left: Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Cyber Safety</span>
        <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{getBreadcrumbs()}</span>
      </div>

      {/* Right: Search, Notifications, Role Badge, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            padding: '6px 12px',
            width: 240,
          }}
          className="hide-mobile"
        >
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search safety tools, threats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text-primary)',
              width: '100%',
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: '2px 5px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hover)',
              borderRadius: 4,
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Link
          href="/notifications"
          style={{
            position: 'relative',
            color: 'var(--text-secondary)',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Bell size={18} />
          {unreadNotifications > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 7,
                height: 7,
                backgroundColor: 'var(--color-critical)',
                borderRadius: '50%',
              }}
            />
          )}
        </Link>

        {/* Role Badge */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 9999,
            background: role === 'ADMIN' ? 'var(--color-critical-bg)' : role === 'EMPLOYEE' ? 'var(--color-info-bg)' : 'var(--bg-hover)',
            color: role === 'ADMIN' ? 'var(--color-critical)' : role === 'EMPLOYEE' ? 'var(--color-info)' : 'var(--text-secondary)',
            border: `1px solid ${
              role === 'ADMIN' ? 'var(--color-critical-border)' : role === 'EMPLOYEE' ? 'var(--color-info-border)' : 'var(--border-primary)'
            }`,
            letterSpacing: '0.04em',
          }}
        >
          {role === 'ADMIN' ? 'ADMIN' : role === 'EMPLOYEE' ? 'EMPLOYEE' : 'PERSONAL'}
        </span>

        {/* User Avatar with Profile Link */}
        <Link
          href="/personal/settings"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--cyberx-red)',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
          title={`${user?.name || 'Khan Salman'} (${role})`}
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAppStore();

  const userRole = user?.role === 'NORMAL_USER' ? 'USER' : user?.role || 'USER';
  const isAllowed = permissionService.canAccessRoute(userRole, pathname, user?.companyId);

  if (!isAllowed) {
    const fallbackPath =
      userRole === 'ADMIN' ? '/admin' : userRole === 'EMPLOYEE' ? '/employee/dashboard' : '/personal/dashboard';

    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 40,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundColor: 'var(--color-critical-bg)',
            color: 'var(--color-critical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 9999,
            background: 'var(--color-critical-bg)',
            color: 'var(--color-critical)',
            border: '1px solid var(--color-critical-border)',
            marginBottom: 12,
          }}
        >
          403 FORBIDDEN · ACCESS RESTRICTED
        </span>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Unauthorized Workspace Zone
        </h2>
        <p style={{ maxWidth: 460, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
          Your current account role (<strong>{userRole}</strong>) is not authorized to access this section.
          Please return to your assigned Cyber Safety workspace.
        </p>
        <Link
          href={fallbackPath}
          className="cyber-btn cyber-btn-primary"
          style={{ textDecoration: 'none' }}
        >
          Return to Your Workspace
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <TopNavbar />
        <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="page-content" style={{ height: '100%' }}>
            <RouteGuard>{children}</RouteGuard>
          </div>
        </main>
      </div>
    </div>
  );
}

export function LandingNavbar() {
  const { user } = useAppStore();
  const role = user?.role === 'NORMAL_USER' ? 'USER' : user?.role || 'USER';
  const homePath =
    role === 'ADMIN' ? '/admin' : role === 'EMPLOYEE' ? '/employee/dashboard' : '/personal/dashboard';

  return (
    <nav
      style={{
        height: 68,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}
    >
      <CyberSafetyLogo size={32} href="/" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ThemeToggle />
        {user ? (
          <Link href={homePath} className="cyber-btn cyber-btn-primary" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}>
            Open {role} Workspace
          </Link>
        ) : (
          <>
            <Link href="/login" className="cyber-btn cyber-btn-secondary" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}>
              Sign In
            </Link>
            <Link href="/signup" className="cyber-btn cyber-btn-primary" style={{ textDecoration: 'none', padding: '8px 18px', fontSize: 13 }}>
              Create Account
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
