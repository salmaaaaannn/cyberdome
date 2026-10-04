// ============================================================
// CYBERDOME — Complete Type Definitions
// ============================================================

// --- Severity & Status ---
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AssetStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
export type NodeType = 'user' | 'server' | 'database' | 'iot' | 'router' | 'cloud' | 'application' | 'gateway' | 'internet' | 'firewall';
export type ThreatType = 'malware' | 'phishing' | 'ransomware' | 'ddos' | 'brute_force' | 'insider' | 'apt' | 'zero_day' | 'botnet' | 'data_exfil';
export type NotificationChannel = 'email' | 'sms' | 'both';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

// --- Auth ---
export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'USER' | 'NORMAL_USER';
export type AccountType = 'PERSONAL' | 'COMPANY';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  role: UserRole;
  accountType?: AccountType;
  companyId?: string;
  avatar?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  companyCode: string;
  companyAccessCredentialHash?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt?: string;
}

export interface CompanyLoginCredentials {
  companyCode: string;
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface OTPVerification {
  code: string;
  type: 'email' | 'phone';
  userId: string;
}

// --- Assets ---
export interface Asset {
  id: string;
  name: string;
  type: NodeType;
  ip: string;
  hostname: string;
  os?: string;
  location: string;
  status: AssetStatus;
  riskScore: number;
  vulnerabilities: number;
  criticalVulns: number;
  lastScan: string;
  owner: string;
  tags: string[];
  is_demo: boolean;
}

// --- Vulnerabilities ---
export interface Vulnerability {
  id: string;
  cveId: string;
  title: string;
  description: string;
  severity: Severity;
  cvssScore: number;
  epssScore: number;
  cisaKev: boolean;
  affectedAssets: string[];
  exploitAvailable: boolean;
  patchAvailable: boolean;
  discoveredAt: string;
  publishedAt: string;
  status: 'open' | 'in_progress' | 'patched' | 'accepted';
  is_demo: boolean;
}

// --- Network ---
export interface NetworkEvent {
  id: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: string;
  bytesIn: number;
  bytesOut: number;
  action: 'allow' | 'block' | 'alert';
  severity: Severity;
  signature?: string;
  timestamp: string;
  is_demo: boolean;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  ip: string;
  status: AssetStatus;
  x: number;
  y: number;
  connections: string[];
}

// --- IoT ---
export interface IoTDevice {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  firmware: string;
  ip: string;
  protocol: string;
  status: AssetStatus;
  lastSeen: string;
  anomalies: number;
  riskScore: number;
  is_demo: boolean;
}

// --- UEBA ---
export interface UEBAEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: string;
  riskScore: number;
  description: string;
  sourceIp: string;
  location: string;
  timestamp: string;
  baseline: string;
  deviation: string;
  is_demo: boolean;
}

// --- Incidents ---
export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  assignee: string;
  affectedAssets: string[];
  attackVector: string;
  mitreMapping: string[];
  timeline: IncidentTimelineEntry[];
  evidence: Evidence[];
  aiExplanation?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  is_demo: boolean;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface Evidence {
  id: string;
  type: 'log' | 'pcap' | 'screenshot' | 'file' | 'alert';
  name: string;
  description: string;
  timestamp: string;
}

// --- Attack Graph ---
export interface AttackGraphNode {
  id: string;
  label: string;
  type: NodeType;
  riskScore: number;
  status: AssetStatus;
  vulnerabilities: string[];
  position: { x: number; y: number };
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  attackType: string;
  probability: number;
}

// --- Digital Twin ---
export interface DigitalTwinNode {
  id: string;
  label: string;
  type: NodeType;
  status: AssetStatus;
  riskScore: number;
  position: { x: number; y: number; z?: number };
  metadata: Record<string, string>;
}

export interface DigitalTwinConnection {
  id: string;
  source: string;
  target: string;
  type: 'network' | 'dependency' | 'trust' | 'attack_path';
  strength: number;
}

// --- What-If / Simulation ---
export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  type: 'cve' | 'compromise' | 'account' | 'botnet' | 'phishing';
  targetAsset: string;
  steps: SimulationStep[];
  currentRisk: number;
  projectedRisk: number;
  affectedAssets: string[];
  criticalAssets: string[];
  blastRadius: number;
  is_demo: boolean;
}

export interface SimulationStep {
  id: string;
  order: number;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'complete';
  timestamp?: string;
  affectedNodes: string[];
}

// --- MITRE ATT&CK ---
export interface MitreTactic {
  id: string;
  name: string;
  description: string;
  techniques: MitreTechnique[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  description: string;
  detectionCount: number;
  severity: Severity;
}

// --- Detection Rules (Sigma) ---
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  source: string;
  status: 'active' | 'inactive' | 'testing';
  hits: number;
  lastTriggered?: string;
  rule: string;
  tags: string[];
  is_demo: boolean;
}

// --- SOAR ---
export interface Playbook {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: PlaybookStep[];
  executions: number;
  avgDuration: string;
  status: 'active' | 'inactive' | 'draft';
  is_demo: boolean;
}

export interface PlaybookStep {
  id: string;
  name: string;
  action: string;
  order: number;
  status: 'pending' | 'running' | 'success' | 'failed';
}

// --- AI ---
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: AISource[];
  isStreaming?: boolean;
}

export interface AISource {
  title: string;
  type: 'incident' | 'vulnerability' | 'asset' | 'rule' | 'knowledge';
  relevance: number;
}

// --- Notifications ---
export interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  eventId: string;
  timestamp: string;
  is_demo: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  criticalCve: boolean;
  incidents: boolean;
  ueba: boolean;
  iot: boolean;
  phishing: boolean;
  dailySummary: boolean;
}

// --- Analytics ---
export interface AnalyticsData {
  securityScore: number;
  totalAssets: number;
  criticalAssets: number;
  totalVulnerabilities: number;
  criticalVulns: number;
  highVulns: number;
  activeIncidents: number;
  resolvedIncidents: number;
  threatsByType: { type: string; count: number }[];
  riskTrend: { date: string; score: number }[];
  topRiskyAssets: Asset[];
  detectionsBySource: { source: string; count: number }[];
}

// --- Reports ---
export interface Report {
  id: string;
  title: string;
  type: 'executive' | 'technical' | 'compliance' | 'incident';
  generatedAt: string;
  period: string;
  status: 'generating' | 'ready' | 'failed';
  summary: string;
}

// --- Threat Feed ---
export interface ThreatFeedItem {
  id: string;
  type: ThreatType;
  title: string;
  description: string;
  severity: Severity;
  sourceIp?: string;
  targetAsset?: string;
  region: string;
  timestamp: string;
  indicator: string;
  is_demo: boolean;
}

// --- Globe / Map ---
export interface GlobeNode {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'attack' | 'safe' | 'warning';
  details: string;
  severity?: Severity;
}

export interface GlobeConnection {
  source: GlobeNode;
  target: GlobeNode;
  type: 'attack' | 'data' | 'warning';
}

// --- Presentation ---
export interface PresentationMetrics {
  securityRisk: number;
  activeIncidents: number;
  affectedAssets: number;
  attackPaths: number;
  iotAnomalies: number;
  uebaAnomalies: number;
}

// --- Service Interfaces ---
export interface IAuthService {
  login(credentials: LoginCredentials): Promise<{ user: User; token: string }>;
  signup(data: SignupData): Promise<{ user: User; token: string }>;
  verifyOTP(verification: OTPVerification): Promise<boolean>;
  logout(): Promise<void>;
  getProfile(): Promise<User>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
}

export interface IAssetService {
  getAssets(): Promise<Asset[]>;
  getAssetById(id: string): Promise<Asset>;
  getAssetsByStatus(status: AssetStatus): Promise<Asset[]>;
  searchAssets(query: string): Promise<Asset[]>;
}

export interface IVulnerabilityService {
  getVulnerabilities(): Promise<Vulnerability[]>;
  getVulnerabilityById(id: string): Promise<Vulnerability>;
  getVulnerabilityByCVE(cveId: string): Promise<Vulnerability>;
  getCriticalVulnerabilities(): Promise<Vulnerability[]>;
}

export interface INetworkService {
  getNetworkEvents(): Promise<NetworkEvent[]>;
  getNetworkTopology(): Promise<{ nodes: NetworkNode[]; }>;
  getNetworkAlerts(): Promise<NetworkEvent[]>;
}

export interface IIoTService {
  getDevices(): Promise<IoTDevice[]>;
  getDeviceById(id: string): Promise<IoTDevice>;
  getAnomalies(): Promise<IoTDevice[]>;
  getMLHealth(): Promise<any>;
  analyzeTelemetry(payload: any): Promise<any>;
}

export interface IUEBAService {
  getEvents(): Promise<UEBAEvent[]>;
  getAnomalies(): Promise<UEBAEvent[]>;
  getUserRiskProfile(userId: string): Promise<UEBAEvent[]>;
}

export interface IIncidentService {
  getIncidents(): Promise<Incident[]>;
  getIncidentById(id: string): Promise<Incident>;
  createIncident(data: Partial<Incident>): Promise<Incident>;
  updateIncident(id: string, data: Partial<Incident>): Promise<Incident>;
}

export interface IAttackGraphService {
  getGraph(): Promise<{ nodes: AttackGraphNode[]; edges: AttackGraphEdge[] }>;
  getPathsForAsset(assetId: string): Promise<AttackGraphEdge[]>;
}

export interface IDigitalTwinService {
  getNodes(): Promise<DigitalTwinNode[]>;
  getConnections(): Promise<DigitalTwinConnection[]>;
  getNodeDetails(id: string): Promise<DigitalTwinNode>;
}

export interface ISimulationService {
  getScenarios(): Promise<SimulationScenario[]>;
  runSimulation(scenarioId: string): Promise<SimulationScenario>;
  getBlastRadius(scenarioId: string): Promise<{ assets: string[]; radius: number }>;
}

export interface INotificationService {
  getNotifications(): Promise<SecurityNotification[]>;
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  sendTestNotification(channel: NotificationChannel): Promise<void>;
}

export interface IAIService {
  sendMessage(message: string, context?: string): Promise<AIMessage>;
  getSuggestedPrompts(): Promise<string[]>;
  getInsights(): Promise<AIMessage[]>;
}

export interface IReportService {
  getReports(): Promise<Report[]>;
  generateReport(type: Report['type']): Promise<Report>;
}

// --- Multi-Company & Employee Management ---
export interface CompanyUser {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  mfaEnabled: boolean;
  lastLogin: string;
  createdAt: string;
}

export interface EmployeeInvite {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN';
  department: string;
  token: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
}

export interface CompanyProfile {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  securityContact: string;
  createdAt: string;
  totalEmployees: number;
  totalAssets: number;
  securityScore: number;
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  timestamp: string;
  severity: Severity;
}

// --- Website Security Assessment ---
export interface ObservableAsset {
  id: string;
  type: 'domain' | 'subdomain' | 'ip' | 'service' | 'technology' | 'certificate' | 'endpoint';
  name: string;
  target: string;
  details: string;
  port?: number;
  protocol?: string;
  exposure: 'PUBLIC' | 'RESTRICTED' | 'INTERNAL';
  discoveredAt: string;
}

export interface WebsiteScanCheck {
  id: string;
  name: string;
  category: 'HTTPS' | 'TLS' | 'CERTIFICATE' | 'HEADERS' | 'DNS' | 'REDIRECTS' | 'COOKIES' | 'PHISHING';
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
}

export interface WebsiteFinding {
  id: string;
  severity: Severity;
  title: string;
  whatIsWrong: string;
  whyItMatters: string;
  affectedTarget: string;
  evidence?: string;
  recommendedFix: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  source: 'SCANNER' | 'VULNERABILITY' | 'ATTACK_SURFACE';
}

export interface WebsiteAssessment {
  id: string;
  targetUrl: string;
  domain: string;
  status: 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  totalObservableAssets: number;
  subdomainsCount: number;
  servicesCount: number;
  technologiesCount: number;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  checksCount: {
    total: number;
    passed: number;
    findings: number;
  };
  observableAssets: ObservableAsset[];
  vulnerabilities: Vulnerability[];
  checks: WebsiteScanCheck[];
  findings: WebsiteFinding[];
  recommendations: string[];
  isDemo: boolean;
}

// --- Personal Cyber Safety ---
export interface FraudCallResult {
  phoneNumber: string;
  riskLevel: 'SAFE' | 'UNKNOWN' | 'SUSPICIOUS' | 'HIGH_RISK';
  reportedNumber: string;
  reportCount: number;
  reason: string;
  recommendedAction: string;
  isDemo: boolean;
}

export interface OTPScamAnalysis {
  id: string;
  inputMessage: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
  safetySteps: string[];
  recommendedAction: string;
  isDemo: boolean;
}

export interface URLCheckResult {
  url: string;
  domain: string;
  verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' | 'UNKNOWN';
  httpsValid: boolean;
  certificateStatus: string;
  redirectChain: string[];
  domainReputationScore: number;
  phishingIndicators: string[];
  reason: string;
  recommendedAction: string;
  isDemo: boolean;
}

export interface DeviceSecurityCheckItem {
  id: string;
  category: string;
  name: string;
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
  details: string;
  recommendedFix?: string;
}

export interface DeviceSecurityAudit {
  overallStatus: 'SECURE' | 'NEEDS_ATTENTION' | 'HIGH_RISK';
  score: number;
  checks: DeviceSecurityCheckItem[];
  lastAuditDate: string;
  isDemo: boolean;
}

// --- Academy & Training ---
export interface AcademyCourse {
  id: string;
  title: string;
  description: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  category: 'PERSONAL' | 'EMPLOYEE' | 'ENTERPRISE';
  duration: string;
  lessonsCount: number;
  completedLessons: number;
  quizScore?: number;
  isCompleted: boolean;
  badge?: string;
}

// --- Additional Service Interfaces ---
export interface ICompanyService {
  getCompanyProfile(companyId: string): Promise<CompanyProfile>;
  updateCompanyProfile(companyId: string, data: Partial<CompanyProfile>): Promise<CompanyProfile>;
  getAuditLogs(companyId: string): Promise<AuditLogEntry[]>;
}

export interface IEmployeeService {
  getEmployees(companyId: string): Promise<CompanyUser[]>;
  inviteEmployee(invite: Omit<EmployeeInvite, 'id' | 'token' | 'status' | 'expiresAt'>): Promise<EmployeeInvite>;
  updateEmployeeRole(id: string, role: 'ADMIN' | 'EMPLOYEE', department?: string): Promise<void>;
  deactivateEmployee(id: string): Promise<void>;
}

export interface IPermissionService {
  canAccessRoute(role: UserRole, pathname: string, companyId?: string): boolean;
  hasPermission(role: UserRole, permission: string): boolean;
  validateTenantAccess(authenticatedCompanyId?: string, targetResourceCompanyId?: string): boolean;
}

export interface IWebsiteAssessmentService {
  analyzeWebsite(targetUrl: string): Promise<WebsiteAssessment>;
  getWebsiteAssessment(id: string): Promise<WebsiteAssessment>;
  getWebsiteAttackSurface(id: string): Promise<ObservableAsset[]>;
  getWebsiteVulnerabilities(id: string): Promise<Vulnerability[]>;
  getWebsiteScanResults(id: string): Promise<{ checks: WebsiteScanCheck[]; findings: WebsiteFinding[] }>;
  getWebsiteHistory(): Promise<WebsiteAssessment[]>;
  exportWebsiteReport(id: string, format: 'PDF' | 'CSV' | 'JSON'): Promise<string>;
}

export interface IFraudCallService {
  checkPhoneNumber(phoneNumber: string): Promise<FraudCallResult>;
}

export interface IUrlSafetyService {
  checkUrl(url: string): Promise<URLCheckResult>;
  getSecurityHistory?(limit?: number): Promise<any[]>;
}


export interface IDeviceSecurityService {
  getDeviceAudit(): Promise<DeviceSecurityAudit>;
}

export interface IAcademyService {
  getCourses(category?: 'PERSONAL' | 'EMPLOYEE' | 'ENTERPRISE'): Promise<AcademyCourse[]>;
  submitQuiz(courseId: string, answers: number[]): Promise<{ score: number; passed: boolean }>;
}

// ============================================================
// SECURITY AWARENESS & PHISHING SIMULATION TYPES
// ============================================================
export type SimulationType =
  | 'Phishing Email'
  | 'Security Alert Simulation'
  | 'Password Reset Simulation'
  | 'Account Verification Simulation'
  | 'Fake IT Support Message'
  | 'Suspicious SMS Simulation'
  | 'Social Engineering Simulation';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type SimulationDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type SimulationChannel = 'email' | 'sms' | 'in_app' | 'both';

export interface SecurityAwarenessTemplate {
  id: string;
  name: string;
  subject: string;
  sender: string;
  body: string;
  channel: SimulationChannel;
  simulationType: SimulationType;
  difficulty: SimulationDifficulty;
  warningSigns: string[];
  recommendedCourseId: string;
  recommendedCourseTitle: string;
  is_simulation: true;
}

export interface SecurityAwarenessCampaign {
  id: string;
  name: string;
  description: string;
  simulationType: SimulationType;
  difficulty: SimulationDifficulty;
  deliveryChannel: SimulationChannel;
  schedule: string;
  status: CampaignStatus;
  templateId: string;
  templateName?: string;
  targetEmployees: string[]; // employee user IDs or 'ALL'
  trainingPageId: string;
  is_simulation: true;
  totalTargeted: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  reportedCount: number;
  ignoredCount: number;
  trainingCompletedCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  companyId?: string;
}

export interface SecurityAwarenessEvent {
  id: string;
  campaignId: string;
  campaignName: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  eventType: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'REPORTED' | 'IGNORED' | 'TRAINING_VIEWED' | 'TRAINING_COMPLETED';
  timestamp: string;
  is_simulation: true;
  demo_session_id?: string;
}

export interface EmployeeAwarenessResult {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  awarenessScore: number; // 0 - 100
  totalSimulations: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  reportedCount: number;
  trainingCompletedCount: number;
  strengths: string[];
  needsImprovement: string[];
  recentResults: Array<{
    campaignId: string;
    campaignName: string;
    simulationType: SimulationType;
    action: 'CLICKED' | 'REPORTED' | 'IGNORED' | 'TRAINING_COMPLETED';
    date: string;
    warningSigns: string[];
    recommendedCourseTitle: string;
    recommendedCourseId: string;
  }>;
}

export interface CampaignAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalEmployeesTargeted: number;
  overallDeliveryRate: number;
  overallOpenRate: number;
  overallClickRate: number;
  overallReportRate: number;
  overallTrainingCompletionRate: number;
  averageAwarenessScore: number;
  departmentScores: Array<{
    department: string;
    employeeCount: number;
    awarenessScore: number;
    clickRate: number;
    reportRate: number;
  }>;
  simulationTypeBreakdown: Array<{
    type: SimulationType;
    count: number;
    clickedRate: number;
    reportRate: number;
  }>;
}

export interface TrainingRecommendation {
  employeeId: string;
  courseId: string;
  courseTitle: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'EMPLOYEE' | 'ENTERPRISE';
  basedOnCampaign: string;
}

// ============================================================
// CONTEXTUAL RISK ENGINE TYPES
// ============================================================
export interface RiskFactor {
  name: string;
  weight: number; // 0.0 - 1.0
  contribution: number; // 0 - 100
  description: string;
  severity: Severity;
}

export interface ContextualRiskAssessment {
  overallRisk: number; // 0 - 100
  projectedRisk?: number;
  riskChange: number;
  level: RiskLevel;
  factors: RiskFactor[];
  assetCriticalityImpact: number;
  vulnerabilityImpact: number;
  detectionSignalsImpact: number;
  userBehaviorImpact: number;
  networkActivityImpact: number;
  attackPathImpact: number;
  exposureImpact: number;
  timestamp: string;
}

// ============================================================
// NOTIFICATION ENGINE LOGS & DAILY LIMITS
// ============================================================
export interface NotificationLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  eventId: string;
  eventTitle: string;
  eventType: 'CRITICAL_CVE' | 'HIGH_RISK_LOGIN' | 'UEBA_ANOMALY' | 'CRITICAL_ASSET_EXPOSURE' | 'PHISHING_RESULT' | 'INCIDENT' | 'ATTACK_SIMULATION' | 'SECURITY_REPORT' | 'OTP';
  channel: NotificationChannel;
  status: 'DELIVERED' | 'SUPPRESSED' | 'FAILED' | 'PENDING';
  suppressionReason?: string;
  timestamp: string;
  isOTP: boolean;
  isSimulation: boolean;
}

export interface DailyLimitRecord {
  userId: string;
  dateKey: string; // YYYY-MM-DD
  automaticNotificationSentCount: number;
  lastSentTimestamp?: string;
  suppressedEventsCount: number;
}

// ============================================================
// WHAT-IF ATTACK PROPAGATION & DIGITAL TWIN SYNC
// ============================================================
export interface ActiveSimulationState {
  simulationId: string;
  scenarioId: string;
  scenarioName: string;
  targetAsset: string;
  status: 'IDLE' | 'SIMULATING' | 'COMPLETED' | 'RESET';
  currentStep: number;
  compromisedNodeIds: string[];
  affectedNodeIds: string[];
  activeAttackPathIds: string[];
  initialRisk: number;
  currentRisk: number;
  projectedRisk: number;
  blastRadius: number;
  compromisedCredentials: string[];
  exposedDatabases: string[];
  timestamp: string;
}

export interface IPhishingSimulationService {
  getCampaigns(): Promise<SecurityAwarenessCampaign[]>;
  getCampaignById(id: string): Promise<SecurityAwarenessCampaign>;
  createCampaign(campaign: Omit<SecurityAwarenessCampaign, 'id' | 'createdAt' | 'updatedAt' | 'totalTargeted' | 'deliveredCount' | 'openedCount' | 'clickedCount' | 'reportedCount' | 'ignoredCount' | 'trainingCompletedCount'>): Promise<SecurityAwarenessCampaign>;
  updateCampaign(id: string, updates: Partial<SecurityAwarenessCampaign>): Promise<SecurityAwarenessCampaign>;
  launchCampaign(id: string): Promise<SecurityAwarenessCampaign>;
  pauseCampaign(id: string): Promise<SecurityAwarenessCampaign>;
  stopCampaign(id: string): Promise<SecurityAwarenessCampaign>;
  archiveCampaign(id: string): Promise<SecurityAwarenessCampaign>;
  getTemplates(): Promise<SecurityAwarenessTemplate[]>;
  getEmployeeResults(viewerRole: UserRole, viewerId: string, department?: string): Promise<EmployeeAwarenessResult[]>;
  getEmployeeResultById(employeeId: string): Promise<EmployeeAwarenessResult | null>;
  recordSimulationEvent(event: Omit<SecurityAwarenessEvent, 'id' | 'timestamp'>): Promise<SecurityAwarenessEvent>;
  getAnalytics(): Promise<CampaignAnalytics>;
  getRecommendations(): Promise<TrainingRecommendation[]>;
}

export interface IContextualRiskService {
  calculateRisk(): Promise<ContextualRiskAssessment>;
  simulateRiskIncrease(factorImpacts: Partial<Record<string, number>>): Promise<ContextualRiskAssessment>;
}

// ============================================================
// SECURITY SIMULATION LAB & STATE MACHINE TYPES
// ============================================================
export type SecurityState = 'NORMAL' | 'SUSPICIOUS' | 'WARNING' | 'ALERT' | 'BLOCKED';
export type SecuritySensitivity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SecurityStateTransition {
  id: string;
  timestamp: string;
  previousState: SecurityState;
  newState: SecurityState;
  triggerEvent: string;
  riskScore: number;
  simulationId: string;
  reason: string;
}

export interface SecuritySimulationEvent {
  id: string;
  simulationId: string;
  timestamp: string;
  source: string;
  target: string;
  eventType: string;
  severity: Severity;
  riskContribution: number;
  stateBefore: SecurityState;
  stateAfter: SecurityState;
  evidence: string;
  actionTaken?: string;
}

export interface IPManagementEntry {
  ip: string;
  status: 'ALLOWED' | 'MONITORED' | 'BLOCKED';
  threatScore: number;
  eventsCount: number;
  country: string;
  lastSeen: string;
  reason?: string;
}

export interface DefenseStrategyComparison {
  name: string;
  risk: number;
  affectedAssets: number;
  attackPaths: number;
  blastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
  responseTime: string;
  containmentSuccess: boolean;
}

export interface SimulationLabState {
  simulationId: string;
  scenarioName: string;
  attackerType: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  sensitivity: SecuritySensitivity;
  currentState: SecurityState;
  currentRisk: number;
  detectionTime?: string;
  responseTime?: string;
  containmentTime?: string;
  events: SecuritySimulationEvent[];
  transitions: SecurityStateTransition[];
  activeBlockedIPs: string[];
  automatedDefensesTriggered: string[];
  playbackSpeed: 1 | 2 | 4;
  currentTimeIndex: number;
}

// ============================================================
// HUMAN BEHAVIOR LAB TYPES
// ============================================================
export type HumanBehaviorChoice = 'OPEN_LINK' | 'VERIFY_SENDER' | 'REPORT' | 'IGNORE';
export type BehaviorPatternType =
  | 'CAUTIOUS'
  | 'IMPROVING'
  | 'CLICK-PRONE'
  | 'URGENCY-SENSITIVE'
  | 'AUTHORITY-SENSITIVE'
  | 'REPORTING-ORIENTED';

export interface HumanBehaviorScenario {
  id: string;
  title: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'call' | 'portal';
  sender: string;
  subject?: string;
  messageBody: string;
  warningSigns: string[];
  safeAction: HumanBehaviorChoice;
  riskImpact: number;
  explanation: string;
  recommendedTrainingId: string;
  recommendedTrainingTitle: string;
}

export interface HumanBehaviorSession {
  sessionId: string;
  employeeId: string;
  employeeName: string;
  trustMeterScore: number; // 0 - 100
  humanRiskScore: number; // 0 - 100
  decisionsCount: number;
  patternClassification: BehaviorPatternType;
  achievements: string[];
  lastDecision?: {
    scenarioId: string;
    choice: HumanBehaviorChoice;
    result: string;
    warningSigns: string[];
    recommendedCourse: string;
  };
}

