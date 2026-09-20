'use client';

import React, { useEffect, useState, use } from 'react';
import { useApp } from '../../../../lib/app-context';
import { S, fmtDate } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { IpRule } from '../../../../lib/types';

export default function IpBlockPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session } = useApp();
  const [rules, setRules] = useState<IpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [ip, setIp] = useState('196.118.93.179');
  const [duration, setDuration] = useState('24');
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState('Example block rule');

  const fetchRules = async () => {
    try {
      const res = await apiCall<{ rules: IpRule[] }>(`/api/rules?storeId=${storeId}`, 'GET', undefined, session);
      setRules(res.rules || []);
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [storeId, session]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiCall('/api/rules', 'POST', {
        storeId,
        ip,
        enabled,
        durationHours: duration === 'permanent' ? null : Number(duration),
        note,
      }, session);
      setMsg({ text: `Added IP rule for ${ip}`, type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleToggle = async (rule: IpRule) => {
    try {
      await apiCall(`/api/rules/${rule.id}`, 'PATCH', { enabled: !rule.enabled }, session);
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleDelete = async (rule: IpRule) => {
    if (!window.confirm(`Delete rule for ${rule.ip}?`)) return;
    try {
      await apiCall(`/api/rules/${rule.id}`, 'DELETE', undefined, session);
      setMsg({ text: `Deleted IP rule ${rule.ip}`, type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const isRuleActive = (rule: IpRule) => {
    if (!rule.enabled) return false;
    const t = Date.now();
    if (rule.starts_at && new Date(rule.starts_at).getTime() > t) return false;
    if (rule.expires_at && new Date(rule.expires_at).getTime() <= t) return false;
    return true;
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🛡️ IP Block Management</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Manage client-side visual IP restrictions for this specific store.
        </p>
      </div>

      <div style={{ ...S.warning, marginBottom: 20 }}>
        ⚠️ <strong>Important Security Caveat:</strong> IP protection runs via browser-side visual restriction. It prevents normal visitors from interacting with the storefront, but determined users can bypass JavaScript. Real edge network blocking requires a server proxy layer.
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {/* Form */}
      <form onSubmit={handleAddRule} style={{ ...S.card, marginBottom: 24, display: 'grid', gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Add IP Block Rule</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <label style={S.label}>IP Address</label>
            <input
              type="text"
              required
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 196.118.93.179"
              style={S.input}
            />
          </div>

          <div>
            <label style={S.label}>Block Duration</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={S.input}>
              <option value="1">1 hour</option>
              <option value="24">24 hours</option>
              <option value="168">7 days</option>
              <option value="720">30 days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>

          <div>
            <label style={S.label}>Reason / Note</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Fraudulent order attempt"
              style={S.input}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            Enable rule immediately
          </label>

          <button style={{ ...S.btn, ...S.btnPrimary }}>+ Save IP Rule</button>
        </div>
      </form>

      {/* Rules List */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Configured IP Rules ({rules.length})</h3>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading IP Rules...</div>
        ) : rules.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No IP block rules created yet for this store.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rules.map(rule => {
              const active = isRuleActive(rule);

              return (
                <div
                  key={rule.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15, fontFamily: 'monospace' }}>{rule.ip}</strong>
                      <span
                        style={{
                          ...S.badge,
                          background: active ? '#fee2e2' : '#f1f5f9',
                          color: active ? '#b91c1c' : '#64748b',
                        }}
                      >
                        {active ? 'Blocking Active' : 'Inactive / Expired'}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Created: {fmtDate(rule.created_at)} · Expires: {fmtDate(rule.expires_at)}
                    </div>
                    {rule.note && (
                      <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>Note: {rule.note}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleToggle(rule)}
                      style={{
                        ...S.btn,
                        background: rule.enabled ? '#64748b' : '#16a34a',
                        color: '#fff',
                        fontSize: 13,
                      }}
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      onClick={() => handleDelete(rule)}
                      style={{ ...S.btn, ...S.btnDanger, fontSize: 13 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
