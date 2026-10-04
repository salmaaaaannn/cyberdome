'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import {
  phishingSimulationService,
  academyService,
  companyService,
  permissionService,
} from '@/services';
import {
  SecurityAwarenessCampaign,
  SecurityAwarenessTemplate,
  EmployeeAwarenessResult,
  CampaignAnalytics,
  TrainingRecommendation,
  SimulationType,
  SimulationDifficulty,
  SimulationChannel,
} from '@/types';
import {
  ShieldAlert,
  Send,
  Plus,
  Play,
  Pause,
  Square,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Eye,
  MousePointerClick,
  Flag,
  Award,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Mail,
  MessageSquare,
  Lock,
  Smartphone,
  Check,
  X,
  FileText,
  UserCheck,
  TrendingUp,
} from 'lucide-react';

export default function SecurityAwarenessPhishingSimulationPage() {
  const { user } = useAppStore();
  const role = user?.role === 'NORMAL_USER' ? 'USER' : user?.role || 'USER';
  const isAdmin = role === 'ADMIN';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'campaigns' | 'create' | 'templates' | 'results' | 'analytics' | 'interactive'>(
    isAdmin ? 'campaigns' : 'results'
  );

  // Data state
  const [campaigns, setCampaigns] = useState<SecurityAwarenessCampaign[]>([]);
  const [templates, setTemplates] = useState<SecurityAwarenessTemplate[]>([]);
  const [employeeResults, setEmployeeResults] = useState<EmployeeAwarenessResult[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Campaign Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    simulationType: 'Phishing Email' as SimulationType,
    difficulty: 'MEDIUM' as SimulationDifficulty,
    deliveryChannel: 'email' as SimulationChannel,
    schedule: 'immediate',
    templateId: 'tmpl-001',
    trainingPageId: 'acad-p1',
    targetScope: 'ALL',
  });
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Interactive Live Simulation Test Modal
  const [activeSimModal, setActiveSimModal] = useState<SecurityAwarenessTemplate | null>(null);
  const [simChannelMode, setSimChannelMode] = useState<'email' | 'sms'>('email');
  const [simInteractedState, setSimInteractedState] = useState<'NONE' | 'CLICKED' | 'REPORTED' | 'TRAINING_DONE'>('NONE');
  const [simBannerMessage, setSimBannerMessage] = useState<string | null>(null);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      const [cList, tList, aData, rList, eResults] = await Promise.all([
        phishingSimulationService.getCampaigns(),
        phishingSimulationService.getTemplates(),
        phishingSimulationService.getAnalytics(),
        phishingSimulationService.getRecommendations(),
        phishingSimulationService.getEmployeeResults(role, user?.id || 'usr-emp-01'),
      ]);
      setCampaigns(cList);
      setTemplates(tList);
      setAnalytics(aData);
      setRecommendations(rList);
      setEmployeeResults(eResults);
    } catch (err) {
      console.error('Failed to load simulation data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, user?.id]);

  // Campaign lifecycle handlers
  const handleLaunch = async (id: string) => {
    try {
      await phishingSimulationService.launchCampaign(id);
      await loadData();
      setSimBannerMessage('Campaign successfully launched. Controlled simulations dispatched.');
      setTimeout(() => setSimBannerMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await phishingSimulationService.pauseCampaign(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = async (id: string) => {
    try {
      await phishingSimulationService.stopCampaign(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await phishingSimulationService.archiveCampaign(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Campaign submission
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Unauthorized: Only administrators and security managers can create simulation campaigns.');
      return;
    }

    setCreating(true);
    try {
      const selectedTemplate = templates.find((t) => t.id === formData.templateId);
      await phishingSimulationService.createCampaign({
        name: formData.name,
        description: formData.description,
        simulationType: formData.simulationType,
        difficulty: formData.difficulty,
        deliveryChannel: formData.deliveryChannel,
        schedule: formData.schedule === 'immediate' ? new Date().toISOString() : formData.schedule,
        status: 'DRAFT',
        templateId: formData.templateId,
        templateName: selectedTemplate?.name || 'Standard Verification',
        targetEmployees: formData.targetScope === 'ALL' ? ['ALL'] : ['usr-emp-01', 'usr-emp-2'],
        trainingPageId: formData.trainingPageId,
        is_simulation: true,
        createdBy: user?.name || 'Administrator',
      });

      setCreateSuccess(true);
      await loadData();
      setTimeout(() => {
        setCreateSuccess(false);
        setActiveTab('campaigns');
        setFormData({
          name: '',
          description: '',
          simulationType: 'Phishing Email',
          difficulty: 'MEDIUM',
          deliveryChannel: 'email',
          schedule: 'immediate',
          templateId: 'tmpl-001',
          trainingPageId: 'acad-p1',
          targetScope: 'ALL',
        });
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  // Safe Interactive Simulation Handlers
  const handleSimLinkClick = async () => {
    setSimInteractedState('CLICKED');
    if (activeSimModal && campaigns.length > 0) {
      await phishingSimulationService.recordSimulationEvent({
        campaignId: campaigns[0].id,
        campaignName: campaigns[0].name,
        employeeId: user?.id || 'usr-emp-01',
        employeeName: user?.name || 'Employee Test',
        employeeEmail: user?.email || 'employee@cybersafety.io',
        department: 'DevSecOps',
        eventType: 'CLICKED',
        is_simulation: true,
      });
      await loadData();
    }
  };

  const handleSimReportClick = async () => {
    setSimInteractedState('REPORTED');
    if (activeSimModal && campaigns.length > 0) {
      await phishingSimulationService.recordSimulationEvent({
        campaignId: campaigns[0].id,
        campaignName: campaigns[0].name,
        employeeId: user?.id || 'usr-emp-01',
        employeeName: user?.name || 'Employee Test',
        employeeEmail: user?.email || 'employee@cybersafety.io',
        department: 'DevSecOps',
        eventType: 'REPORTED',
        is_simulation: true,
      });
      await loadData();
    }
  };

  const handleSimCompleteTraining = async () => {
    setSimInteractedState('TRAINING_DONE');
    if (campaigns.length > 0) {
      await phishingSimulationService.recordSimulationEvent({
        campaignId: campaigns[0].id,
        campaignName: campaigns[0].name,
        employeeId: user?.id || 'usr-emp-01',
        employeeName: user?.name || 'Employee Test',
        employeeEmail: user?.email || 'employee@cybersafety.io',
        department: 'DevSecOps',
        eventType: 'TRAINING_COMPLETED',
        is_simulation: true,
      });
      await loadData();
    }
  };

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.simulationType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Simulation Banner Notification */}
      <AnimatePresence>
        {simBannerMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '12px 18px',
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info-border)',
              borderRadius: 8,
              color: 'var(--color-info)',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <Info size={18} />
            <span>{simBannerMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'rgba(217, 45, 32, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cyberdome-red)',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Security Awareness & Phishing Simulation
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Controlled simulations to test employee security behavior, identify training needs, and build organizational resilience.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action & Safety Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info-border)',
              color: 'var(--color-info)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <Lock size={14} />
            <span>Zero Credential Harvesting • Safe Simulation</span>
          </div>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 6,
                background: 'var(--cyberdome-red)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>Create Simulation</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveSimModal(templates[0] || null);
              setSimInteractedState('NONE');
              setSimChannelMode('email');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 6,
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={16} color="var(--cyberdome-red)" />
            <span>Test Simulation Demo</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {isAdmin && (
          <button
            onClick={() => setActiveTab('campaigns')}
            style={{
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'campaigns' ? 700 : 500,
              color: activeTab === 'campaigns' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
              borderBottom: activeTab === 'campaigns' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Send size={16} />
            <span>Campaigns ({campaigns.length})</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'create' ? 700 : 500,
              color: activeTab === 'create' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
              borderBottom: activeTab === 'create' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={16} />
            <span>Create Simulation</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'templates' ? 700 : 500,
              color: activeTab === 'templates' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
              borderBottom: activeTab === 'templates' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FileText size={16} />
            <span>Templates Library</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('results')}
          style={{
            padding: '10px 16px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'results' ? 700 : 500,
            color: activeTab === 'results' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
            borderBottom: activeTab === 'results' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <UserCheck size={16} />
          <span>{isAdmin ? 'Employee Results & Scores' : 'My Security Awareness Score'}</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'analytics' ? 700 : 500,
              color: activeTab === 'analytics' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
              borderBottom: activeTab === 'analytics' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <TrendingUp size={16} />
            <span>Campaign Analytics</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('interactive')}
          style={{
            padding: '10px 16px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'interactive' ? 700 : 500,
            color: activeTab === 'interactive' ? 'var(--cyberdome-red)' : 'var(--text-muted)',
            borderBottom: activeTab === 'interactive' ? '2px solid var(--cyberdome-red)' : '2px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={16} />
          <span>Live Interactive Sandbox</span>
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS (ADMIN ONLY) */}
      {activeTab === 'campaigns' && isAdmin && (
        <div>
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="white-card" style={{ padding: 18, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Targeted Employees</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>48</div>
              <div style={{ fontSize: '0.78rem', color: '#16B364', marginTop: 4 }}>100% simulated delivery</div>
            </div>

            <div className="white-card" style={{ padding: 18, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Click Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--cyberdome-red)', marginTop: 4 }}>{analytics?.overallClickRate || 10.4}%</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Simulated links opened</div>
            </div>

            <div className="white-card" style={{ padding: 18, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reporting Rate (Positive)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16B364', marginTop: 4 }}>{analytics?.overallReportRate || 74.2}%</div>
              <div style={{ fontSize: '0.78rem', color: '#16B364', marginTop: 4 }}>Reported to SOC</div>
            </div>

            <div className="white-card" style={{ padding: 18, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Training Completed</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0284C7', marginTop: 4 }}>{analytics?.overallTrainingCompletionRate || 85}%</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Completed warning review</div>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 450 }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search campaigns by name or simulation type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                    background: 'var(--bg-surface)',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
              {(['ALL', 'ACTIVE', 'COMPLETED', 'DRAFT', 'SCHEDULED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: `1px solid ${statusFilter === st ? 'var(--cyberdome-red)' : 'var(--border-subtle)'}`,
                    background: statusFilter === st ? 'var(--cyberdome-red)' : 'var(--bg-surface)',
                    color: statusFilter === st ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Campaign</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Type & Channel</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Delivered</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Clicked</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Reported</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Training Done</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((camp) => {
                  const clickPct = camp.deliveredCount ? Math.round((camp.clickedCount / camp.deliveredCount) * 100) : 0;
                  const reportPct = camp.deliveredCount ? Math.round((camp.reportedCount / camp.deliveredCount) * 100) : 0;

                  return (
                    <tr key={camp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{camp.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{camp.description}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{camp.simulationType}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {camp.deliveryChannel === 'email' ? <Mail size={12} /> : camp.deliveryChannel === 'sms' ? <Smartphone size={12} /> : <MessageSquare size={12} />}
                          <span style={{ textTransform: 'capitalize' }}>{camp.deliveryChannel}</span>
                          <span>•</span>
                          <span style={{ color: camp.difficulty === 'HARD' ? 'var(--cyberdome-red)' : camp.difficulty === 'MEDIUM' ? 'var(--color-warning)' : '#16B364' }}>
                            {camp.difficulty}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background:
                              camp.status === 'ACTIVE'
                                ? 'rgba(22, 179, 100, 0.12)'
                                : camp.status === 'COMPLETED'
                                ? 'rgba(2, 132, 199, 0.12)'
                                : camp.status === 'DRAFT'
                                ? 'rgba(102, 112, 133, 0.12)'
                                : 'rgba(247, 144, 9, 0.12)',
                            color:
                              camp.status === 'ACTIVE'
                                ? '#16B364'
                                : camp.status === 'COMPLETED'
                                ? '#0284C7'
                                : camp.status === 'DRAFT'
                                ? 'var(--text-secondary)'
                                : 'var(--color-warning)',
                          }}
                        >
                          {camp.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        {camp.deliveredCount} / {camp.totalTargeted}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: camp.clickedCount > 0 ? 'var(--cyberdome-red)' : 'var(--text-primary)' }}>
                          {camp.clickedCount} ({clickPct}%)
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: '#16B364' }}>
                          {camp.reportedCount} ({reportPct}%)
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={14} color="#0284C7" />
                          <span>{camp.trainingCompletedCount}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {camp.status === 'DRAFT' || camp.status === 'SCHEDULED' ? (
                            <button
                              onClick={() => handleLaunch(camp.id)}
                              title="Launch Simulation Campaign"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                border: '1px solid #16B364',
                                background: '#16B364',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Play size={12} /> Launch
                            </button>
                          ) : camp.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handlePause(camp.id)}
                              title="Pause Simulation"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                border: '1px solid var(--color-warning)',
                                background: 'var(--bg-surface)',
                                color: 'var(--color-warning)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Pause size={12} /> Pause
                            </button>
                          ) : null}

                          {camp.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleStop(camp.id)}
                              title="Conclude Campaign"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                            >
                              <Square size={12} />
                            </button>
                          )}

                          {camp.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleArchive(camp.id)}
                              title="Archive Campaign"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                            >
                              <Archive size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE SIMULATION (ADMIN ONLY) */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(217, 45, 32, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyberdome-red)' }}>
                <Plus size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Create Controlled Security Simulation</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Design safe, awareness-building simulations for internal employees. Credential harvesting is strictly prohibited.
                </p>
              </div>
            </div>

            {createSuccess && (
              <div style={{ padding: 14, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 6, color: 'var(--color-success)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={18} />
                <span>Simulation Campaign successfully created and queued as DRAFT.</span>
              </div>
            )}

            <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Campaign Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Campaign Name <span style={{ color: 'var(--cyberdome-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Executive Identity Verification Test"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Objective & Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Testing employee resilience against artificial urgency and lookalike domains before holiday season."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              {/* Grid: Type & Difficulty */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Simulation Type
                  </label>
                  <select
                    value={formData.simulationType}
                    onChange={(e) => setFormData({ ...formData, simulationType: e.target.value as SimulationType })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', background: 'var(--bg-surface)' }}
                  >
                    <option value="Phishing Email">Phishing Email</option>
                    <option value="Security Alert Simulation">Security Alert Simulation</option>
                    <option value="Password Reset Simulation">Password Reset Simulation</option>
                    <option value="Account Verification Simulation">Account Verification Simulation</option>
                    <option value="Fake IT Support Message">Fake IT Support Message</option>
                    <option value="Suspicious SMS Simulation">Suspicious SMS Simulation</option>
                    <option value="Social Engineering Simulation">Social Engineering Simulation</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as SimulationDifficulty })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', background: 'var(--bg-surface)' }}
                  >
                    <option value="EASY">Easy (Obvious warning signs, typos)</option>
                    <option value="MEDIUM">Medium (Urgent branding, generic greeting)</option>
                    <option value="HARD">Hard (Spear-phishing style, high fidelity)</option>
                  </select>
                </div>
              </div>

              {/* Grid: Delivery Channel & Target Scope */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Delivery Channel
                  </label>
                  <select
                    value={formData.deliveryChannel}
                    onChange={(e) => setFormData({ ...formData, deliveryChannel: e.target.value as SimulationChannel })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', background: 'var(--bg-surface)' }}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS (Mobile Text)</option>
                    <option value="in_app">In-App Notification</option>
                    <option value="both">Multi-channel (Email + SMS)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Target Employees
                  </label>
                  <select
                    value={formData.targetScope}
                    onChange={(e) => setFormData({ ...formData, targetScope: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.9rem', background: 'var(--bg-surface)' }}
                  >
                    <option value="ALL">All Authorized Employees (48 users)</option>
                    <option value="DEVOPS">DevSecOps & IT Staff (14 users)</option>
                    <option value="EXECUTIVE">Executive & Leadership (6 users)</option>
                    <option value="FINANCE">Finance & HR Department (8 users)</option>
                  </select>
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Choose Safe Simulation Template
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => setFormData({ ...formData, templateId: tmpl.id, trainingPageId: tmpl.recommendedCourseId })}
                      style={{
                        padding: 14,
                        borderRadius: 6,
                        border: formData.templateId === tmpl.id ? '2px solid var(--cyberdome-red)' : '1px solid var(--border-subtle)',
                        background: formData.templateId === tmpl.id ? 'var(--cyberdome-red-subtle)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{tmpl.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Subject: {tmpl.subject}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-info)', marginTop: 6 }}>Rec: {tmpl.recommendedCourseTitle}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety notice */}
              <div style={{ padding: 12, borderRadius: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Controlled Testing Guarantee:</strong> Every simulated message includes an internal <code>is_simulation = true</code> flag and connects directly to the Security Academy warning page upon click. Passwords or OTPs are never stored or requested.
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  style={{ padding: '9px 18px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '9px 22px', borderRadius: 6, border: 'none', background: 'var(--cyberdome-red)', color: 'var(--bg-surface)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {creating ? 'Creating Campaign...' : 'Save Draft Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES LIBRARY */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Approved Simulation Templates</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Standard safe templates curated to simulate real-world cyber threats without collecting sensitive information.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cyberdome-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {tmpl.simulationType}
                    </span>
                    <h4 style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700 }}>{tmpl.name}</h4>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: tmpl.difficulty === 'HARD' ? 'rgba(217, 45, 32, 0.1)' : tmpl.difficulty === 'MEDIUM' ? 'rgba(247, 144, 9, 0.1)' : 'rgba(22, 179, 100, 0.1)',
                      color: tmpl.difficulty === 'HARD' ? 'var(--cyberdome-red)' : tmpl.difficulty === 'MEDIUM' ? 'var(--color-warning)' : '#16B364',
                    }}
                  >
                    {tmpl.difficulty}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-subtle)', borderRadius: 6, padding: 12, border: '1px solid var(--border-subtle)', marginBottom: 14, fontSize: '0.8rem' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>From: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{tmpl.sender}</span></div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Subject: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tmpl.subject}</span></div>
                  <div style={{ color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: 6, fontStyle: 'italic' }}>
                    "{tmpl.body}"
                  </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Warning Signs Tested</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {tmpl.warningSigns.map((ws, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{ws}</li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Connected Course: <strong>{tmpl.recommendedCourseTitle}</strong>
                    </div>
                    <button
                      onClick={() => {
                        setActiveSimModal(tmpl);
                        setSimInteractedState('NONE');
                        setSimChannelMode(tmpl.channel === 'sms' ? 'sms' : 'email');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Preview & Test
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EMPLOYEE RESULTS & SCORES (PRIVACY-AWARE) */}
      {activeTab === 'results' && (
        <div>
          {/* Privacy Notice Banner */}
          <div style={{ padding: '12px 18px', background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 8, color: 'var(--color-info)', fontSize: '0.85rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={18} />
            <span>
              {isAdmin
                ? 'Administrator View: Organization-wide security awareness metrics. Individual employee results are strictly confidential.'
                : 'Employee Privacy View: You are viewing your personal security awareness metrics and recommended training.'}
            </span>
          </div>

          {/* Results Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {employeeResults.map((emp) => (
              <div key={emp.employeeId} className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emp.employeeName}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {emp.department} • {emp.employeeEmail}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: emp.awarenessScore >= 90 ? '#16B364' : emp.awarenessScore >= 75 ? '#0284C7' : 'var(--color-warning)',
                      }}
                    >
                      {emp.awarenessScore} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Awareness Score</div>
                  </div>
                </div>

                {/* Behavioral Counters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, background: 'var(--bg-subtle)', padding: 10, borderRadius: 6, marginBottom: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emp.totalSimulations}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Simulations</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cyberdome-red)' }}>{emp.clickedCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Clicks</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#16B364' }}>{emp.reportedCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Reported</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0284C7' }}>{emp.trainingCompletedCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Trained</div>
                  </div>
                </div>

                {/* Strengths */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16B364', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Key Strengths
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {emp.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Needs Improvement */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={12} /> Training Focus
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {emp.needsImprovement.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Academy Course */}
                <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Recommended: <strong>Phishing Awareness & Link Inspection</strong>
                  </div>
                  <Link
                    href="/academy"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--cyberdome-red)',
                      textDecoration: 'none',
                    }}
                  >
                    Open Academy <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CAMPAIGN ANALYTICS (ADMIN ONLY) */}
      {activeTab === 'analytics' && analytics && (
        <div>
          {/* Department Breakdown */}
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 22, marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>Department Awareness & Vulnerability Scores</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {analytics.departmentScores.map((dept) => (
                <div key={dept.department}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {dept.department} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({dept.employeeCount} members)</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: dept.awarenessScore >= 90 ? '#16B364' : 'var(--color-warning)' }}>
                      {dept.awarenessScore} / 100 Score • {dept.clickRate}% Click • {dept.reportRate}% Reported
                    </div>
                  </div>
                  <div style={{ height: 8, width: '100%', background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${dept.awarenessScore}%`,
                        background: dept.awarenessScore >= 90 ? '#16B364' : dept.awarenessScore >= 80 ? '#0284C7' : 'var(--color-warning)',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulation Type Trends */}
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 22 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>Susceptibility by Attack Vector</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Attack Lure</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Total Executions</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Click Rate (Susceptibility)</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Report Rate (Resilience)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.simulationTypeBreakdown.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{item.type}</td>
                    <td style={{ padding: '12px 14px' }}>{item.count} drills</td>
                    <td style={{ padding: '12px 14px', color: 'var(--cyberdome-red)', fontWeight: 600 }}>{item.clickedRate}%</td>
                    <td style={{ padding: '12px 14px', color: '#16B364', fontWeight: 600 }}>{item.reportRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: LIVE INTERACTIVE SANDBOX DEMO */}
      {activeTab === 'interactive' && (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="white-card" style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Sparkles size={20} color="var(--cyberdome-red)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Employee Simulation Experience Sandbox</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Experience the simulation workflow exactly as an employee would. Test clicking the simulated link to see the educational warning page, or click <strong>[ Report Suspicious Message ]</strong> to record a positive security behavior.
            </p>

            {/* Template Selector for Demo */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                Select Simulation Lure:
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveSimModal(t);
                      setSimInteractedState('NONE');
                      setSimChannelMode(t.channel === 'sms' ? 'sms' : 'email');
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: activeSimModal?.id === t.id ? '2px solid var(--cyberdome-red)' : '1px solid var(--border-subtle)',
                      background: activeSimModal?.id === t.id ? 'var(--cyberdome-red-subtle)' : 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Message Preview Card */}
            {activeSimModal && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-subtle)' }}>
                {/* Simulated Header */}
                <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--color-critical-bg)', color: 'var(--cyberdome-red)', borderRadius: 4, fontWeight: 700 }}>
                      SIMULATION
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                      From: <strong style={{ color: 'var(--text-primary)' }}>{activeSimModal.sender}</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivered to your corporate inbox</div>
                </div>

                {/* Message Body */}
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                    Subject: {activeSimModal.subject}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                    {activeSimModal.body}
                  </p>

                  {/* Actions inside email: Simulated Click vs Safe Report */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleSimLinkClick}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 6,
                        background: 'var(--cyberdome-red)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <MousePointerClick size={16} />
                      <span>Verify Account Now (Simulated Link)</span>
                    </button>

                    <button
                      onClick={handleSimReportClick}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 6,
                        background: '#16B364',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Flag size={16} />
                      <span>Report Suspicious Message</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Outcome Display */}
                <AnimatePresence>
                  {simInteractedState === 'REPORTED' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ padding: 20, background: 'var(--color-success-bg)', borderTop: '1px solid var(--color-success-border)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-success)', fontWeight: 700 }}>
                        <CheckCircle2 size={20} />
                        <span>Security Behavior Recognized: Positive Report Logged!</span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--color-success)' }}>
                        You spotted the warning signs and reported the simulated lure. Your employee awareness score has been increased by +10 points. Excellent vigilance!
                      </p>
                    </motion.div>
                  )}

                  {simInteractedState === 'CLICKED' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ padding: 20, background: 'var(--color-critical-bg)', borderTop: '1px solid var(--color-critical-border)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--cyberdome-red)', fontWeight: 700 }}>
                        <AlertTriangle size={20} />
                        <span>Security Simulation Warning Page: You Clicked a Simulated Link</span>
                      </div>
                      <p style={{ margin: '6px 0 12px', fontSize: '0.84rem', color: 'var(--color-critical)' }}>
                        This was a controlled corporate awareness drill. No credentials or personal details were collected.
                      </p>

                      <div style={{ background: 'var(--bg-surface)', borderRadius: 6, padding: 14, border: '1px solid var(--border-primary)', marginBottom: 14 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                          Warning Signs You Should Have Noticed:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {activeSimModal.warningSigns.map((ws, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>{ws}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#9F1239' }}>
                          Recommended Training: <strong>{activeSimModal.recommendedCourseTitle}</strong>
                        </div>
                        <button
                          onClick={handleSimCompleteTraining}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            background: '#0284C7',
                            color: '#FFFFFF',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Complete Brief Awareness Review ✓
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {simInteractedState === 'TRAINING_DONE' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ padding: 18, background: 'var(--color-info-bg)', borderTop: '1px solid var(--color-info-border)', color: 'var(--color-info)' }}
                    >
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GraduationCap size={18} />
                        <span>Remedial Review Completed!</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                        Thank you for reviewing the warning signs. Your awareness score has been refreshed.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
