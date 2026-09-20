'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../../../lib/app-context';
import { S, fmtDate } from '../../../lib/ui';
import { apiCall } from '../../../lib/api';
import type { IpRule, CustomerRule, CustomerRuleType } from '../../../lib/types';

type BlocklistTab = 'ip' | 'customer';

export default function BlocklistPage() {
  const { currentStore, session } = useApp();
  const [tab, setTab] = useState<BlocklistTab>('ip');
  const [ipRules, setIpRules] = useState<IpRule[]>([]);
  const [custRules, setCustRules] = useState<CustomerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // IP Form state
  const [ip, setIp] = useState('196.118.93.179');
  const [ipDuration, setIpDuration] = useState('24');
  const [ipNote, setIpNote] = useState('');

  // Customer Form state
  const [custType, setCustType] = useState<CustomerRuleType>('phone');
  const [custValue, setCustValue] = useState('');
  const [custReason, setCustReason] = useState('');

  const fetchRules = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const ipRes = await apiCall<{ rules: IpRule[] }>(`/api/rules?storeId=${currentStore.id}`, 'GET', undefined, session);
      setIpRules(ipRes.rules || []);

      const custRes = await apiCall<{ rules: CustomerRule[] }>(`/api/customer-rules?storeId=${currentStore.id}`, 'GET', undefined, session);
      setCustRules(custRes.rules || []);
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [currentStore?.id, session]);

  // IP Handlers
  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;
    setMsg(null);
    try {
      await apiCall('/api/rules', 'POST', {
        storeId: currentStore.id,
        ip,
        enabled: true,
        durationHours: ipDuration === 'permanent' ? null : Number(ipDuration),
        note: ipNote,
      }, session);
      setIp('');
      setIpNote('');
      setMsg({ text: `IP rule for ${ip} saved!`, type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleToggleIp = async (rule: IpRule) => {
    try {
      await apiCall(`/api/rules/${rule.id}`, 'PATCH', { enabled: !rule.enabled }, session);
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleDeleteIp = async (rule: IpRule) => {
    if (!window.confirm(`Delete IP rule for ${rule.ip}?`)) return;
    try {
      await apiCall(`/api/rules/${rule.id}`, 'DELETE', undefined, session);
      setMsg({ text: `Deleted IP rule ${rule.ip}`, type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  // Customer Handlers
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !custValue.trim()) return;
    setMsg(null);
    try {
      await apiCall('/api/customer-rules', 'POST', {
        storeId: currentStore.id,
        rule_type: custType,
        value: custValue,
        reason: custReason,
        enabled: true,
      }, session);
      setCustValue('');
      setCustReason('');
      setMsg({ text: 'Customer restriction rule saved!', type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleToggleCustomer = async (rule: CustomerRule) => {
    try {
      await apiCall(`/api/customer-rules/${rule.id}`, 'PATCH', { enabled: !rule.enabled }, session);
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleDeleteCustomer = async (rule: CustomerRule) => {
    if (!window.confirm(`Delete customer rule for ${rule.value}?`)) return;
    try {
      await apiCall(`/api/customer-rules/${rule.id}`, 'DELETE', undefined, session);
      setMsg({ text: 'Customer rule deleted', type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  if (!currentStore) {
    return (
      <div style={{ padding: 40, color: '#94a3b8' }}>
        Please select or connect a store to manage blocklist rules.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🛡️ Store Blocklist Control</h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
          Manage IP restrictions and customer information rules for <strong>{currentStore.name || currentStore.hostname}</strong>.
        </p>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', marginBottom: 24 }}>
        <button
          onClick={() => setTab('ip')}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: tab === 'ip' ? '#38bdf8' : '#94a3b8',
            borderBottom: tab === 'ip' ? '3px solid #38bdf8' : '3px solid transparent',
          }}
        >
          🌐 IP Addresses ({ipRules.length})
        </button>

        <button
          onClick={() => setTab('customer')}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: tab === 'customer' ? '#38bdf8' : '#94a3b8',
            borderBottom: tab === 'customer' ? '3px solid #38bdf8' : '3px solid transparent',
          }}
        >
          👤 Customer Information ({custRules.length})
        </button>
      </div>

      {/* Tab 1: IP Addresses */}
      {tab === 'ip' && (
        <div>
          {/* Add IP Form */}
          <form onSubmit={handleAddIp} style={{ ...S.card, background: '#0f172a', borderColor: '#1e293b', marginBottom: 24, display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>Add IP Block Rule</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ ...S.label, color: '#cbd5e1' }}>IP Address *</label>
                <input
                  type="text"
                  required
                  value={ip}
                  onChange={e => setIp(e.target.value)}
                  placeholder="e.g. 196.118.93.179"
                  style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ ...S.label, color: '#cbd5e1' }}>Duration</label>
                <select
                  value={ipDuration}
                  onChange={e => setIpDuration(e.target.value)}
                  style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
                >
                  <option value="1">1 hour</option>
                  <option value="24">24 hours</option>
                  <option value="168">7 days</option>
                  <option value="720">30 days</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              <div>
                <label style={{ ...S.label, color: '#cbd5e1' }}>Note / Reason</label>
                <input
                  type="text"
                  value={ipNote}
                  onChange={e => setIpNote(e.target.value)}
                  placeholder="e.g. Bot traffic"
                  style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
                />
              </div>
            </div>

            <div>
              <button style={{ ...S.btn, ...S.btnPrimary }}>+ Block IP Address</button>
            </div>
          </form>

          {/* IP Rules List */}
          <div style={{ display: 'grid', gap: 12 }}>
            {ipRules.length === 0 ? (
              <div style={{ ...S.card, background: '#0f172a', borderColor: '#1e293b', textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                No IP blocking rules configured for this store.
              </div>
            ) : (
              ipRules.map(rule => (
                <div
                  key={rule.id}
                  style={{
                    ...S.card,
                    background: '#0f172a',
                    borderColor: '#1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ fontSize: 16, fontFamily: 'monospace', color: '#f8fafc' }}>{rule.ip}</strong>
                      <span
                        style={{
                          ...S.badge,
                          background: rule.enabled ? '#064e3b' : '#334155',
                          color: rule.enabled ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {rule.enabled ? 'Blocking Active' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Created: {fmtDate(rule.created_at)} · Expires: {fmtDate(rule.expires_at)}
                    </div>
                    {rule.note && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{rule.note}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleToggleIp(rule)} style={{ ...S.btn, ...S.btnSecondary, fontSize: 13 }}>
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDeleteIp(rule)} style={{ ...S.btn, ...S.btnDanger, fontSize: 13 }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Customer Information */}
      {tab === 'customer' && (
        <div>
          <div style={{ ...S.info, background: '#0b1329', borderColor: '#1e293b', color: '#93c5fd', marginBottom: 20 }}>
            🔒 <strong>Server-Side Customer Guard:</strong> Customer blacklist entries are evaluated server-side when order forms submit. Full blacklist data is never sent to public JavaScript. Moroccan phone formats (06/07/+212) are normalized automatically.
          </div>

          {/* Add Customer Form */}
          <form onSubmit={handleAddCustomer} style={{ ...S.card, background: '#0f172a', borderColor: '#1e293b', marginBottom: 24, display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>Add Customer Restriction Rule</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 14 }}>
              <div>
                <label style={{ ...S.label, color: '#cbd5e1' }}>Type</label>
                <select
                  value={custType}
                  onChange={e => setCustType(e.target.value as CustomerRuleType)}
                  style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
                >
                  <option value="phone">Phone Number</option>
                  <option value="name">Customer Full Name</option>
                  <option value="address">Exact Address</option>
                  <option value="address_contains">Address Contains Phrase</option>
                </select>
              </div>

              <div>
                <label style={{ ...S.label, color: '#cbd5e1' }}>Rule Value *</label>
                <input
                  type="text"
                  required
                  value={custValue}
                  onChange={e => setCustValue(e.target.value)}
                  placeholder={custType === 'phone' ? 'e.g. 0612345678 or +212612345678' : 'Enter restriction value...'}
                  style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ ...S.label, color: '#cbd5e1' }}>Reason / Note</label>
                <input
                  type="text"
                  value={custReason}
                  onChange={e => setCustReason(e.target.value)}
                  placeholder="e.g. Fake orders"
                  style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
                />
              </div>
            </div>

            <div>
              <button style={{ ...S.btn, ...S.btnPrimary }}>+ Add Customer Rule</button>
            </div>
          </form>

          {/* Customer Rules List */}
          <div style={{ display: 'grid', gap: 12 }}>
            {custRules.length === 0 ? (
              <div style={{ ...S.card, background: '#0f172a', borderColor: '#1e293b', textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                No customer restriction rules configured for this store.
              </div>
            ) : (
              custRules.map(rule => (
                <div
                  key={rule.id}
                  style={{
                    ...S.card,
                    background: '#0f172a',
                    borderColor: '#1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ fontSize: 16, fontFamily: 'monospace', color: '#f8fafc' }}>{rule.value}</strong>
                      <span style={{ ...S.badge, background: '#312e81', color: '#c7d2fe' }}>
                        {rule.rule_type}
                      </span>
                      <span
                        style={{
                          ...S.badge,
                          background: rule.enabled ? '#064e3b' : '#334155',
                          color: rule.enabled ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Normalized: <code>{rule.normalized_value}</code> · Added: {fmtDate(rule.created_at)}
                    </div>
                    {rule.reason && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{rule.reason}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleToggleCustomer(rule)} style={{ ...S.btn, ...S.btnSecondary, fontSize: 13 }}>
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDeleteCustomer(rule)} style={{ ...S.btn, ...S.btnDanger, fontSize: 13 }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
