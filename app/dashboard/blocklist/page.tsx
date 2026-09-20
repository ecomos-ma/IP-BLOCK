'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../../../lib/app-context';
import { S, fmtDate } from '../../../lib/ui';
import { apiCall } from '../../../lib/api';
import type { IpRule, CustomerRule, CustomerRuleType } from '../../../lib/types';

type BlocklistTab = 'ip' | 'customer' | 'screen';

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

  // Block Screen customization state
  const [blockMessage, setBlockMessage] = useState(
    currentStore?.block_message || 'Access to this store is restricted from your IP address. Please contact support if you believe this is an error.'
  );
  const [blockImageUrl, setBlockImageUrl] = useState(currentStore?.block_image_url || '');
  const [blockMode, setBlockMode] = useState<'message' | 'hack_fomo'>((currentStore?.block_mode as any) || 'message');
  const [savingScreen, setSavingScreen] = useState(false);

  useEffect(() => {
    if (currentStore) {
      let msg = currentStore.block_message || '';
      let img = currentStore.block_image_url || '';
      let mode: 'message' | 'hack_fomo' = 'message';
      if (currentStore.description) {
        try {
          const meta = JSON.parse(currentStore.description);
          if (!msg && meta.block_message) msg = meta.block_message;
          if (!img && meta.block_image_url) img = meta.block_image_url;
          if (meta.block_mode === 'hack_fomo') mode = 'hack_fomo';
        } catch {}
      }
      if ((currentStore.block_mode as any) === 'hack_fomo') mode = 'hack_fomo';
      setBlockMessage(msg || 'Access to this store is restricted from your IP address. Please contact support if you believe this is an error.');
      setBlockImageUrl(img || '');
      setBlockMode(mode);
    }
  }, [currentStore?.id]);

  const handleSaveScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;
    setSavingScreen(true);
    setMsg(null);
    try {
      const res = await apiCall<{ store: any }>(`/api/stores/${currentStore.id}`, 'PATCH', {
        block_message: blockMessage,
        block_image_url: blockImageUrl,
        block_mode: blockMode,
      }, session);
      if (res.store) {
        setMsg({ text: 'Block screen customizations saved and applied to storefront!', type: 'success' });
      }
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setSavingScreen(false);
    }
  };

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

        <button
          onClick={() => setTab('screen')}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: tab === 'screen' ? '#38bdf8' : '#94a3b8',
            borderBottom: tab === 'screen' ? '3px solid #38bdf8' : '3px solid transparent',
          }}
        >
          🎨 Block Screen Customizer
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

      {/* Tab 3: Block Screen Customizer */}
      {tab === 'screen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Settings Form */}
          <form onSubmit={handleSaveScreen} style={{ ...S.card, background: '#0f172a', borderColor: '#1e293b', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc', fontWeight: 800 }}>🎨 Block Screen Customization</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                Customize the exact message and photo/logo displayed to visitors when their IP is blocked on <strong>{currentStore.name || currentStore.hostname}</strong>.
              </p>
            </div>

            {/* Mode Selector */}
            <div>
              <label style={{ ...S.label, color: '#cbd5e1', marginBottom: 10, display: 'block' }}>Block Screen Mode *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  onClick={() => setBlockMode('message')}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `2px solid ${blockMode === 'message' ? '#38bdf8' : '#334155'}`,
                    background: blockMode === 'message' ? '#0c1a2e' : '#1e293b',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'border 0.2s',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🚫</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: blockMode === 'message' ? '#38bdf8' : '#f8fafc' }}>Custom Message</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Clean blocked notice with your text & logo</div>
                </div>

                <div
                  onClick={() => setBlockMode('hack_fomo')}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `2px solid ${blockMode === 'hack_fomo' ? '#ef4444' : '#334155'}`,
                    background: blockMode === 'hack_fomo' ? '#1a0a0a' : '#1e293b',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'border 0.2s',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>💀</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: blockMode === 'hack_fomo' ? '#ef4444' : '#f8fafc' }}>Hack FOMO</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Fake hacking terminal prank screen 😈</div>
                </div>
              </div>
            </div>

            {/* Show message/image fields only for message mode */}
            {blockMode === 'message' && (<>

            <div>
              <label style={{ ...S.label, color: '#cbd5e1' }}>Custom Block Message *</label>
              <textarea
                rows={4}
                required
                value={blockMessage}
                onChange={e => setBlockMessage(e.target.value)}
                placeholder="Enter custom message shown to blocked visitors..."
                style={{
                  ...S.input,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
              <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                Supports multiline text and Arabic UTF-8 characters.
              </span>
            </div>

            <div>
              <label style={{ ...S.label, color: '#cbd5e1' }}>Custom Image / Photo URL (Optional)</label>
              <input
                type="url"
                value={blockImageUrl}
                onChange={e => setBlockImageUrl(e.target.value)}
                placeholder="https://example.com/logo.png or banner URL"
                style={S.input}
              />
              <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                Optional brand logo or restriction banner image.
              </span>
            </div>

            {blockMode === 'message' && (
              <div style={{ marginTop: 0, opacity: 0, height: 0, overflow: 'hidden' }} />
            )}
            </>)}

            {/* Hack FOMO info notice */}
            {blockMode === 'hack_fomo' && (
              <div style={{ background: '#1a0a0a', border: '1px solid #991b1b', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>💀 Hack FOMO Mode Active</div>
                <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                  When a blocked IP visits your store, they will see a full-screen fake hacking terminal with glitch effects, fake data exfiltration progress bar, screen shake, and red trail cursor. No custom message or image needed — the effect is automated.
                </div>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <button
                type="submit"
                disabled={savingScreen}
                style={{ ...S.btn, ...(blockMode === 'hack_fomo' ? S.btnDanger : S.btnPrimary), width: '100%', padding: '12px 20px', fontSize: 15 }}
              >
                {savingScreen ? 'Saving Changes...' : (blockMode === 'hack_fomo' ? '💀 Activate Hack FOMO Mode' : '💾 Save Block Screen Settings')}
              </button>
            </div>
          </form>

          {/* Live Storefront Preview */}
          <div style={{ ...S.card, background: '#090d16', borderColor: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #1e293b', paddingBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                👁️ Live Storefront Block Screen Preview
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#1e293b', color: '#94a3b8' }}>
                Real-Time View
              </span>
            </div>

            {blockMode === 'hack_fomo' ? (
              /* Hack FOMO preview */
              <div style={{
                width: '100%',
                background: '#000',
                border: '1px solid #14532d',
                borderRadius: 10,
                padding: '20px 18px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                color: '#0f0',
                fontSize: 11,
                lineHeight: 1.6,
                boxShadow: '0 0 24px rgba(0,200,0,0.15)',
                minHeight: 280,
              }}>
                <div style={{ background: '#f00', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 10px', marginBottom: 12, letterSpacing: 1.5, textAlign: 'center' }}>
                  ⚠ SYSTEM BREACH DETECTED — CRITICAL ALERT ⚠
                </div>
                {[
                  '> Initializing security scan...',
                  '> Scanning IP: 196.118.93.179',
                  '> Threat level: [CRITICAL]',
                  '> Bypassing firewall .......... [DONE]',
                  '> Extracting browser cookies .. [DONE]',
                  '> Reading saved passwords ...... [DONE]',
                  '> Uploading data to server .....',
                ].map((line, i) => (
                  <div key={i} style={{ color: line.includes('DONE') ? '#0f0' : line.includes('CRITICAL') ? '#f00' : '#0f0' }}>{line}</div>
                ))}
                <div style={{ marginTop: 12, background: '#0a0', height: 12, width: '67%', borderRight: '2px solid #0f0' }} />
                <div style={{ color: '#f00', marginTop: 8, fontSize: 11 }}>{'> EXFILTRATING DATA... 67%'}</div>
                <div style={{ marginTop: 12, borderTop: '1px solid #0f0', paddingTop: 10, textAlign: 'center', color: '#f00', fontSize: 11, fontWeight: 700 }}>
                  💀 DO NOT CLOSE THIS WINDOW
                </div>
              </div>
            ) : (
              /* Normal message preview */
              <div
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 16,
                  padding: '32px 24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                }}
              >
                {blockImageUrl ? (
                  <img
                    src={blockImageUrl}
                    alt="Block screen preview"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ fontSize: 44 }}>🚫</div>
                )}

                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.4 }}>
                  Access Restricted
                </h3>

                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
                  {blockMessage || 'Access to this store is restricted from your IP address.'}
                </p>

                <div style={{ fontSize: 11, color: '#64748b', background: '#0f172a', padding: '4px 12px', borderRadius: 20, fontFamily: 'monospace' }}>
                  Your IP: 196.118.93.179
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
