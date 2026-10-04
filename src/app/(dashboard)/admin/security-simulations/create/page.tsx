// @ts-nocheck
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Save, Send } from 'lucide-react';

export default function CreateSimulationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Email Simulation',
    targets: '',
    scenario: 'Suspicious Link',
    subject: '',
    message: '',
    trackingDelivered: true,
    trackingOpened: true,
    trackingClicked: true,
    trackingReported: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const getAuthHeader = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cyberdome_token');
      if (token) return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (action) => {
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`${API_BASE}/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ ...formData, action })
      });

      if (response.ok) {
        setSuccess('Simulation created successfully!');
        setTimeout(() => {
          router.push('/admin/security-simulations');
        }, 1500);
      } else {
        setError('Failed to create simulation.');
      }
    } catch (err) {
      setError('An error occurred while creating the simulation.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2rem' }}>Create Security Simulation</h1>
      
      {error && <div style={{ padding: '1rem', backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)', border: '1px solid var(--color-critical-border)', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div style={{ padding: '1rem', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>{success}</div>}

      <div className="cyber-card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Simulation Name</label>
          <input className="cyber-input" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Quarterly Security Awareness" style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '0.25rem', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Simulation Type</label>
          <select className="cyber-input" name="type" value={formData.type} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '0.25rem', color: 'var(--text-primary)' }}>
            <option>Email Simulation</option>
            <option>Message Simulation</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Target Employees</label>
          <input className="cyber-input" type="text" name="targets" value={formData.targets} onChange={handleChange} placeholder="Select employees..." style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '0.25rem', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Scenario</label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {['Suspicious Link', 'Credential Safety', 'Urgent Request', 'Attachment Awareness'].map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input type="radio" name="scenario" value={s} checked={formData.scenario === s} onChange={handleChange} />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Subject</label>
          <input className="cyber-input" type="text" name="subject" value={formData.subject} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '0.25rem', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Message</label>
          <textarea className="cyber-input" name="message" value={formData.message} onChange={handleChange} rows={5} style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '0.25rem', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Tracking</label>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" name="trackingDelivered" checked={formData.trackingDelivered} onChange={handleChange} /> Delivered
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" name="trackingOpened" checked={formData.trackingOpened} onChange={handleChange} /> Opened
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" name="trackingClicked" checked={formData.trackingClicked} onChange={handleChange} /> Link Clicked
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" name="trackingReported" checked={formData.trackingReported} onChange={handleChange} /> Reported
            </label>
          </div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
          <ShieldAlert size={24} style={{ color: 'var(--color-warning)' }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}><strong>IMPORTANT:</strong> This is an authorized internal security-awareness simulation. No passwords or credentials will be collected.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="cyber-btn cyber-btn-secondary" onClick={() => handleSubmit('save')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Save size={18} /> Save Simulation
          </button>
          <button className="cyber-btn cyber-btn-primary" onClick={() => handleSubmit('send')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Send size={18} /> Send Simulation
          </button>
        </div>
      </div>
    </div>
  );
}
