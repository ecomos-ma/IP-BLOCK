'use client';

import React, { useEffect, useState, use } from 'react';
import { useApp } from '../../../../lib/app-context';
import { S, fmtDate } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { CustomerRule, CustomerRuleType } from '../../../../lib/types';

export default function CustomerBlockPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session } = useApp();
  const [rules, setRules] = useState<CustomerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [ruleType, setRuleType] = useState<CustomerRuleType>('phone');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('Abusive customer');
  const [enabled, setEnabled] = useState(true);

  const fetchRules = async () => {
    try {
      const res = await apiCall<{ rules: CustomerRule[] }>(`/api/customer-rules?storeId=${storeId}`, 'GET', undefined, session);
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
    if (!value.trim()) return;
    setMsg(null);
    try {
      await apiCall('/api/customer-rules', 'POST', {
        storeId,
        rule_type: ruleType,
        value,
        reason,
        enabled,
      }, session);
      setValue('');
      setMsg({ text: 'Customer rule added successfully', type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleToggle = async (rule: CustomerRule) => {
    try {
      await apiCall(`/api/customer-rules/${rule.id}`, 'PATCH', { enabled: !rule.enabled }, session);
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleDelete = async (rule: CustomerRule) => {
    if (!window.confirm(`Delete rule for ${rule.value}?`)) return;
    try {
      await apiCall(`/api/customer-rules/${rule.id}`, 'DELETE', undefined, session);
      setMsg({ text: `Deleted rule`, type: 'success' });
      await fetchRules();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>👤 Customer Block Management</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Restrict orders based on phone numbers, names, or shipping addresses entered in YouCan order forms.
        </p>
      </div>

      <div style={{ ...S.info, marginBottom: 20 }}>
        🔒 <strong>Data Minimization & Privacy:</strong> Customer blacklist entries are evaluated strictly server-side by the Customer Guard API. Full blacklist data is never sent to the browser. Moroccan phone formats (06/07/+212) are normalized automatically.
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {/* Form */}
      <form onSubmit={handleAddRule} style={{ ...S.card, marginBottom: 24, display: 'grid', gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Add Customer Rule</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 14 }}>
          <div>
            <label style={S.label}>Rule Type</label>
            <select value={ruleType} onChange={e => setRuleType(e.target.value as CustomerRuleType)} style={S.input}>
              <option value="phone">Phone Number (Moroccan formats supported)</option>
              <option value="name">Customer Full Name</option>
              <option value="address">Exact Address</option>
              <option value="address_contains">Address Phrase (Contains)</option>
            </select>
          </div>

          <div>
            <label style={S.label}>Rule Value *</label>
            <input
              type="text"
              required
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={
                ruleType === 'phone' ? 'e.g. 0612345678 or +212612345678' :
                ruleType === 'name' ? 'e.g. John Doe' : 'e.g. Rue 14 N 25 Casablanca'
              }
              style={S.input}
            />
          </div>

          <div>
            <label style={S.label}>Reason / Internal Note</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Fake order history"
              style={S.input}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            Enable rule immediately
          </label>

          <button style={{ ...S.btn, ...S.btnPrimary }}>+ Add Customer Rule</button>
        </div>
      </form>

      {/* Rules List */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Configured Customer Rules ({rules.length})</h3>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading Customer Rules...</div>
        ) : rules.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No customer restrictions set yet for this store.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rules.map(rule => (
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
                    <strong style={{ fontSize: 15, fontFamily: 'monospace' }}>{rule.value}</strong>
                    <span style={{ ...S.badge, background: '#f3e8ff', color: '#7e22ce' }}>
                      {rule.rule_type}
                    </span>
                    <span
                      style={{
                        ...S.badge,
                        background: rule.enabled ? '#dcfce7' : '#f1f5f9',
                        color: rule.enabled ? '#15803d' : '#64748b',
                      }}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Normalized: <code>{rule.normalized_value}</code> · Created: {fmtDate(rule.created_at)}
                  </div>
                  {rule.reason && (
                    <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>Reason: {rule.reason}</div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
