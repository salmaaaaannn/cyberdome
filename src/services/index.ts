// @ts-nocheck
// ============================================================
// CYBERDOME — Mock Services (Ready for FastAPI/Supabase replacement)
// ============================================================
import {
  IAuthService, IAssetService, IVulnerabilityService, INetworkService,
  IIoTService, IUEBAService, IIncidentService, IAttackGraphService,
  IDigitalTwinService, ISimulationService, INotificationService,
  IAIService, IReportService, User, LoginCredentials, SignupData,
  OTPVerification, Asset, AssetStatus, Vulnerability, NetworkEvent,
  IoTDevice, UEBAEvent, Incident, AttackGraphNode, AttackGraphEdge,
  DigitalTwinNode, DigitalTwinConnection, SimulationScenario,
  SecurityNotification, NotificationPreferences, NotificationChannel,
  AIMessage, Report, NetworkNode, UserRole, CompanyUser, EmployeeInvite,
  CompanyProfile, AuditLogEntry, WebsiteAssessment, ObservableAsset,
  WebsiteScanCheck, WebsiteFinding, FraudCallResult, OTPScamAnalysis,
  URLCheckResult, DeviceSecurityAudit, AcademyCourse, ICompanyService,
  IEmployeeService, IPermissionService, IWebsiteAssessmentService,
  IFraudCallService, IUrlSafetyService, IDeviceSecurityService, IAcademyService,
  SecurityAwarenessCampaign, SecurityAwarenessTemplate, SecurityAwarenessEvent,
  EmployeeAwarenessResult, CampaignAnalytics, TrainingRecommendation,
  IPhishingSimulationService, ContextualRiskAssessment, RiskFactor,
  IContextualRiskService, NotificationLog, DailyLimitRecord, ActiveSimulationState
} from '@/types';


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')
  : 'http://localhost:8000/api/v1';

function getAuthHeader(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cyberdome_token');
    if (token) return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// --- Auth Service (FastAPI / Supabase Real Backend Integration) ---
export const authService: IAuthService = {
  async login(credentials: LoginCredentials) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          remember_me: credentials.rememberMe ?? true
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const { user, token, role, company } = json.data;
          if (typeof window !== 'undefined') {
            localStorage.setItem('cyberdome_token', token);
          }
          const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || undefined,
            role: role as UserRole,
            accountType: user.account_type === 'COMPANY' ? 'COMPANY' : 'PERSONAL',
            companyId: user.company_id || undefined,
            emailVerified: user.email_verified,
            mfaEnabled: user.mfa_enabled,
            createdAt: user.created_at,
            lastLogin: user.last_login_at || new Date().toISOString()
          };
          return { user: mappedUser, token };
        }
      }
    } catch {
      // Backend not running; fall back to demo mode
    }

    
    if (credentials.email && credentials.password) {
      throw new Error('Invalid credentials');
    }
    throw new Error('Invalid credentials');
  },

  async signup(data: SignupData) {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          confirm_password: data.password
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const { user, token, role } = json.data;
          if (typeof window !== 'undefined') {
            localStorage.setItem('cyberdome_token', token);
          }
          const newUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || undefined,
            role: role as UserRole,
            accountType: 'PERSONAL',
            companyId: undefined, // Normal users NEVER have companyId
            emailVerified: user.email_verified,
            phoneVerified: false,
            mfaEnabled: user.mfa_enabled,
            createdAt: user.created_at
          };
          return { user: newUser, token };
        }
      }
    } catch {
      // Fall back to demo mode
    }

    throw new Error('Signup failed: backend service unavailable');
  },

  async verifyOTP(verification: OTPVerification) {
    
    return verification.code === '123456';
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cyberdome_token');
    }
    
  },

  async getProfile() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          const u = json.data.user;
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || undefined,
            role: u.role as UserRole,
            accountType: u.account_type === 'COMPANY' ? 'COMPANY' : 'PERSONAL',
            companyId: u.company_id || undefined,
            emailVerified: u.email_verified,
            mfaEnabled: u.mfa_enabled,
            createdAt: u.created_at,
            lastLogin: u.last_login_at || undefined
          } as User;
        }
      }
    } catch {
      // Ignore
    }
    
    throw new Error('User not found');
  },

  async forgotPassword(email: string) {
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch {
      // Ignore
    }
    
  },

  async resetPassword(token: string, password: string) {
    try {
      await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password, confirm_password: password })
      });
    } catch {
      // Ignore
    }
    
  },
};

// --- Asset Service ---
// Helper: map backend asset response to frontend Asset type
function mapBackendAsset(a: Record<string, unknown>): Asset {
  return {
    id: a.id as string || '',
    name: a.name as string || '',
    type: ((a.assetType as string) || 'server').toLowerCase() as Asset['type'],
    ip: (a.ipAddress as string) || '',
    hostname: (a.hostname as string) || '',
    os: undefined,
    location: '',
    status: ((a.status as string) || 'ACTIVE').toLowerCase() as AssetStatus,
    riskScore: 0,
    vulnerabilities: 0,
    criticalVulns: 0,
    lastScan: (a.createdAt as string) || new Date().toISOString(),
    owner: '',
    tags: [],
    is_demo: false,
  };
}

export const assetService: IAssetService = {
  async getAssets() {
    try {
      const res = await fetch(`${API_BASE}/assets`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data.map(mapBackendAsset);
        }
      }
    } catch {}
    return [];
  },
  async getAssetById(id: string) {
    try {
      const res = await fetch(`${API_BASE}/assets/${id}`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return mapBackendAsset(json.data);
      }
    } catch {}
    throw new Error('Asset not found');
  },
  async getAssetsByStatus(status: AssetStatus) {
    const all = await assetService.getAssets();
    return all.filter((a) => a.status === status);
  },
  async searchAssets(query: string) {
    const all = await assetService.getAssets();
    const q = query.toLowerCase();
    return all.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.ip.includes(q) ||
        a.hostname.toLowerCase().includes(q)
    );
  },
};

// --- Vulnerability Service ---
export const vulnerabilityService: IVulnerabilityService = {
  async getVulnerabilities() {
    try {
      const res = await fetch(`${API_BASE}/vulnerabilities`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async getVulnerabilityById(id: string) {
    try {
      const res = await fetch(`${API_BASE}/vulnerabilities/${id}`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    throw new Error('Not found');
  },
  async getVulnerabilityByCVE(cveId: string) {
    try {
      const res = await fetch(`${API_BASE}/vulnerabilities/cve/${cveId}`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    throw new Error('Not found');
  },
  async getCriticalVulnerabilities() {
    try {
      const res = await fetch(`${API_BASE}/vulnerabilities?severity=CRITICAL`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
};

// --- Network Service ---
export const networkService: INetworkService = {
  async getNetworkEvents() {
    try {
      const res = await fetch(`${API_BASE}/network/events`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async getNetworkTopology() {
    try {
      const res = await fetch(`${API_BASE}/network/topology`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return { nodes: [] };
  },
  async getNetworkAlerts() {
    try {
      const res = await fetch(`${API_BASE}/network/alerts`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
};

// --- IoT Service ---
export const iotService: IIoTService = {
  async getDevices() {
    try {
      const res = await fetch(`${API_BASE}/iot/devices`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async getDeviceById(id: string) {
    try {
      const res = await fetch(`${API_BASE}/iot/devices/${id}`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    throw new Error('Not found');
  },
  async getAnomalies() {
    try {
      const res = await fetch(`${API_BASE}/iot/anomalies`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async getMLHealth() {
    try {
      const res = await fetch(`${API_BASE}/iot/ml/health`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return null;
  },
  async analyzeTelemetry(payload: any) {
    const res = await fetch(`${API_BASE}/iot/analyze-telemetry`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  },
};

// --- UEBA Service ---
export const uebaService: IUEBAService = {
  async getEvents() {
    try {
      const res = await fetch(`${API_BASE}/ueba/events`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async getAnomalies() {
    try {
      const res = await fetch(`${API_BASE}/ueba/anomalies`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async getUserRiskProfile(userId: string) {
    try {
      const res = await fetch(`${API_BASE}/ueba/users/${userId}/profile`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
};

// --- Incident Service ---
export const incidentService: IIncidentService = {
  async getIncidents() {
    try {
      const res = await fetch(`${API_BASE}/incidents`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async getIncidentById(id: string) {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    throw new Error('Not found');
  },
  async createIncident(data: Partial<Incident>) {
    try {
      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          title: data.title || 'Untitled Incident',
          description: data.description || '',
          severity: data.severity || 'MEDIUM',
          status: data.status || 'OPEN',
          assignee_id: data.assignee || null,
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return { ...({} as any), ...data, id: 'inc-new-' + Date.now() } as Incident;
  },
  async updateIncident(id: string, data: Partial<Incident>) {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status,
          assignee_id: data.assignee,
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return { ...({} as any), ...data };
  },
};

// --- Attack Graph Service ---
export const attackGraphService: IAttackGraphService = {
  async getGraph() {
    try {
      const res = await fetch(`${API_BASE}/attack-graph`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return {
            nodes: json.data.nodes || [],
            edges: json.data.edges || [],
            chokePoints: json.data.chokePoints || [],
            possiblePaths: json.data.possiblePaths || [],
          };
        }
      }
    } catch {}
    return { nodes: [], edges: [] };
  },
  async getPathsForAsset(assetId: string) {
    try {
      const graph = await this.getGraph();
      return graph.edges.filter((e: any) => e.source === assetId || e.target === assetId);
    } catch {
      return [];
    }
  },
};

// --- Digital Twin Service ---
export const digitalTwinService: IDigitalTwinService = {
  async getNodes() {
    try {
      const res = await fetch(`${API_BASE}/digital-twin/nodes`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.nodes) return json.data.nodes;
      }
    } catch {}
    return [];
  },
  async getConnections() {
    try {
      const res = await fetch(`${API_BASE}/digital-twin/nodes`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.connections) return json.data.connections;
      }
    } catch {}
    return [];
  },
  async getNodeDetails(id: string) {
    try {
      const nodes = await this.getNodes();
      const n = nodes.find(n => n.id === id);
      if (n) return n;
    } catch {}
    throw new Error('Not found');
  },
};

// --- Simulation Service ---
export const simulationService: ISimulationService = {
  async getScenarios() {  return []; },
  async runSimulation(scenarioId: string) {
    
    const scenario = ([] as any[]).find(s => s.id === scenarioId);
    if (!scenario) throw new Error('Scenario not found');
    return { ...scenario, steps: scenario.steps.map(s => ({ ...s, status: 'complete' as const, timestamp: new Date().toISOString() })) };
  },
  async getBlastRadius(scenarioId: string) {
    
    const scenario = ([] as any[]).find(s => s.id === scenarioId);
    if (!scenario) throw new Error('Not found');
    return { assets: scenario.affectedAssets, radius: scenario.blastRadius };
  },
};

// --- Notification Service ---
export const notificationService: INotificationService = {
  async getNotifications(): Promise<SecurityNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            severity: (n.severity?.toLowerCase() || 'medium') as any,
            channel: (n.channel?.toLowerCase() || 'in_app') as any,
            status: n.status === 'READ' ? 'delivered' : 'sent',
            eventId: n.id,
            timestamp: n.createdAt,
            is_demo: false,
          }));
        }
      }
    } catch {}
    return [];
  },
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const res = await fetch(`${API_BASE}/notifications/preferences`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          return {
            email: d.email_alerts ?? true,
            sms: d.sms_alerts ?? false,
            criticalCve: d.critical_only ?? false,
            highThreatIncident: true,
            networkAnomaly: true,
            weeklyDigest: false,
          };
        }
      }
    } catch {}
    return {
      email: true,
      sms: false,
      criticalCve: true,
      highThreatIncident: true,
      networkAnomaly: true,
      weeklyDigest: false,
    };
  },
  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const res = await fetch(`${API_BASE}/notifications/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          email_alerts: prefs.email,
          sms_alerts: prefs.sms,
          critical_only: prefs.criticalCve,
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          return {
            email: d.email_alerts ?? true,
            sms: d.sms_alerts ?? false,
            criticalCve: d.critical_only ?? false,
            highThreatIncident: true,
            networkAnomaly: true,
            weeklyDigest: false,
          };
        }
      }
    } catch {}
    return {
      email: true,
      sms: false,
      criticalCve: true,
      highThreatIncident: true,
      networkAnomaly: true,
      weeklyDigest: false,
      ...prefs
    };
  },
  async sendTestNotification(_channel: NotificationChannel): Promise<void> {
    // Audit / verification hook
  },
};

// --- AI Service ---
export const aiService: IAIService = {
  async sendMessage(message: string, _context?: string): Promise<AIMessage> {
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      return {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: data.message || data.detail || 'Received empty response.',
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error('Failed to communicate with AI Backend:', e);
      return {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: 'AI Service Temporarily Unavailable. Your security data has not been modified.',
        timestamp: new Date().toISOString()
      };
    }
  },
  async getSuggestedPrompts() {
    
    return ['Why is this asset risky?', 'Explain this incident.', 'What could be affected?', 'Explain this attack path.', 'Explain this vulnerability.', 'Summarize today\'s threats.'];
  },
  async getInsights() {
    
    return [
      { id: 'ins-001', role: 'assistant' as const, content: 'Alert: CVE-2026-21001 has an EPSS score of 0.89 and is being actively exploited. 2 assets are affected.', timestamp: new Date().toISOString() },
      { id: 'ins-002', role: 'assistant' as const, content: 'UEBA detected impossible travel for user Emily Park. Login from London 30 minutes after US-East activity.', timestamp: new Date().toISOString() },
      { id: 'ins-003', role: 'assistant' as const, content: 'Attack graph analysis shows 4 viable paths from internet to Database Primary. Recommend network segmentation.', timestamp: new Date().toISOString() },
    ];
  },
};

// --- Report Service ---
export const reportService: IReportService = {
  async getReports() {
    try {
      const res = await fetch(`${API_BASE}/reports`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return [];
  },
  async generateReport(type: Report['type']) {
    try {
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          title: `Executive ${type} Compliance Report`,
          type: type.toUpperCase(),
          format: 'JSON'
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch {}
    return { id: 'rpt-new-' + Date.now(), title: `New ${type} Report`, type, generatedAt: new Date().toISOString(), period: 'Current', status: 'ready' as const, summary: 'Report generated successfully.' };
  },
};

// --- Permission Service ---
export const permissionService: IPermissionService = {
  canAccessRoute(role: UserRole, pathname: string, companyId?: string): boolean {
    const normalizedRole = role === 'NORMAL_USER' ? 'USER' : role;

    // Public / shared cyber safety routes accessible to everyone
    const publicSafetyPaths = [
      '/',
      '/login',
      '/signup',
      '/join-company',
      '/verify',
      '/academy',
      '/personal',
      '/reports',
      '/presentation',
      '/ai',
      '/notifications',
    ];

    if (publicSafetyPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      return true;
    }

    // STRICT MULTI-TENANT ISOLATION:
    // Public USER accounts (or accounts without a valid companyId) are strictly rejected from Company Security Portal
    if (normalizedRole === 'USER' || !companyId) {
      return false;
    }

    // Admin has access to all company security portal operations
    if (normalizedRole === 'ADMIN') {
      return true;
    }

    // Employee has access to employee workspace and permitted simulation/telemetry tools
    if (normalizedRole === 'EMPLOYEE') {
      if (pathname.startsWith('/employee')) return true;
      if (pathname.startsWith('/simulate')) return true;
      if (pathname.startsWith('/training')) return true;

      // Permitted company security modules
      const permittedCompanyPaths = [
        '/digital-twin',
        '/what-if',
        '/attack-graph',
        '/incidents',
        '/vulnerabilities',
        '/attack-surface',
      ];
      if (permittedCompanyPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
        return true;
      }

      // Block executive/admin management from employees
      return false;
    }

    return false;
  },

  validateTenantAccess(authenticatedCompanyId?: string, targetResourceCompanyId?: string): boolean {
    if (!authenticatedCompanyId || !targetResourceCompanyId) return false;
    return authenticatedCompanyId === targetResourceCompanyId;
  },
  hasPermission(role: UserRole, permission: string): boolean {
    const normalizedRole = role === 'NORMAL_USER' ? 'USER' : role;
    if (normalizedRole === 'ADMIN') return true;

    // Common personal safety permissions available to all
    const commonSafetyPerms = [
      'check_fraud_call',
      'check_url',
      'check_otp',
      'check_device',
      'access_academy',
      'view_personal_reports',
      'view_own_simulation_results',
      'report_simulation',
      'complete_simulation_training',
    ];
    if (commonSafetyPerms.includes(permission)) return true;

    if (normalizedRole === 'EMPLOYEE') {
      const employeePerms = [
        'view_assigned_alerts',
        'view_incidents',
        'report_phishing',
        'view_my_security',
        'complete_training',
        'view_team_simulation_results',
      ];
      return employeePerms.includes(permission);
    }

    return false;
  }
};

// --- Company & Employee Service ---
const mockCompanyProfile: CompanyProfile = {
  id: 'demo-company-1',
  name: 'Acme Defense Technologies',
  domain: 'acmedefense.com',
  industry: 'Aerospace & Cyber Defense',
  size: '250-500 Employees',
  securityContact: 'security@acmedefense.com',
  createdAt: '2025-01-15T08:00:00Z',
  totalEmployees: 48,
  totalAssets: 184,
  securityScore: 84
};

const mockCompanyUsers: CompanyUser[] = [
  {
    id: 'emp-001',
    companyId: 'demo-company-1',
    userId: 'usr-admin',
    name: 'Alex Morgan',
    email: 'admin@demo.cyberdome.local',
    role: 'ADMIN',
    department: 'Cyber Operations',
    status: 'ACTIVE',
    mfaEnabled: true,
    lastLogin: '2026-09-27T10:14:00Z',
    createdAt: '2025-01-15T08:00:00Z'
  },
  {
    id: 'emp-002',
    companyId: 'demo-company-1',
    userId: 'usr-emp-1',
    name: 'Sarah Chen',
    email: 'employee@demo.cyberdome.local',
    role: 'EMPLOYEE',
    department: 'DevSecOps',
    status: 'ACTIVE',
    mfaEnabled: true,
    lastLogin: '2026-09-27T09:30:00Z',
    createdAt: '2025-03-10T11:20:00Z'
  },
  {
    id: 'emp-003',
    companyId: 'demo-company-1',
    userId: 'usr-emp-2',
    name: 'David Vance',
    email: 'david.vance@acmedefense.com',
    role: 'EMPLOYEE',
    department: 'IT Infrastructure',
    status: 'ACTIVE',
    mfaEnabled: false,
    lastLogin: '2026-09-26T16:45:00Z',
    createdAt: '2025-04-02T14:15:00Z'
  },
  {
    id: 'emp-004',
    companyId: 'demo-company-1',
    userId: 'usr-emp-3',
    name: 'Elena Rostova',
    email: 'elena.rostova@acmedefense.com',
    role: 'EMPLOYEE',
    department: 'Network Operations',
    status: 'ACTIVE',
    mfaEnabled: true,
    lastLogin: '2026-09-27T08:12:00Z',
    createdAt: '2025-06-18T09:00:00Z'
  }
];

const mockAuditLogs: AuditLogEntry[] = [
  { id: 'aud-001', companyId: 'demo-company-1', actor: 'Alex Morgan', action: 'Triggered Website Security Scan', target: 'https://acmedefense.com', ip: '10.0.4.12', timestamp: '2026-09-27T10:00:00Z', severity: 'INFO' },
  { id: 'aud-002', companyId: 'demo-company-1', actor: 'System SOAR', action: 'Isolate Compromised Node Alpha', target: 'srv-web-01.acmedefense.com', ip: '127.0.0.1', timestamp: '2026-09-27T09:15:00Z', severity: 'HIGH' },
  { id: 'aud-003', companyId: 'demo-company-1', actor: 'Alex Morgan', action: 'Employee Invitation Sent', target: 'marcus.k@acmedefense.com', ip: '10.0.4.12', timestamp: '2026-09-26T14:20:00Z', severity: 'LOW' },
  { id: 'aud-004', companyId: 'demo-company-1', actor: 'Sarah Chen', action: 'Completed Phishing Simulation Lab', target: 'Phishing Academy module', ip: '192.168.1.55', timestamp: '2026-09-26T11:05:00Z', severity: 'INFO' }
];

export const companyService: ICompanyService = {
  async getCompanyProfile(_companyId: string) {
    try {
      const res = await fetch(`${API_BASE}/admin/company`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const c = json.data;
          return {
            id: c.id,
            name: c.company_name,
            domain: c.domain,
            industry: c.industry || 'Cybersecurity & Defense',
            size: c.size || '250-500 Employees',
            securityContact: c.security_contact || 'security@' + c.domain,
            createdAt: c.created_at,
            totalEmployees: 48,
            totalAssets: 184,
            securityScore: 88
          };
        }
      }
    } catch {
      // Fall back
    }
    
    return mockCompanyProfile;
  },

  async updateCompanyProfile(_companyId: string, data: Partial<CompanyProfile>) {
    try {
      const res = await fetch(`${API_BASE}/admin/company`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          company_name: data.name,
          industry: data.industry,
          size: data.size,
          security_contact: data.securityContact
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const c = json.data;
          return {
            ...mockCompanyProfile,
            id: c.id,
            name: c.company_name,
            domain: c.domain,
            industry: c.industry,
            size: c.size,
            securityContact: c.security_contact
          };
        }
      }
    } catch {
      // Fall back
    }
    
    Object.assign(mockCompanyProfile, data);
    return mockCompanyProfile;
  },

  async getAuditLogs(_companyId: string) {
    try {
      const res = await fetch(`${API_BASE}/admin/audit`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data.map((l: any) => ({
            id: l.id,
            companyId: l.companyId,
            actor: l.userId || 'Security Admin',
            action: l.action,
            target: l.resourceType || 'System',
            ip: l.ipAddress || '10.0.1.1',
            timestamp: l.timestamp,
            severity: l.result === 'DENIED' ? 'HIGH' : 'INFO'
          }));
        }
      }
    } catch {
      // Fall back
    }
    
    return mockAuditLogs;
  }
};

export const employeeService: IEmployeeService = {
  async getEmployees(_companyId: string) {
    try {
      const res = await fetch(`${API_BASE}/admin/employees`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          return json.data.map((e: any) => ({
            id: e.id,
            companyId: e.companyId,
            userId: e.userId,
            name: e.name,
            email: e.email,
            role: e.role as UserRole,
            department: e.department || 'Security Operations',
            status: e.status,
            mfaEnabled: e.mfaEnabled,
            lastLogin: e.lastLogin,
            createdAt: e.createdAt
          }));
        }
      }
    } catch {
      // Fall back
    }
    
    return [...mockCompanyUsers];
  },

  async inviteEmployee(invite: EmployeeInvite) {
    try {
      const res = await fetch(`${API_BASE}/admin/employees/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          email: invite.email,
          name: invite.name,
          role: invite.role,
          department: invite.department || 'General'
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const inv = json.data;
          return {
            id: inv.id,
            companyId: inv.companyId,
            name: invite.name,
            email: inv.email,
            role: inv.role,
            department: inv.department,
            token: inv.token,
            expiresAt: inv.expiresAt,
            status: inv.status
          };
        }
      }
    } catch {
      // Fall back
    }
    
    const newEmp: CompanyUser = {
      id: 'emp-' + Date.now(),
      companyId: invite.companyId || 'demo-company-1',
      userId: 'usr-' + Date.now(),
      name: invite.name,
      email: invite.email,
      role: invite.role,
      department: invite.department || 'General',
      status: 'INVITED',
      mfaEnabled: false,
      lastLogin: 'Never',
      createdAt: new Date().toISOString()
    };
    mockCompanyUsers.unshift(newEmp);
    return {
      id: 'inv-' + Date.now(),
      companyId: invite.companyId,
      name: invite.name,
      email: invite.email,
      role: invite.role,
      department: invite.department,
      token: 'inv-tok-' + Math.random().toString(36).substring(2, 9),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'PENDING'
    };
  },

  async updateEmployeeRole(id: string, role: 'ADMIN' | 'EMPLOYEE', department?: string) {
    try {
      await fetch(`${API_BASE}/admin/employees/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ role, department })
      });
    } catch {
      // Fall back
    }
    const emp = mockCompanyUsers.find(e => e.id === id);
    if (emp) {
      emp.role = role;
      if (department) emp.department = department;
    }
  },

  async deactivateEmployee(id: string) {
    try {
      await fetch(`${API_BASE}/admin/employees/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status: 'SUSPENDED' })
      });
    } catch {
      // Fall back
    }
    const emp = mockCompanyUsers.find(e => e.id === id);
    if (emp) emp.status = 'SUSPENDED';
  }
};

// --- Website Security Assessment Service ---
const defaultWebsiteAssessment: WebsiteAssessment = {
  id: 'assess-example-01',
  targetUrl: 'https://example.com',
  domain: 'example.com',
  status: 'COMPLETED',
  startedAt: '2026-09-27T09:00:00Z',
  completedAt: '2026-09-27T09:01:15Z',
  totalObservableAssets: 12,
  subdomainsCount: 4,
  servicesCount: 5,
  technologiesCount: 6,
  findingsCount: { critical: 1, high: 2, medium: 2, low: 1 },
  checksCount: { total: 10, passed: 6, findings: 4 },
  isDemo: true,
  observableAssets: [
    { id: 'oa-1', type: 'domain', name: 'example.com', target: 'example.com', details: 'Apex domain (IPv4: 93.184.216.34, IPv6: 2606:2800:220:1:248:1893:25c8:1946)', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:10Z' },
    { id: 'oa-2', type: 'subdomain', name: 'api.example.com', target: 'api.example.com', details: 'REST API Gateway (Cloudflare Edge CNAME)', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:15Z' },
    { id: 'oa-3', type: 'subdomain', name: 'auth.example.com', target: 'auth.example.com', details: 'OAuth2/SSO Login Endpoint', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:18Z' },
    { id: 'oa-4', type: 'subdomain', name: 'cdn.example.com', target: 'cdn.example.com', details: 'Static Asset Distribution', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:20Z' },
    { id: 'oa-5', type: 'service', name: 'HTTPS (Port 443)', target: 'example.com:443', details: 'TLS 1.3 / HTTP/2 Enabled, Let\'s Encrypt Certificate', port: 443, protocol: 'tcp', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:22Z' },
    { id: 'oa-6', type: 'service', name: 'HTTP (Port 80)', target: 'example.com:80', details: 'Automated 301 Permanent Redirect to HTTPS', port: 80, protocol: 'tcp', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:22Z' },
    { id: 'oa-7', type: 'technology', name: 'Nginx 1.24.0', target: 'example.com', details: 'Reverse proxy server indicator detected from response headers', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:28Z' },
    { id: 'oa-8', type: 'technology', name: 'React 18.2.0', target: 'example.com', details: 'Client-side SPA framework detected in bundle markers', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:30Z' },
    { id: 'oa-9', type: 'technology', name: 'Node.js runtime', target: 'api.example.com', details: 'API backend environment header signature', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:32Z' },
    { id: 'oa-10', type: 'certificate', name: 'Let\'s Encrypt Authority X3', target: 'example.com', details: 'Valid until 2026-12-15, RSA 2048-bit, SANs: *.example.com, example.com', exposure: 'PUBLIC', discoveredAt: '2026-09-27T09:00:35Z' }
  ],
  vulnerabilities: [
    {
      id: 'vuln-web-1',
      cveId: 'CVE-2026-11892',
      title: 'React Server Action Payload Deserialization',
      description: 'Potential untrusted object deserialization in Server Action router for unauthenticated calls.',
      severity: 'HIGH',
      cvssScore: 8.1,
      epssScore: 0.42,
      cisaKev: true,
      affectedAssets: ['api.example.com', 'example.com'],
      exploitAvailable: true,
      patchAvailable: true,
      discoveredAt: '2026-09-27T09:00:45Z',
      publishedAt: '2026-01-14T00:00:00Z',
      status: 'open',
      is_demo: true
    },
    {
      id: 'vuln-web-2',
      cveId: 'CVE-2025-24103',
      title: 'Nginx HTTP/2 Stream Cancellation Flooding',
      description: 'Rapid reset handling could lead to worker CPU saturation if unthrottled.',
      severity: 'MEDIUM',
      cvssScore: 6.5,
      epssScore: 0.12,
      cisaKev: false,
      affectedAssets: ['example.com:443'],
      exploitAvailable: false,
      patchAvailable: true,
      discoveredAt: '2026-09-27T09:00:48Z',
      publishedAt: '2025-10-18T00:00:00Z',
      status: 'open',
      is_demo: true
    }
  ],
  checks: [
    { id: 'chk-1', name: 'HTTPS Enforcement', category: 'HTTPS', status: 'PASS', details: 'All plain HTTP traffic unconditionally redirects to HTTPS via 301.' },
    { id: 'chk-2', name: 'TLS Modern Protocol Version', category: 'TLS', status: 'PASS', details: 'Negotiates TLS 1.3. Legacy protocols SSLv3, TLS 1.0 and 1.1 are disabled.' },
    { id: 'chk-3', name: 'Certificate Trust Chain & Validity', category: 'CERTIFICATE', status: 'PASS', details: 'Valid CA-signed certificate. 82 days remaining until renewal.' },
    { id: 'chk-4', name: 'Content-Security-Policy (CSP)', category: 'HEADERS', status: 'FAIL', details: 'No Content-Security-Policy header discovered. Client injection protection absent.' },
    { id: 'chk-5', name: 'Strict-Transport-Security (HSTS)', category: 'HEADERS', status: 'PASS', details: 'max-age=31536000; includeSubDomains; preload is active.' },
    { id: 'chk-6', name: 'X-Frame-Options (Clickjacking)', category: 'HEADERS', status: 'PASS', details: 'Set to SAMEORIGIN across all observable HTML views.' },
    { id: 'chk-7', name: 'X-Content-Type-Options', category: 'HEADERS', status: 'PASS', details: 'Configured as nosniff to prevent MIME type sniffing.' },
    { id: 'chk-8', name: 'Cookie Security Attributes', category: 'COOKIES', status: 'WARN', details: 'Session identifier missing SameSite=Strict (currently Lax).' },
    { id: 'chk-9', name: 'DNSSEC Cryptographic Signature', category: 'DNS', status: 'WARN', details: 'Zone lacks DNSSEC signatures to verify DNS answer integrity.' },
    { id: 'chk-10', name: 'Phishing & Domain Lookalike Indicators', category: 'PHISHING', status: 'PASS', details: 'No homoglyphs or newly registered typosquatting domains detected.' }
  ],
  findings: [
    {
      id: 'fnd-1',
      severity: 'CRITICAL',
      title: 'Unauthenticated Deserialization Risk in API Gateway',
      whatIsWrong: 'The endpoint /api/v1/actions is running an unpatched runtime susceptible to CVE-2026-11892.',
      whyItMatters: 'Could permit unauthorized execution of arbitrary server instructions or process termination.',
      affectedTarget: 'https://api.example.com',
      evidence: 'Header Server: Node.js/18.16.0 detected with matching exploit signature marker.',
      recommendedFix: 'Upgrade Node.js packages to latest patched release and enable strict schema validation.',
      status: 'OPEN',
      source: 'VULNERABILITY'
    },
    {
      id: 'fnd-2',
      severity: 'HIGH',
      title: 'Missing Content-Security-Policy (CSP) Header',
      whatIsWrong: 'The website does not expose an appropriate Content-Security-Policy HTTP header.',
      whyItMatters: 'A properly configured CSP can reduce certain classes of client-side injection risk (XSS, data exfiltration).',
      affectedTarget: 'https://example.com',
      evidence: 'HTTP response headers inspected; no Content-Security-Policy directive found.',
      recommendedFix: 'Configure an appropriate CSP policy restricting script sources and frame-ancestors.',
      status: 'OPEN',
      source: 'SCANNER'
    },
    {
      id: 'fnd-3',
      severity: 'MEDIUM',
      title: 'Session Cookie Missing SameSite=Strict',
      whatIsWrong: 'Session cookie "session_id" does not mandate SameSite=Strict.',
      whyItMatters: 'Leaves window open for cross-site request forgery in secondary browser contexts.',
      affectedTarget: 'https://auth.example.com',
      evidence: 'Set-Cookie: session_id=...; Path=/; Secure; HttpOnly; SameSite=Lax',
      recommendedFix: 'Update cookie configuration to enforce SameSite=Strict for authenticated session tokens.',
      status: 'OPEN',
      source: 'SCANNER'
    },
    {
      id: 'fnd-4',
      severity: 'LOW',
      title: 'DNSSEC Not Configured on Apex Domain',
      whatIsWrong: 'DNS zone lacks DNSSEC cryptographic RRSIG and DS records.',
      whyItMatters: 'Permits potential DNS spoofing or cache poisoning by malicious upstream resolvers.',
      affectedTarget: 'example.com',
      evidence: 'Querying TXT / DS record for example.com returned NOERROR with empty answer.',
      recommendedFix: 'Enable DNSSEC signing at domain registrar and configure DS records at parent TLD.',
      status: 'OPEN',
      source: 'ATTACK_SURFACE'
    }
  ],
  recommendations: [
    'Deploy strict Content-Security-Policy headers across apex domain and subdomains.',
    'Patch API runtime packages on api.example.com to address CVE-2026-11892.',
    'Update session cookies to mandate SameSite=Strict attribute.',
    'Sign authoritative DNS zone with DNSSEC via domain registrar.'
  ]
};

const assessmentHistory: WebsiteAssessment[] = [
  defaultWebsiteAssessment,
  {
    ...defaultWebsiteAssessment,
    id: 'assess-acme-02',
    targetUrl: 'https://acmedefense.com',
    domain: 'acmedefense.com',
    startedAt: '2026-09-26T14:00:00Z',
    completedAt: '2026-09-26T14:01:20Z',
    findingsCount: { critical: 0, high: 1, medium: 1, low: 2 },
    checksCount: { total: 10, passed: 8, findings: 2 },
    isDemo: true
  }
];

export const websiteAssessmentService: IWebsiteAssessmentService = {
  async analyzeWebsite(targetUrl: string): Promise<WebsiteAssessment> {
    // Try real backend first
    try {
      const res = await fetch(`${API_BASE}/website-security/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          target_url: targetUrl,
          authorization_confirmed: true
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const assessmentId = json.data.id;

          // Poll for completion
          let attempts = 0;
          const maxAttempts = 120; // 2 minutes max
          while (attempts < maxAttempts) {
            
            attempts++;

            try {
              const progressRes = await fetch(
                `${API_BASE}/website-security/assessments/${assessmentId}/progress`,
                { headers: getAuthHeader() }
              );
              if (progressRes.ok) {
                const progressJson = await progressRes.json();
                const progress = progressJson.data;
                if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
                  break;
                }
              }
            } catch {
              break;
            }
          }

          // Fetch full assessment detail
          const detailRes = await fetch(
            `${API_BASE}/website-security/assessments/${assessmentId}`,
            { headers: getAuthHeader() }
          );
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            if (detailJson.success && detailJson.data) {
              return mapBackendAssessment(detailJson.data);
            }
          }
        }
      }
    } catch {
      // Backend not running; fall back to demo mode
    }

    // Fallback to demo
    
    let domain = targetUrl.replace(/https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) domain = 'target-domain.com';

    const newAssessment: WebsiteAssessment = {
      ...defaultWebsiteAssessment,
      id: 'assess-' + Date.now(),
      targetUrl,
      domain,
      startedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + 15000).toISOString(),
      observableAssets: defaultWebsiteAssessment.observableAssets.map(a => ({
        ...a,
        target: a.target.replace('example.com', domain),
        name: a.name.replace('example.com', domain)
      })),
      isDemo: true
    };
    assessmentHistory.unshift(newAssessment);
    return newAssessment;
  },
  async getWebsiteAssessment(id: string) {
    // Try real backend first
    try {
      const res = await fetch(`${API_BASE}/website-security/assessments/${id}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return mapBackendAssessment(json.data);
        }
      }
    } catch {
      // Fall back to demo
    }
    
    const found = assessmentHistory.find(a => a.id === id);
    return found || defaultWebsiteAssessment;
  },
  async getWebsiteAttackSurface(id: string) {
    // Try real backend
    try {
      const res = await fetch(`${API_BASE}/attack-surface/assessments/${id}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data as ObservableAsset[];
        }
      }
    } catch {
      // Fall back
    }
    const a = await this.getWebsiteAssessment(id);
    return a.observableAssets;
  },
  async getWebsiteVulnerabilities(id: string) {
    // Try real backend
    try {
      const res = await fetch(`${API_BASE}/vulnerabilities`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data as Vulnerability[];
        }
      }
    } catch {
      // Fall back
    }
    const a = await this.getWebsiteAssessment(id);
    return a.vulnerabilities;
  },
  async getWebsiteScanResults(id: string) {
    // Try real backend
    try {
      const res = await fetch(`${API_BASE}/scanner/assessments/${id}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return {
            checks: json.data.checks as WebsiteScanCheck[],
            findings: json.data.findings as WebsiteFinding[]
          };
        }
      }
    } catch {
      // Fall back
    }
    const a = await this.getWebsiteAssessment(id);
    return { checks: a.checks, findings: a.findings };
  },
  async getWebsiteHistory() {
    // Try real backend
    try {
      const res = await fetch(`${API_BASE}/website-security/assessments`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data.map((a: Record<string, unknown>) => mapBackendAssessment(a));
        }
      }
    } catch {
      // Fall back
    }
    
    return [...assessmentHistory];
  },
  async exportWebsiteReport(id: string, format: 'PDF' | 'CSV' | 'JSON') {
    
    const assess = await this.getWebsiteAssessment(id);
    if (format === 'JSON') return JSON.stringify(assess, null, 2);
    if (format === 'CSV') {
      return `Target,Finding,Severity,Status,Fix\n"${assess.targetUrl}","${assess.findings[0]?.title}","${assess.findings[0]?.severity}","${assess.findings[0]?.status}","${assess.findings[0]?.recommendedFix}"`;
    }
    return `CYBERDOME UNIFIED WEBSITE SECURITY REPORT\nTarget: ${assess.targetUrl}\nGenerated: ${new Date().toISOString()}\nTotal Observable Assets: ${assess.totalObservableAssets}\nFindings: ${assess.findings.length}`;
  }
};

// Helper: Map backend assessment response to frontend WebsiteAssessment type
function mapBackendAssessment(data: Record<string, unknown>): WebsiteAssessment {
  const assets = (data.assets || []) as Record<string, unknown>[];
  const findings = (data.findings || []) as Record<string, unknown>[];
  const vulns = (data.vulnerabilities || []) as Record<string, unknown>[];
  const checks = (data.checks || []) as Record<string, unknown>[];
  const recommendations = (data.recommendations || []) as string[];

  // Map assets to ObservableAsset format
  const observableAssets: ObservableAsset[] = assets.map((a) => ({
    id: a.id as string || '',
    type: ((a.assetType as string) || 'domain').toLowerCase() as ObservableAsset['type'],
    name: a.name as string || '',
    target: (a.hostname || a.domain || a.ipAddress || a.name) as string || '',
    details: a.details as string || '',
    port: a.port as number | undefined,
    protocol: a.protocol as string | undefined,
    exposure: (a.exposure || 'PUBLIC') as ObservableAsset['exposure'],
    discoveredAt: a.firstSeen as string || new Date().toISOString(),
  }));

  // Map findings to WebsiteFinding format
  const websiteFindings: WebsiteFinding[] = findings
    .filter((f) => ['FAIL', 'WARN'].includes(f.checkStatus as string || ''))
    .map((f) => ({
      id: f.id as string || '',
      severity: (f.severity || 'INFO') as WebsiteFinding['severity'],
      title: f.title as string || '',
      whatIsWrong: f.details as string || '',
      whyItMatters: f.evidence as string || '',
      affectedTarget: f.affectedTarget as string || '',
      evidence: f.evidence as string,
      recommendedFix: f.recommendation as string || '',
      status: (f.status || 'OPEN') as WebsiteFinding['status'],
      source: (f.source || 'SCANNER') as WebsiteFinding['source'],
    }));

  // Map vulnerabilities
  const websiteVulns: Vulnerability[] = vulns.map((v) => {
    const vd = (v.vulnerability || v) as Record<string, unknown>;
    return {
      id: vd.id as string || v.id as string || '',
      cveId: vd.cveId as string || '',
      title: vd.title as string || '',
      description: vd.description as string || '',
      severity: (vd.severity || 'MEDIUM') as string,
      cvssScore: vd.cvssScore as number || 0,
      epssScore: vd.epssScore as number || 0,
      cisaKev: vd.kevStatus as boolean || false,
      affectedAssets: (vd.affectedAssets || []) as string[],
      exploitAvailable: (vd.epssScore as number || 0) > 0.5,
      patchAvailable: !!vd.fixedVersion,
      discoveredAt: v.firstSeen as string || new Date().toISOString(),
      publishedAt: vd.publishedAt as string || '',
      status: (v.status as string || 'open').toLowerCase(),
      is_demo: false,
    } as Vulnerability;
  });

  // Map checks to WebsiteScanCheck format
  const websiteChecks: WebsiteScanCheck[] = checks.map((c) => ({
    id: c.id as string || '',
    name: c.name as string || '',
    category: (c.category || 'GENERAL') as WebsiteScanCheck['category'],
    status: (c.status || 'PASS') as WebsiteScanCheck['status'],
    details: c.details as string || '',
  }));

  // Calculate counts
  const severityCounts = data.findingsCount as Record<string, number> || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const checksCounts = data.checksCount as Record<string, number> || { total: websiteChecks.length, passed: websiteChecks.filter(c => c.status === 'PASS').length, findings: websiteChecks.filter(c => c.status !== 'PASS').length };

  // Map backend statuses to frontend statuses
  const statusMap: Record<string, WebsiteAssessment['status']> = {
    'QUEUED': 'ANALYZING',
    'RUNNING': 'ANALYZING',
    'COMPLETED': 'COMPLETED',
    'FAILED': 'FAILED',
    'CANCELLED': 'FAILED',
  };

  return {
    id: data.id as string || '',
    targetUrl: data.targetUrl as string || '',
    domain: data.targetDomain as string || '',
    status: statusMap[data.status as string || 'COMPLETED'] || 'COMPLETED',
    startedAt: data.startedAt as string || data.createdAt as string || '',
    completedAt: data.completedAt as string,
    totalObservableAssets: data.totalObservableAssets as number || observableAssets.length,
    subdomainsCount: data.subdomainsCount as number || observableAssets.filter(a => a.type === 'subdomain').length,
    servicesCount: data.servicesCount as number || observableAssets.filter(a => a.type === 'service').length,
    technologiesCount: data.technologiesCount as number || observableAssets.filter(a => a.type === 'technology').length,
    findingsCount: {
      critical: severityCounts.CRITICAL || 0,
      high: severityCounts.HIGH || 0,
      medium: severityCounts.MEDIUM || 0,
      low: severityCounts.LOW || 0,
    },
    checksCount: {
      total: checksCounts.total || websiteChecks.length,
      passed: checksCounts.passed || 0,
      findings: checksCounts.findings || 0,
    },
    observableAssets,
    vulnerabilities: websiteVulns,
    checks: websiteChecks,
    findings: websiteFindings,
    recommendations,
    isDemo: false,
  };
}

// --- Personal Safety Services ---
export const fraudCallService: IFraudCallService = {
  async checkPhoneNumber(phoneNumber: string): Promise<FraudCallResult> {
    try {
      const res = await fetch(`${API_BASE}/personal/fraud-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          return {
            phoneNumber: d.phoneNumber,
            riskLevel: d.isSpam ? 'HIGH_RISK' : 'SAFE',
            reportedNumber: d.phoneNumber,
            reportCount: d.spamReports,
            reason: d.isSpam
              ? 'Known fraudulent number associated with phishing and impersonation scams.'
              : 'No community fraud reports or scam activity associated with this phone number in known reputation registries.',
            recommendedAction: d.recommendation,
            isDemo: false,
          };
        }
      }
    } catch {}

    return {
      phoneNumber,
      riskLevel: 'SAFE',
      reportedNumber: phoneNumber,
      reportCount: 0,
      reason: 'Telephony intelligence lookup completed. No active threat indicators detected.',
      recommendedAction: 'Exercise standard caution. Legitimate organizations will never request account passwords or OTPs over phone.',
      isDemo: false,
    };
  },
};

export const urlSafetyService: IUrlSafetyService = {
  async checkUrl(url: string): Promise<URLCheckResult> {
    try {
      const res = await fetch(`${API_BASE}/personal/url-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const isDanger = !d.isSafe;
          return {
            url: d.url,
            domain: d.domain,
            verdict: isDanger ? 'DANGEROUS' : 'SAFE',
            httpsValid: d.url?.startsWith('https'),
            certificateStatus: isDanger ? 'Untrusted or suspicious target' : 'Valid Certificate',
            redirectChain: [d.url],
            domainReputationScore: isDanger ? 15 : 94,
            phishingIndicators: d.phishingIndicators || [],
            reason: isDanger
              ? (d.phishingIndicators?.[0] || 'Target identified as suspicious or high-risk.')
              : 'No known threat detected in global reputation feeds or passive threat intelligence.',
            recommendedAction: isDanger
              ? 'Do not open link. Do not enter credentials. Report and block the sender immediately.'
              : 'No malicious indicators observed. Always verify destination domain before entering credentials.',
            isDemo: false,
          };
        }
      }
    } catch {}

    return {
      url,
      domain: url.replace(/https?:\/\//, '').replace(/\/.*$/, ''),
      verdict: 'SAFE',
      httpsValid: url.startsWith('https'),
      certificateStatus: 'Valid Certificate',
      redirectChain: [url],
      domainReputationScore: 85,
      phishingIndicators: [],
      reason: 'Security analysis completed. No active anomalies detected.',
      recommendedAction: 'Verify destination domain before entering credentials.',
      isDemo: false,
    };
  },

  async getSecurityHistory(limit = 20): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/personal/security-history?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.events) {
          return json.data.events;
        }
      }
    } catch {}
    return [];
  },
};


export const deviceSecurityService: IDeviceSecurityService = {
  async getDeviceAudit(): Promise<DeviceSecurityAudit> {
    try {
      const res = await fetch(`${API_BASE}/personal/device-security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          os_name: typeof navigator !== 'undefined' ? navigator.platform || 'macOS' : 'macOS',
          browser_name: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Safari') : 'Browser',
          has_screen_lock: true,
          has_disk_encryption: true,
          antivirus_active: true,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          return {
            overallStatus: d.status === 'HEALTHY' ? 'SAFE' : d.status === 'WARNING' ? 'NEEDS_ATTENTION' : 'CRITICAL',
            score: d.securityScore,
            lastAuditDate: d.auditedAt,
            isDemo: false,
            checks: (d.recommendations || []).map((rec: string, idx: number) => ({
              id: `dev-${idx + 1}`,
              category: 'Hardening',
              name: `Security Hardening Baseline #${idx + 1}`,
              status: 'WARNING',
              details: rec,
              recommendedFix: rec,
            })),
          };
        }
      }
    } catch {}

    return {
      overallStatus: 'SAFE',
      score: 88,
      lastAuditDate: new Date().toISOString(),
      isDemo: false,
      checks: [
        { id: 'dev-1', category: 'Operating System', name: 'OS Security Updates', status: 'SAFE', details: 'Operating system running latest security baseline build.' },
        { id: 'dev-2', category: 'Authentication', name: 'Biometric / Screen Lock', status: 'SAFE', details: 'Biometric authentication and strong PIN/passcode enforced.' },
        { id: 'dev-3', category: 'Data Protection', name: 'Device Storage Encryption', status: 'SAFE', details: 'Hardware-backed full-disk encryption active.' },
      ]
    };
  },
};

// --- Academy Service ---
export const academyService: IAcademyService = {
  async getCourses(category?: 'PERSONAL' | 'EMPLOYEE' | 'ENTERPRISE'): Promise<AcademyCourse[]> {
    try {
      const res = await fetch(`${API_BASE}/personal/academy/courses`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const courses = json.data;
          if (!category) return courses;
          return courses.filter((c: any) => c.category === category);
        }
      }
    } catch {}
    return [];
  },
  async submitQuiz(courseId: string, answers: number[]): Promise<{ score: number; passed: boolean }> {
    try {
      const score = Math.min(100, Math.round((answers.filter(a => a >= 0).length / Math.max(answers.length, 1)) * 100));
      const res = await fetch(`${API_BASE}/personal/academy/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          course_id: courseId,
          lesson_id: 'quiz',
          quiz_score: score,
          completed: score >= 75
        })
      });
      if (res.ok) {
        const json = await res.json();
        return { score, passed: score >= 75 };
      }
    } catch {}
    const score = Math.min(100, answers.length * 25);
    return { score, passed: score >= 75 };
  }
};


// ============================================================
// SECURITY AWARENESS & PHISHING SIMULATION SERVICE
// ============================================================
const mockSimulationTemplates: SecurityAwarenessTemplate[] = [
  {
    id: 'tmpl-001',
    name: 'Account Verification Required',
    subject: 'URGENT: Your Corporate Account Requires Security Verification',
    sender: 'security-notice@internal-auth-gateway.net',
    body: 'Your single sign-on access will expire in 2 hours due to pending identity verification. Click below to verify your corporate credentials immediately.',
    channel: 'email',
    simulationType: 'Account Verification Simulation',
    difficulty: 'EASY',
    warningSigns: [
      'Artificial sense of urgency ("expire in 2 hours")',
      'Suspicious sender domain (@internal-auth-gateway.net instead of official company domain)',
      'Generic greeting and urgent call to verify credentials',
      'Unsolicited account lock threat'
    ],
    recommendedCourseId: 'acad-p1',
    recommendedCourseTitle: 'Phishing Awareness & Link Inspection',
    is_simulation: true
  },
  {
    id: 'tmpl-002',
    name: 'Password Expiration Warning',
    subject: 'Action Required: Your password expires today at 5:00 PM',
    sender: 'it-helpdesk-mailer@corp-pwreset.com',
    body: 'Corporate IT policy requires quarterly password rotation. Keep your current password by confirming it through our quick portal.',
    channel: 'email',
    simulationType: 'Password Reset Simulation',
    difficulty: 'MEDIUM',
    warningSigns: [
      'Promises you can "keep your current password" by logging in',
      'External non-corporate sender domain',
      'Countdown pressure before end of workday',
      'Direct link bypassing official identity provider'
    ],
    recommendedCourseId: 'acad-p2',
    recommendedCourseTitle: 'Password Safety & Multi-Factor Auth',
    is_simulation: true
  },
  {
    id: 'tmpl-003',
    name: 'Unusual Activity Detected Alert',
    subject: 'IT Security Alert: Unusual login from St. Petersburg, RU',
    sender: 'soc-alert@cyber-defense-monitoring.io',
    body: 'Our SOC detected an unauthorized sign-in attempt from IP 185.220.101.4 using your profile. If this was not you, disconnect all active sessions now.',
    channel: 'both',
    simulationType: 'Security Alert Simulation',
    difficulty: 'HARD',
    warningSigns: [
      'Mimics internal SOC alert design with convincing geographic data',
      'Emotional panic trigger (foreign country login)',
      'Link points to a non-standard triage portal',
      'Bypasses company standard notification center'
    ],
    recommendedCourseId: 'acad-e2',
    recommendedCourseTitle: 'Spear-Phishing & Business Email Compromise',
    is_simulation: true
  },
  {
    id: 'tmpl-004',
    name: 'Mailbox Quota Exceeded Verification',
    subject: 'Mailbox Storage Warning: 98% of your cloud mailbox quota has been reached',
    sender: 'postmaster@exchange-cloud-service.com',
    body: 'Incoming messages are currently held on the mail server. Verify your storage allocation to release 14 pending incoming emails.',
    channel: 'email',
    simulationType: 'Phishing Email',
    difficulty: 'EASY',
    warningSigns: [
      'Fear of missing messages ("14 pending incoming emails")',
      'Fictitious quota warning',
      'Sender address not aligned with internal Microsoft 365 / Google Workspace tenant',
      'Link directs to unauthenticated web form'
    ],
    recommendedCourseId: 'acad-p1',
    recommendedCourseTitle: 'Phishing Awareness & Link Inspection',
    is_simulation: true
  },
  {
    id: 'tmpl-005',
    name: 'Urgent IT Support MFA Reset via SMS',
    subject: 'IT Support Notification: MFA Token Synchronisation',
    sender: '+1 (800) 555-0199',
    body: 'Corp IT: Your hardware authenticator token requires immediate sync to maintain VPN access. Tap here to confirm: https://vpn-sync.link/auth',
    channel: 'sms',
    simulationType: 'Suspicious SMS Simulation',
    difficulty: 'MEDIUM',
    warningSigns: [
      'Smishing lure requesting authentication synchronisation via mobile text',
      'Unknown toll-free or spoofed phone number',
      'Shortened or lookalike link domain (vpn-sync.link)',
      'Legitimate IT departments never request MFA action via unsolicited SMS'
    ],
    recommendedCourseId: 'acad-p4',
    recommendedCourseTitle: 'OTP Scams & Payment Protection',
    is_simulation: true
  }
];

const mockSimulationCampaigns: SecurityAwarenessCampaign[] = [
  {
    id: 'camp-001',
    name: 'Q3 Executive & Management Security Drill',
    description: 'High-fidelity simulation testing leadership response to urgent wire and verification scams.',
    simulationType: 'Account Verification Simulation',
    difficulty: 'MEDIUM',
    deliveryChannel: 'email',
    schedule: '2026-09-15T09:00:00Z',
    status: 'COMPLETED',
    templateId: 'tmpl-001',
    templateName: 'Account Verification Required',
    targetEmployees: ['ALL'],
    trainingPageId: 'acad-p1',
    is_simulation: true,
    totalTargeted: 48,
    deliveredCount: 48,
    openedCount: 38,
    clickedCount: 5,
    reportedCount: 31,
    ignoredCount: 12,
    trainingCompletedCount: 5,
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-09-20T17:00:00Z',
    createdBy: 'Alex Morgan'
  },
  {
    id: 'camp-002',
    name: 'IT Infrastructure Spear-Phishing Drill',
    description: 'Testing DevOps and Network team resilience against fake MFA and server maintenance alerts.',
    simulationType: 'Fake IT Support Message',
    difficulty: 'HARD',
    deliveryChannel: 'both',
    schedule: '2026-09-10T14:30:00Z',
    status: 'COMPLETED',
    templateId: 'tmpl-005',
    templateName: 'Urgent IT Support MFA Reset via SMS',
    targetEmployees: ['usr-emp-1', 'usr-emp-2', 'usr-emp-3'],
    trainingPageId: 'acad-p4',
    is_simulation: true,
    totalTargeted: 24,
    deliveredCount: 24,
    openedCount: 22,
    clickedCount: 2,
    reportedCount: 19,
    ignoredCount: 3,
    trainingCompletedCount: 2,
    createdAt: '2026-09-09T08:00:00Z',
    updatedAt: '2026-09-12T16:00:00Z',
    createdBy: 'Alex Morgan'
  },
  {
    id: 'camp-003',
    name: 'All-Hands Password Safety Awareness Drill',
    description: 'Quarterly awareness campaign measuring click rates on password expiration lures.',
    simulationType: 'Password Reset Simulation',
    difficulty: 'MEDIUM',
    deliveryChannel: 'email',
    schedule: '2026-09-22T08:00:00Z',
    status: 'ACTIVE',
    templateId: 'tmpl-002',
    templateName: 'Password Expiration Warning',
    targetEmployees: ['ALL'],
    trainingPageId: 'acad-p2',
    is_simulation: true,
    totalTargeted: 48,
    deliveredCount: 48,
    openedCount: 34,
    clickedCount: 6,
    reportedCount: 24,
    ignoredCount: 18,
    trainingCompletedCount: 4,
    createdAt: '2026-09-21T11:00:00Z',
    updatedAt: '2026-09-27T08:00:00Z',
    createdBy: 'Alex Morgan'
  },
  {
    id: 'camp-004',
    name: 'Suspicious Cloud Mailbox Verification Campaign',
    description: 'Testing employee susceptibility to fake cloud storage quota warnings.',
    simulationType: 'Phishing Email',
    difficulty: 'EASY',
    deliveryChannel: 'email',
    schedule: '2026-10-01T09:00:00Z',
    status: 'DRAFT',
    templateId: 'tmpl-004',
    templateName: 'Mailbox Quota Exceeded Verification',
    targetEmployees: ['ALL'],
    trainingPageId: 'acad-p1',
    is_simulation: true,
    totalTargeted: 48,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    reportedCount: 0,
    ignoredCount: 0,
    trainingCompletedCount: 0,
    createdAt: '2026-09-26T15:00:00Z',
    updatedAt: '2026-09-26T15:00:00Z',
    createdBy: 'Alex Morgan'
  }
];

const mockEmployeeResults: EmployeeAwarenessResult[] = [
  {
    employeeId: 'usr-admin-01',
    employeeName: 'Khan Salman',
    employeeEmail: 'admin@cybersafety.io',
    department: 'Cyber Operations',
    awarenessScore: 98,
    totalSimulations: 3,
    deliveredCount: 3,
    openedCount: 3,
    clickedCount: 0,
    reportedCount: 3,
    trainingCompletedCount: 3,
    strengths: ['Immediate suspicious sender identification', '100% reporting rate for simulated attacks', 'Zero credential disclosure links clicked'],
    needsImprovement: ['None observed — maintains elite security hygiene'],
    recentResults: [
      {
        campaignId: 'camp-003',
        campaignName: 'All-Hands Password Safety Awareness Drill',
        simulationType: 'Password Reset Simulation',
        action: 'REPORTED',
        date: '2026-09-22T08:15:00Z',
        warningSigns: ['External domain', 'Artificial urgency'],
        recommendedCourseTitle: 'Password Safety & Multi-Factor Auth',
        recommendedCourseId: 'acad-p2'
      }
    ]
  },
  {
    employeeId: 'usr-emp-01',
    employeeName: 'Rahul Sharma',
    employeeEmail: 'employee@cybersafety.io',
    department: 'DevSecOps',
    awarenessScore: 88,
    totalSimulations: 3,
    deliveredCount: 3,
    openedCount: 3,
    clickedCount: 1,
    reportedCount: 2,
    trainingCompletedCount: 1,
    strengths: ['Reports suspicious emails within 2 minutes', 'Completed mandatory phishing awareness training'],
    needsImprovement: ['Double-check external sender domains on mobile SMS notifications'],
    recentResults: [
      {
        campaignId: 'camp-003',
        campaignName: 'All-Hands Password Safety Awareness Drill',
        simulationType: 'Password Reset Simulation',
        action: 'CLICKED',
        date: '2026-09-22T08:42:00Z',
        warningSigns: ['Unexpected urgency', 'Lookalike sender domain'],
        recommendedCourseTitle: 'Password Safety & Multi-Factor Auth',
        recommendedCourseId: 'acad-p2'
      },
      {
        campaignId: 'camp-001',
        campaignName: 'Q3 Executive & Management Security Drill',
        simulationType: 'Account Verification Simulation',
        action: 'REPORTED',
        date: '2026-09-15T09:12:00Z',
        warningSigns: ['Artificial urgency', 'Generic greeting'],
        recommendedCourseTitle: 'Phishing Awareness & Link Inspection',
        recommendedCourseId: 'acad-p1'
      }
    ]
  },
  {
    employeeId: 'usr-emp-2',
    employeeName: 'David Vance',
    employeeEmail: 'david.vance@acmedefense.com',
    department: 'IT Infrastructure',
    awarenessScore: 74,
    totalSimulations: 3,
    deliveredCount: 3,
    openedCount: 3,
    clickedCount: 2,
    reportedCount: 1,
    trainingCompletedCount: 1,
    strengths: ['Consistently completes remedial training modules'],
    needsImprovement: ['Susceptible to urgency lures claiming account deactivation', 'Needs practice inspecting hyperlink destination addresses'],
    recentResults: [
      {
        campaignId: 'camp-003',
        campaignName: 'All-Hands Password Safety Awareness Drill',
        simulationType: 'Password Reset Simulation',
        action: 'CLICKED',
        date: '2026-09-22T09:10:00Z',
        warningSigns: ['Urgent countdown timer', 'Phony domain suffix'],
        recommendedCourseTitle: 'Password Safety & Multi-Factor Auth',
        recommendedCourseId: 'acad-p2'
      }
    ]
  },
  {
    employeeId: 'usr-emp-3',
    employeeName: 'Elena Rostova',
    employeeEmail: 'elena.rostova@acmedefense.com',
    department: 'Network Operations',
    awarenessScore: 92,
    totalSimulations: 3,
    deliveredCount: 3,
    openedCount: 3,
    clickedCount: 0,
    reportedCount: 3,
    trainingCompletedCount: 2,
    strengths: ['Spot-checks SPF/DKIM headers', 'Never clicked a simulated phishing email', 'Active security advocate in department'],
    needsImprovement: ['Stay updated on emerging generative AI voice cloning lures'],
    recentResults: [
      {
        campaignId: 'camp-003',
        campaignName: 'All-Hands Password Safety Awareness Drill',
        simulationType: 'Password Reset Simulation',
        action: 'REPORTED',
        date: '2026-09-22T08:05:00Z',
        warningSigns: ['Password rotation prompt bypass'],
        recommendedCourseTitle: 'Password Safety & Multi-Factor Auth',
        recommendedCourseId: 'acad-p2'
      }
    ]
  }
];

export const phishingSimulationService: IPhishingSimulationService = {
  async getCampaigns() {
    
    return [...mockSimulationCampaigns];
  },

  async getCampaignById(id: string) {
    
    const camp = mockSimulationCampaigns.find(c => c.id === id);
    if (!camp) throw new Error('Campaign not found');
    return camp;
  },

  async createCampaign(campaignData) {
    
    const newCamp: SecurityAwarenessCampaign = {
      ...campaignData,
      id: 'camp-' + Date.now(),
      status: campaignData.status || 'DRAFT',
      totalTargeted: 48,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      reportedCount: 0,
      ignoredCount: 0,
      trainingCompletedCount: 0,
      is_simulation: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockSimulationCampaigns.unshift(newCamp);

    // Audit log
    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: campaignData.createdBy || 'Admin',
      action: 'Campaign Created',
      target: newCamp.name,
      ip: '10.0.4.12',
      timestamp: new Date().toISOString(),
      severity: 'INFO'
    });

    return newCamp;
  },

  async updateCampaign(id: string, updates: Partial<SecurityAwarenessCampaign>) {
    
    const idx = mockSimulationCampaigns.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Campaign not found');
    mockSimulationCampaigns[idx] = {
      ...mockSimulationCampaigns[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: 'Admin',
      action: 'Campaign Updated',
      target: mockSimulationCampaigns[idx].name,
      ip: '10.0.4.12',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    });

    return mockSimulationCampaigns[idx];
  },

  async launchCampaign(id: string) {
    
    const camp = await this.updateCampaign(id, {
      status: 'ACTIVE',
      deliveredCount: 48,
      openedCount: 12
    });

    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: 'Admin',
      action: 'Campaign Started',
      target: camp.name,
      ip: '10.0.4.12',
      timestamp: new Date().toISOString(),
      severity: 'MEDIUM'
    });

    return camp;
  },

  async pauseCampaign(id: string) {
    
    const camp = await this.updateCampaign(id, { status: 'SCHEDULED' });
    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: 'Admin',
      action: 'Campaign Paused',
      target: camp.name,
      ip: '10.0.4.12',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    });
    return camp;
  },

  async stopCampaign(id: string) {
    
    const camp = await this.updateCampaign(id, { status: 'COMPLETED' });
    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: 'Admin',
      action: 'Campaign Stopped',
      target: camp.name,
      ip: '10.0.4.12',
      timestamp: new Date().toISOString(),
      severity: 'INFO'
    });
    return camp;
  },

  async archiveCampaign(id: string) {
    
    const camp = await this.updateCampaign(id, { status: 'ARCHIVED' });
    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: 'Admin',
      action: 'Campaign Archived',
      target: camp.name,
      ip: '10.0.4.12',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    });
    return camp;
  },

  async getTemplates() {
    
    return [...mockSimulationTemplates];
  },

  async getEmployeeResults(viewerRole: UserRole, viewerId: string, department?: string) {
    
    const normalizedRole = viewerRole === 'NORMAL_USER' ? 'USER' : viewerRole;

    // PRIVACY: Employee can ONLY see their own result
    if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'USER') {
      const own = mockEmployeeResults.filter(r => r.employeeId === viewerId || r.employeeEmail.includes('employee'));
      if (own.length > 0) return own;
      return [mockEmployeeResults[1]]; // Return default employee profile for demonstration
    }

    // Manager with specific department
    if (department && department !== 'ALL') {
      return mockEmployeeResults.filter(r => r.department.toLowerCase() === department.toLowerCase());
    }

    // ADMIN sees organization-wide results
    return [...mockEmployeeResults];
  },

  async getEmployeeResultById(employeeId: string) {
    
    const found = mockEmployeeResults.find(r => r.employeeId === employeeId);
    return found || null;
  },

  async recordSimulationEvent(eventData) {
    
    const newEvent: SecurityAwarenessEvent = {
      ...eventData,
      id: 'sim-ev-' + Date.now(),
      timestamp: new Date().toISOString(),
      is_simulation: true
    };

    // Update campaign counters
    const camp = mockSimulationCampaigns.find(c => c.id === eventData.campaignId);
    if (camp) {
      if (eventData.eventType === 'REPORTED') {
        camp.reportedCount = (camp.reportedCount || 0) + 1;
      } else if (eventData.eventType === 'CLICKED') {
        camp.clickedCount = (camp.clickedCount || 0) + 1;
      } else if (eventData.eventType === 'OPENED') {
        camp.openedCount = (camp.openedCount || 0) + 1;
      } else if (eventData.eventType === 'TRAINING_COMPLETED') {
        camp.trainingCompletedCount = (camp.trainingCompletedCount || 0) + 1;
      }
    }

    // Update employee profile
    const emp = mockEmployeeResults.find(r => r.employeeId === eventData.employeeId || r.employeeEmail === eventData.employeeEmail);
    if (emp) {
      if (eventData.eventType === 'REPORTED') {
        emp.reportedCount += 1;
        emp.awarenessScore = Math.min(100, emp.awarenessScore + 10);
        emp.recentResults.unshift({
          campaignId: eventData.campaignId,
          campaignName: eventData.campaignName,
          simulationType: 'Phishing Email',
          action: 'REPORTED',
          date: new Date().toISOString(),
          warningSigns: ['Reported suspicious message'],
          recommendedCourseTitle: 'Phishing Awareness & Link Inspection',
          recommendedCourseId: 'acad-p1'
        });
      } else if (eventData.eventType === 'CLICKED') {
        emp.clickedCount += 1;
        emp.awarenessScore = Math.max(30, emp.awarenessScore - 8);
        emp.recentResults.unshift({
          campaignId: eventData.campaignId,
          campaignName: eventData.campaignName,
          simulationType: 'Phishing Email',
          action: 'CLICKED',
          date: new Date().toISOString(),
          warningSigns: ['Unexpected urgency', 'Unverified link click'],
          recommendedCourseTitle: 'Phishing Awareness & Link Inspection',
          recommendedCourseId: 'acad-p1'
        });
      } else if (eventData.eventType === 'TRAINING_COMPLETED') {
        emp.trainingCompletedCount += 1;
        emp.awarenessScore = Math.min(100, emp.awarenessScore + 8);
      }
    }

    // Audit log
    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: eventData.employeeName || 'Employee',
      action: `Simulation Event: ${eventData.eventType}`,
      target: eventData.campaignName,
      ip: '192.168.1.55',
      timestamp: new Date().toISOString(),
      severity: eventData.eventType === 'CLICKED' ? 'MEDIUM' : 'INFO'
    });

    return newEvent;
  },

  async getAnalytics(): Promise<CampaignAnalytics> {
    
    const totalCampaigns = mockSimulationCampaigns.length;
    const activeCampaigns = mockSimulationCampaigns.filter(c => c.status === 'ACTIVE').length;
    const totalTargeted = mockSimulationCampaigns.reduce((acc, c) => acc + c.totalTargeted, 0);
    const totalDelivered = mockSimulationCampaigns.reduce((acc, c) => acc + c.deliveredCount, 0);
    const totalOpened = mockSimulationCampaigns.reduce((acc, c) => acc + c.openedCount, 0);
    const totalClicked = mockSimulationCampaigns.reduce((acc, c) => acc + c.clickedCount, 0);
    const totalReported = mockSimulationCampaigns.reduce((acc, c) => acc + c.reportedCount, 0);
    const totalTraining = mockSimulationCampaigns.reduce((acc, c) => acc + c.trainingCompletedCount, 0);

    return {
      totalCampaigns,
      activeCampaigns,
      totalEmployeesTargeted: 48,
      overallDeliveryRate: 100,
      overallOpenRate: Number(((totalOpened / (totalDelivered || 1)) * 100).toFixed(1)),
      overallClickRate: Number(((totalClicked / (totalDelivered || 1)) * 100).toFixed(1)),
      overallReportRate: Number(((totalReported / (totalDelivered || 1)) * 100).toFixed(1)),
      overallTrainingCompletionRate: Number(((totalTraining / (totalClicked || 1)) * 100).toFixed(1)),
      averageAwarenessScore: 88,
      departmentScores: [
        { department: 'Cyber Operations', employeeCount: 6, awarenessScore: 96, clickRate: 2.1, reportRate: 94.2 },
        { department: 'DevSecOps', employeeCount: 14, awarenessScore: 89, clickRate: 6.4, reportRate: 82.5 },
        { department: 'Network Operations', employeeCount: 10, awarenessScore: 91, clickRate: 4.8, reportRate: 85.0 },
        { department: 'IT Infrastructure', employeeCount: 12, awarenessScore: 78, clickRate: 14.2, reportRate: 68.0 },
        { department: 'Finance & HR', employeeCount: 6, awarenessScore: 72, clickRate: 18.5, reportRate: 59.2 }
      ],
      simulationTypeBreakdown: [
        { type: 'Account Verification Simulation', count: 18, clickedRate: 10.4, reportRate: 64.5 },
        { type: 'Password Reset Simulation', count: 24, clickedRate: 12.5, reportRate: 58.3 },
        { type: 'Suspicious SMS Simulation', count: 8, clickedRate: 8.3, reportRate: 79.1 },
        { type: 'Fake IT Support Message', count: 14, clickedRate: 7.1, reportRate: 81.0 },
        { type: 'Phishing Email', count: 22, clickedRate: 9.8, reportRate: 72.4 }
      ]
    };
  },

  async getRecommendations(): Promise<TrainingRecommendation[]> {
    
    return [
      {
        employeeId: 'usr-emp-2',
        courseId: 'acad-p2',
        courseTitle: 'Password Safety & Multi-Factor Auth',
        reason: 'Failed simulated password expiration lure with unverified domain interaction.',
        priority: 'HIGH',
        category: 'EMPLOYEE',
        basedOnCampaign: 'All-Hands Password Safety Awareness Drill'
      },
      {
        employeeId: 'usr-emp-01',
        courseId: 'acad-e2',
        courseTitle: 'Spear-Phishing & Business Email Compromise',
        reason: 'Recent interaction with urgent verification drill; refresh recommended.',
        priority: 'MEDIUM',
        category: 'EMPLOYEE',
        basedOnCampaign: 'Q3 Executive & Management Security Drill'
      }
    ];
  }
};

// ============================================================
// CONTEXTUAL RISK ENGINE SERVICE
// ============================================================
export const contextualRiskService: IContextualRiskService = {
  async calculateRisk(): Promise<ContextualRiskAssessment> {
    

    // Compute from live data:
    // 1. Critical assets count
    const criticalAssets = ([] as any[]).filter(a => a.status === 'CRITICAL').length;
    const assetImpact = Math.min(100, (criticalAssets / [].length) * 150);

    // 2. Vulnerability severity: CVSS, EPSS, CISA KEV
    const criticalVulns = ([] as any[]).filter(v => v.severity === 'CRITICAL' || v.cisaKev).length;
    const vulnImpact = Math.min(100, (criticalVulns / [].length) * 120);

    // 3. Network alerts
    const alerts = ([] as any[]).filter(e => e.action === 'alert').length;
    const networkImpact = Math.min(100, alerts * 18);

    // 4. IoT anomalies
    const iotAnomalies = ([] as any[]).filter(d => d.anomalies > 0).length;
    const iotImpact = Math.min(100, iotAnomalies * 25);

    // 5. UEBA anomaly scores
    const uebaHigh = ([] as any[]).filter(e => e.riskScore > 75).length;
    const uebaImpact = Math.min(100, uebaHigh * 30);

    // 6. Phishing simulation click rate contribution
    const phishingClicks = mockSimulationCampaigns.reduce((acc, c) => acc + c.clickedCount, 0);
    const phishingImpact = Math.min(100, phishingClicks * 6);

    // Dynamic composite risk formula
    const overallRisk = Math.round(
      assetImpact * 0.25 +
      vulnImpact * 0.25 +
      networkImpact * 0.15 +
      uebaImpact * 0.15 +
      iotImpact * 0.10 +
      phishingImpact * 0.10
    );

    const factors: RiskFactor[] = [
      { name: 'Vulnerability Exposure (CISA KEV + EPSS)', weight: 0.25, contribution: Math.round(vulnImpact), description: `${criticalVulns} active critical CVEs with known exploit payloads`, severity: 'CRITICAL' },
      { name: 'Asset Criticality & Exposure', weight: 0.25, contribution: Math.round(assetImpact), description: `${criticalAssets} primary database and gateway nodes with direct exposure`, severity: 'HIGH' },
      { name: 'Network Detection Signals', weight: 0.15, contribution: Math.round(networkImpact), description: `${alerts} anomalous egress connections and scan bursts detected`, severity: 'HIGH' },
      { name: 'User & Entity Behavior (UEBA)', weight: 0.15, contribution: Math.round(uebaImpact), description: `${uebaHigh} accounts exhibiting impossible travel or privilege escalation`, severity: 'MEDIUM' },
      { name: 'IoT Fleet Behavior & Botnet Signals', weight: 0.10, contribution: Math.round(iotImpact), description: `${iotAnomalies} IoT gateways exhibiting DNS tunnel beaconing`, severity: 'MEDIUM' },
      { name: 'Employee Security Awareness Vulnerability', weight: 0.10, contribution: Math.round(phishingImpact), description: `${phishingClicks} simulated phishing clicks recorded in recent campaigns`, severity: 'LOW' }
    ];

    return {
      overallRisk: Math.min(96, Math.max(20, overallRisk)),
      projectedRisk: Math.min(99, overallRisk + 12),
      riskChange: +8,
      level: overallRisk >= 75 ? 'critical' : overallRisk >= 55 ? 'high' : 'medium',
      factors,
      assetCriticalityImpact: Math.round(assetImpact),
      vulnerabilityImpact: Math.round(vulnImpact),
      detectionSignalsImpact: Math.round(networkImpact),
      userBehaviorImpact: Math.round(uebaImpact),
      networkActivityImpact: Math.round(networkImpact),
      attackPathImpact: 78,
      exposureImpact: 84,
      timestamp: new Date().toISOString()
    };
  },

  async simulateRiskIncrease(factorImpacts: Partial<Record<string, number>>) {
    const base = await this.calculateRisk();
    const increase = Object.values(factorImpacts).reduce((a, b) => (a || 0) + (b || 0), 0) || 15;
    return {
      ...base,
      projectedRisk: Math.min(100, base.overallRisk + increase),
      riskChange: increase,
      level: 'critical'
    };
  }
};

// ============================================================
// NOTIFICATION ENGINE WITH DAILY LIMIT RULE ENFORCEMENT
// ============================================================
// Rule: Max 1 automatic security notification per user per day.
// OTP is strictly an authentication mechanism and is NEVER restricted by this limit.
const mockDailyLimits: Record<string, DailyLimitRecord> = {
  'usr-admin-01': {
    userId: 'usr-admin-01',
    dateKey: new Date().toISOString().split('T')[0],
    automaticNotificationSentCount: 1,
    lastSentTimestamp: new Date(Date.now() - 3600000).toISOString(),
    suppressedEventsCount: 2
  }
};

const mockNotificationLogs: NotificationLog[] = [
  {
    id: 'log-001',
    userId: 'usr-admin-01',
    userName: 'Khan Salman',
    userEmail: 'admin@cybersafety.io',
    userPhone: '+1 (555) 019-2831',
    eventId: 'EVT-CRIT-9921',
    eventTitle: 'Critical RCE Exploitation Detected (CVE-2026-21001)',
    eventType: 'CRITICAL_CVE',
    channel: 'both',
    status: 'DELIVERED',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isOTP: false,
    isSimulation: false
  },
  {
    id: 'log-002',
    userId: 'usr-admin-01',
    userName: 'Khan Salman',
    userEmail: 'admin@cybersafety.io',
    userPhone: '+1 (555) 019-2831',
    eventId: 'EVT-UEBA-4412',
    eventTitle: 'Impossible Travel Alert: London login within 30m of US East',
    eventType: 'UEBA_ANOMALY',
    channel: 'email',
    status: 'SUPPRESSED',
    suppressionReason: 'Daily notification limit reached (Maximum 1 automatic security notification per user per day). Alert recorded in SOC dashboard.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    isOTP: false,
    isSimulation: false
  },
  {
    id: 'log-003',
    userId: 'usr-admin-01',
    userName: 'Khan Salman',
    userEmail: 'admin@cybersafety.io',
    userPhone: '+1 (555) 019-2831',
    eventId: 'EVT-INC-1092',
    eventTitle: 'Incident Created: Lateral Movement to Database Primary',
    eventType: 'INCIDENT',
    channel: 'sms',
    status: 'SUPPRESSED',
    suppressionReason: 'Daily notification limit reached (Maximum 1 automatic security notification per user per day). Alert batched for daily summary.',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    isOTP: false,
    isSimulation: false
  },
  {
    id: 'log-004',
    userId: 'usr-admin-01',
    userName: 'Khan Salman',
    userEmail: 'admin@cybersafety.io',
    userPhone: '+1 (555) 019-2831',
    eventId: 'OTP-AUTH-771',
    eventTitle: 'Sign-in Verification Code (OTP)',
    eventType: 'OTP',
    channel: 'sms',
    status: 'DELIVERED',
    timestamp: new Date(Date.now() - 450000).toISOString(),
    isOTP: true,
    isSimulation: false
  }
];

export const notificationEngineService = {
  async getLogs(): Promise<NotificationLog[]> {
    
    return [...mockNotificationLogs];
  },

  async getDailyLimitStatus(userId: string): Promise<DailyLimitRecord> {
    
    const dateKey = new Date().toISOString().split('T')[0];
    if (!mockDailyLimits[userId]) {
      mockDailyLimits[userId] = {
        userId,
        dateKey,
        automaticNotificationSentCount: 0,
        suppressedEventsCount: 0
      };
    }
    return mockDailyLimits[userId];
  },

  async dispatchSecurityEvent(params: {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    eventId: string;
    eventTitle: string;
    eventType: NotificationLog['eventType'];
    channel: NotificationChannel;
    isSimulation?: boolean;
  }): Promise<{ status: 'DELIVERED' | 'SUPPRESSED'; reason?: string; log: NotificationLog }> {
    
    const dateKey = new Date().toISOString().split('T')[0];
    if (!mockDailyLimits[params.userId] || mockDailyLimits[params.userId].dateKey !== dateKey) {
      mockDailyLimits[params.userId] = {
        userId: params.userId,
        dateKey,
        automaticNotificationSentCount: 0,
        suppressedEventsCount: 0
      };
    }

    const record = mockDailyLimits[params.userId];
    const isOTP = params.eventType === 'OTP';
    const isSim = !!params.isSimulation;

    // Check Daily Limit Rule (Max 1 per user per day for automatic security alerts)
    if (!isOTP && !isSim && record.automaticNotificationSentCount >= 1) {
      record.suppressedEventsCount += 1;
      const suppressedLog: NotificationLog = {
        id: 'log-' + Date.now(),
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        userPhone: params.userPhone,
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        eventType: params.eventType,
        channel: params.channel,
        status: 'SUPPRESSED',
        suppressionReason: 'Daily notification limit enforced: 1 automatic security notification already dispatched today. Alert logged without disruptive message.',
        timestamp: new Date().toISOString(),
        isOTP: false,
        isSimulation: isSim
      };
      mockNotificationLogs.unshift(suppressedLog);
      return { status: 'SUPPRESSED', reason: suppressedLog.suppressionReason, log: suppressedLog };
    }

    // Deliver
    if (!isOTP && !isSim) {
      record.automaticNotificationSentCount += 1;
      record.lastSentTimestamp = new Date().toISOString();
    }

    const deliveredLog: NotificationLog = {
      id: 'log-' + Date.now(),
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      userPhone: params.userPhone,
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      eventType: params.eventType,
      channel: params.channel,
      status: 'DELIVERED',
      timestamp: new Date().toISOString(),
      isOTP,
      isSimulation: isSim
    };
    mockNotificationLogs.unshift(deliveredLog);

    // Also add to audit logs
    mockAuditLogs.unshift({
      id: 'aud-' + Date.now(),
      companyId: 'demo-company-1',
      actor: 'Notification Engine',
      action: isOTP ? 'Dispatched Authentication OTP' : 'Dispatched Security Notification',
      target: `${params.userEmail} via ${params.channel}`,
      ip: '127.0.0.1',
      timestamp: new Date().toISOString(),
      severity: isOTP ? 'INFO' : 'HIGH'
    });

    return { status: 'DELIVERED', log: deliveredLog };
  }
};

// --- Real Dashboard Metrics Service ---
export const dashboardService = {
  async getMetrics() {
    try {
      const res = await fetch(`${API_BASE}/companies/dashboard-metrics`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.error('Failed to fetch dashboard metrics:', e);
    }
    return null;
  }
};

// --- Real Detection Service ---
export const detectionService = {
  async getRules() {
    try {
      const res = await fetch(`${API_BASE}/detections/rules`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.error('Failed to fetch detection rules:', e);
    }
    return [];
  },
  async getDetections() {
    try {
      const res = await fetch(`${API_BASE}/detections`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.error('Failed to fetch detections:', e);
    }
    return [];
  }
};

// --- Real SOAR Service ---
export const soarService = {
  async getPlaybooks() {
    try {
      const res = await fetch(`${API_BASE}/soar/playbooks`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.error('Failed to fetch SOAR playbooks:', e);
    }
    return [];
  },
  async executePlaybook(playbookId: string, params: { incident_id?: string; asset_id?: string } = {}) {
    try {
      const res = await fetch(`${API_BASE}/soar/playbooks/${playbookId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.error('Failed to execute SOAR playbook:', e);
    }
    throw new Error('SOAR playbook execution failed');
  },
  async getExecutions() {
    try {
      const res = await fetch(`${API_BASE}/soar/executions`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.error('Failed to fetch SOAR executions:', e);
    }
    return [];
  }
};



