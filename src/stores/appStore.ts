// @ts-nocheck
// ============================================================
// CYBERDOME — Global State Management (Zustand)
// Real Backend Authentication via FastAPI /api/v1/auth/*
// ============================================================
import { create } from 'zustand';
import { User, UserRole, NotificationPreferences, WebsiteAssessment, ActiveSimulationState } from '@/types';
import { authService } from '@/services';

export interface CompanyEntity {
  id: string;
  name: string;
  companyCode?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  domain?: string;
  industry?: string;
  createdAt?: string;
}

const TOKEN_KEY = 'cyberdome_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

interface AppState {
  // Auth State
  user: User | null;
  activeCompany: CompanyEntity | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Auth Actions — All delegate to real backend
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  companyLogin: (credentials: { companyCode: string; email: string; password: string }) => Promise<User>;
  signup: (data: { name: string; email: string; password: string; role?: 'USER' | 'EMPLOYEE' }) => Promise<User>;
  companySignup: (data: { companyName: string; domain: string; adminName: string; workEmail: string; password: string; accessCode?: string }) => Promise<{ company: CompanyEntity; admin: User }>;
  joinCompany: (data: { name: string; email: string; password: string; confirmPassword: string; companyCode: string }) => Promise<User>;
  logout: () => void;
  setUser: (user: User | null) => void;

  // Website Security Assessment Context
  websiteAssessmentTarget: string;
  setWebsiteAssessmentTarget: (target: string) => void;
  activeWebsiteAssessment: WebsiteAssessment | null;
  setActiveWebsiteAssessment: (assessment: WebsiteAssessment | null) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Notifications
  notificationPrefs: NotificationPreferences;
  setNotificationPrefs: (p: Partial<NotificationPreferences>) => void;
  unreadNotifications: number;

  // Digital Twin & What-If Live Simulation State
  activeSimulation: ActiveSimulationState | null;
  setActiveSimulation: (sim: ActiveSimulationState | null) => void;
  triggerWhatIfPropagation: (scenarioId: string, nodeIds: string[], projectedRisk: number, blastRadius: number) => void;
  resetWhatIfPropagation: () => void;

  // Presentation Mode Demo Session
  demoSessionId: string;
  resetDemoSession: () => void;
}

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')
  : 'http://localhost:8000/api/v1';

function formatAuthError(err: any, defaultMsg: string): Error {
  const msg = err?.message || defaultMsg;
  if (
    err?.name === 'TypeError' ||
    typeof msg === 'string' && (
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('network') ||
      msg.toLowerCase().includes('load failed')
    )
  ) {
    return new Error(
      'Cannot connect to the CYBERDOME API server. Please ensure the backend is running on http://localhost:8000.'
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  activeCompany: null,
  isAuthenticated: false,
  isLoading: false,

  // ── initAuth: Hydrate session from existing JWT via GET /auth/me ──
  initAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, activeCompany: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const profile = await authService.getProfile();
      const company: CompanyEntity | null = profile.companyId
        ? { id: profile.companyId, name: (profile as any).companyName || 'Organization', status: 'ACTIVE' }
        : null;
      set({ user: profile, activeCompany: company, isAuthenticated: true, isLoading: false });
    } catch {
      // Token expired or invalid — clear it
      clearStoredToken();
      set({ user: null, activeCompany: null, isAuthenticated: false, isLoading: false });
    }
  },

  // ── Unified Login: POST /api/v1/auth/login ──
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await authService.login({ email, password, rememberMe: true });
      const { user, token } = result;
      setStoredToken(token);

      // Fetch full profile (includes company details)
      let company: CompanyEntity | null = null;
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.company) {
            const c = json.data.company;
            company = {
              id: c.id,
              name: c.company_name,
              domain: c.domain,
              industry: c.industry,
              status: c.status,
              createdAt: c.created_at
            };
          }
          // Update user with full backend data
          if (json.data?.user) {
            const u = json.data.user;
            user.role = (json.data.role || u.role) as UserRole;
            user.companyId = u.company_id || undefined;
            user.accountType = u.account_type === 'COMPANY' ? 'COMPANY' : 'PERSONAL';
          }
        }
      } catch {
        // Profile fetch optional — we already have basic user from login
      }

      set({ user, activeCompany: company, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      set({ isLoading: false });
      throw formatAuthError(err, 'Login failed');
    }
  },

  // ── Company Login: Same endpoint, different flow ──
  companyLogin: async ({ companyCode, email, password }) => {
    // The backend /auth/login handles company membership detection automatically
    // companyCode is validated client-side for UX but real auth is email+password
    return get().login(email, password);
  },

  // ── Normal User Signup: POST /api/v1/auth/signup ──
  signup: async ({ name, email, password }) => {
    set({ isLoading: true });
    try {
      const result = await authService.signup({ name, email, password });
      const { user, token } = result;
      setStoredToken(token);

      set({ user, activeCompany: null, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      set({ isLoading: false });
      throw formatAuthError(err, 'Signup failed');
    }
  },

  // ── Company Signup: POST /api/v1/auth/company-signup ──
  companySignup: async ({ companyName, domain, adminName, workEmail, phone, password, accessCode }) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_BASE}/auth/company-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          domain,
          admin_name: adminName,
          work_email: workEmail,
          phone: phone || undefined,
          password,
          confirm_password: password,
          access_code: accessCode || undefined
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        let msg = errJson?.error?.message || errJson?.message;
        if (!msg && Array.isArray(errJson?.detail)) {
          msg = errJson.detail.map((d: any) => d.msg || `${d.loc?.slice(1)?.join('.')}: invalid`).join('. ');
        } else if (!msg && typeof errJson?.detail === 'string') {
          msg = errJson.detail;
        } else if (!msg && errJson?.detail?.message) {
          msg = errJson.detail.message;
        }
        throw new Error(msg || 'Company signup failed. Please verify the entered information.');
      }

      const json = await res.json();
      if (!json.success || !json.data) throw new Error('Company signup failed');

      const { user: u, company: c, token, role } = json.data;
      setStoredToken(token);

      const admin: User = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || undefined,
        role: role as UserRole,
        accountType: 'COMPANY',
        companyId: c.id,
        emailVerified: u.email_verified,
        mfaEnabled: u.mfa_enabled,
        createdAt: u.created_at,
      };

      const company: CompanyEntity = {
        id: c.id,
        name: c.company_name,
        domain: c.domain,
        industry: c.industry,
        status: c.status,
        createdAt: c.created_at
      };

      set({ user: admin, activeCompany: company, isAuthenticated: true, isLoading: false });
      return { company, admin };
    } catch (err: any) {
      set({ isLoading: false });
      throw formatAuthError(err, 'Company signup failed');
    }
  },

  // ── Join Company: POST /api/v1/auth/join-company ──
  joinCompany: async ({ name, email, password, confirmPassword, companyCode }) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_BASE}/auth/join-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          confirm_password: confirmPassword,
          company_code: companyCode
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        let msg = errJson?.error?.message || errJson?.message;
        if (!msg && Array.isArray(errJson?.detail)) {
          msg = errJson.detail.map((d: any) => d.msg || `${d.loc?.slice(1)?.join('.')}: invalid`).join('. ');
        } else if (!msg && typeof errJson?.detail === 'string') {
          msg = errJson.detail;
        } else if (!msg && errJson?.detail?.message) {
          msg = errJson.detail.message;
        }
        throw new Error(msg || 'Failed to join company. Please verify your passcode.');
      }

      const json = await res.json();
      if (!json.success || !json.data) throw new Error('Join company failed');

      const { user: u, token, role } = json.data;
      setStoredToken(token);

      const employee: User = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || undefined,
        role: role as UserRole,
        accountType: 'COMPANY',
        companyId: u.company_id,
        emailVerified: u.email_verified,
        mfaEnabled: u.mfa_enabled,
        createdAt: u.created_at,
      };

      set({ user: employee, activeCompany: null, isAuthenticated: true, isLoading: false }); 
      return employee;
    } catch (err: any) {
      set({ isLoading: false });
      throw formatAuthError(err, 'Failed to join company');
    }
  },

  // ── Logout: POST /api/v1/auth/logout + clear token ──
  logout: () => {
    authService.logout().catch(() => {});
    clearStoredToken();
    set({ user: null, activeCompany: null, isAuthenticated: false });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  // Website Assessment State
  websiteAssessmentTarget: 'https://example.com',
  setWebsiteAssessmentTarget: (target) => set({ websiteAssessmentTarget: target }),
  activeWebsiteAssessment: null,
  setActiveWebsiteAssessment: (assessment) => set({ activeWebsiteAssessment: assessment }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  // Notifications
  notificationPrefs: {},
  setNotificationPrefs: (p) => set((s) => ({ notificationPrefs: { ...s.notificationPrefs, ...p } })),
  unreadNotifications: 0,

  // Digital Twin & What-If Live Simulation State
  activeSimulation: null,
  setActiveSimulation: (sim) => set({ activeSimulation: sim }),
  triggerWhatIfPropagation: (scenarioId, nodeIds, projectedRisk, blastRadius) => {
    set({
      activeSimulation: {
        simulationId: 'sim-' + Date.now(),
        scenarioId,
        scenarioName: scenarioId.replace(/-/g, ' ').toUpperCase(),
        targetAsset: nodeIds[0] || 'srv-web-01',
        status: 'SIMULATING',
        currentStep: 2,
        compromisedNodeIds: nodeIds,
        affectedNodeIds: nodeIds,
        activeAttackPathIds: ['edge-1', 'edge-2'],
        initialRisk: 62,
        currentRisk: projectedRisk,
        projectedRisk,
        blastRadius,
        compromisedCredentials: ['svc_web_daemon', 'admin_db_read'],
        exposedDatabases: ['db-primary-customer-records'],
        timestamp: new Date().toISOString()
      }
    });
  },
  resetWhatIfPropagation: () => set({ activeSimulation: null }),

  // Presentation Mode Demo Session
  demoSessionId: 'demo-session-' + Date.now(),
  resetDemoSession: () => set({ demoSessionId: 'demo-session-' + Date.now(), activeSimulation: null })
}));
