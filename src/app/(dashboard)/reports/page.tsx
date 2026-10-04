// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/ui';
import { FileText, Download, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { reportService } from '@/services';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      try {
        setIsLoading(true);
        const data = await reportService.getReports();
        if (mounted) {
          setReports(data || []);
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadReports();
    return () => { mounted = false; };
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const newReport = await reportService.generateReport('EXECUTIVE');
      setReports(prev => [newReport, ...prev]);
      setDownloadNotice('New Executive Security Report successfully compiled and registered.');
      setTimeout(() => setDownloadNotice(null), 3500);
    } catch (err) {
      console.error('Report compilation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (report: any, format: string) => {
    setDownloadNotice(`Downloading ${report.title} (${format})...`);
    const token = typeof window !== 'undefined' ? localStorage.getItem('cyberdome_token') : '';
    // Download directly via window open or link
    const downloadUrl = `/api/v1/reports/${report.id}/download?format=${format.toLowerCase()}`;
    window.open(downloadUrl, '_blank');
    setTimeout(() => setDownloadNotice(null), 2500);
  };

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Security Reports & Compliance
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Generate executive compliance summaries, technical CVE audit logs, and perimeter exposure reports.
          </p>
        </div>

        <button
          onClick={generateReport}
          disabled={generating}
          className="btn btn-primary btn-md">
          <Plus size={16} />
          <span>{generating ? 'Compiling Report...' : 'Generate New Report'}</span>
        </button>
      </div>

      {downloadNotice && (
        <div style={{
          backgroundColor: 'var(--color-success-bg, rgba(0, 232, 135, 0.1))',
          border: '1px solid var(--color-success-border, rgba(0, 232, 135, 0.3))',
          borderRadius: 8,
          padding: '12px 18px',
          marginBottom: 20,
          color: 'var(--color-success, #00E887)',
          fontSize: 13.5,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <CheckCircle2 size={16} />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Reports List Card */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            Available Compliance & Audit Reports
          </h3>
        </div>

        {isLoading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading reports inventory from database...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={44} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <h4 style={{ fontFamily: 'var(--font-heading)', marginBottom: 6 }}>No Reports Generated Yet</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 450, margin: '0 auto 16px auto' }}>
              Compile your first security compliance or executive report based on real telemetry and vulnerability scans.
            </p>
            <button onClick={generateReport} disabled={generating} className="btn btn-primary btn-sm">
              Generate Executive Report
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {reports.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: '20px 24px',
                  borderBottom: i < reports.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  backgroundColor: 'var(--bg-surface)'
                }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-info">{(r.type || 'EXECUTIVE').toUpperCase()}</span>
                      <span className="badge badge-safe">{(r.status || 'COMPLETED').toUpperCase()}</span>
                    </div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {r.title}
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 640 }}>
                      Compiled audit report based on active assets, vulnerability telemetry, and compliance status.
                    </p>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Report ID: <strong style={{ color: 'var(--text-primary)' }}>{r.id.slice(0, 8)}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => handleDownload(r, 'JSON')}
                    className="btn btn-secondary btn-sm">
                    <Download size={14} />
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => handleDownload(r, 'CSV')}
                    className="btn btn-secondary btn-sm">
                    <Download size={14} />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
