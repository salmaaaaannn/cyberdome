// @ts-nocheck
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MessageSquare, ShieldAlert } from 'lucide-react';

export default function SimulationDetailPage({ params }) {
  const router = useRouter();
  const simulationId = params.simulationId;
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const getAuthHeader = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cyberdome_token');
      if (token) return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  useEffect(() => {
    const fetchSimulation = async () => {
      try {
        const response = await fetch(`${API_BASE}/simulations/${simulationId}`, {
          headers: getAuthHeader()
        });
        if (response.ok) {
          const data = await response.json();
          setSimulation(data);
        }
      } catch (error) {
        console.error('Error fetching simulation details:', error);
      } finally {
        setLoading(false);
      }
    };
    if (simulationId) {
      fetchSimulation();
    }
  }, [simulationId, API_BASE]);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>Loading simulation details...</div>;
  }

  if (!simulation) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--cyberx-red)', marginBottom: '1rem', display: 'inline-block' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Simulation not found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>The simulation you requested does not exist or you do not have permission to view it.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, marginBottom: '0.5rem' }}>{simulation.name || 'Simulation Details'}</h1>
          <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)' }}>
            <span><strong>Type:</strong> {simulation.type || 'N/A'}</span>
            <span><strong>Status:</strong> {simulation.status || 'N/A'}</span>
            <span><strong>Created At:</strong> {simulation.createdAt || 'N/A'}</span>
            <span><strong>Created By:</strong> {simulation.createdBy || 'N/A'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="cyber-btn cyber-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Mail size={18} /> Send Simulated Email
          </button>
          <button className="cyber-btn cyber-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <MessageSquare size={18} /> Send Simulated Message
          </button>
        </div>
      </div>

      <div className="cyber-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.25rem' }}>Recipients</h3>
        {simulation.recipients && simulation.recipients.length > 0 ? (
          <table className="cyber-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Recipient</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Email/ID</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Delivery Status</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Interactions</th>
              </tr>
            </thead>
            <tbody>
              {simulation.recipients.map((rec, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{rec.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{rec.identifier}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{rec.deliveryStatus}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{rec.interactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No recipient data available.</p>
        )}
      </div>
    </div>
  );
}
