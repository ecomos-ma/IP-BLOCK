'use client';

import React, { useState } from 'react';
import { useApp } from '../../../lib/app-context';
import { S, fmtDate } from '../../../lib/ui';
import { apiCall } from '../../../lib/api';
import type { Store } from '../../../lib/types';

export default function StoresPage() {
  const { stores, selectedStoreId, setSelectedStoreId, currentStore, refreshStores, session } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [hostname, setHostname] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verification & snippet state
  const [snippet, setSnippet] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiCall<{ store: Store }>(
        '/api/stores',
        'POST',
        { hostname, name, description },
        session
      );
      await refreshStores();
      setSelectedStoreId(res.store.id);
      setHostname('');
      setName('');
      setDescription('');
      setShowAdd(false);
      setMsg({ text: `Store "${res.store.hostname}" added successfully!`, type: 'success' });
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async (store: Store) => {
    setVerifying(true);
    setMsg(null);
    try {
      const res = await apiCall<{ verified: boolean; message: string }>(`/api/stores/${store.id}/verify`, 'POST', {}, session);
      setMsg({ text: res.message, type: 'success' });
      await refreshStores();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  const loadSnippet = async (store: Store) => {
    try {
      const res = await apiCall<{ snippet: string }>(`/api/stores/${store.id}/snippet`, 'GET', undefined, session);
      setSnippet(res.snippet);
    } catch {
      // Ignore
    }
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🏪 Stores Management</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
            Connect, verify, and switch between your YouCan e-commerce stores.
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ ...S.btn, ...S.btnPrimary }}>
          {showAdd ? 'Cancel' : '+ Add New Store'}
        </button>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}
      {error && <div style={S.error}>{error}</div>}

      {/* Add Store Form */}
      {showAdd && (
        <form onSubmit={handleAddStore} style={{ ...S.card, marginBottom: 28, background: '#0f172a', borderColor: '#1e293b', display: 'grid', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>Connect New YouCan Store</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ ...S.label, color: '#cbd5e1' }}>Store Domain / Hostname *</label>
              <input
                type="text"
                required
                placeholder="my-shop.youcan.shop or myshop.com"
                value={hostname}
                onChange={e => setHostname(e.target.value)}
                style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ ...S.label, color: '#cbd5e1' }}>Store Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Moslum Brand Store"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ ...S.input, background: '#1e293b', borderColor: '#334155', color: '#fff' }}
              />
            </div>
          </div>
          <div>
            <button style={{ ...S.btn, ...S.btnPrimary }} disabled={loading}>
              {loading ? 'Adding Store...' : 'Connect Store & Save'}
            </button>
          </div>
        </form>
      )}

      {/* Stores List */}
      <div style={{ display: 'grid', gap: 16, marginBottom: 32 }}>
        {stores.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 40, background: '#0f172a', borderColor: '#1e293b' }}>
            <h3 style={{ color: '#cbd5e1', margin: 0 }}>No Stores Connected</h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              Add your YouCan store hostname to manage remote code and protection rules.
            </p>
            <button onClick={() => setShowAdd(true)} style={{ ...S.btn, ...S.btnPrimary }}>
              + Add Store Now
            </button>
          </div>
        ) : (
          stores.map(store => {
            const isSelected = store.id === selectedStoreId;

            return (
              <div
                key={store.id}
                style={{
                  ...S.card,
                  background: isSelected ? '#161e31' : '#0f172a',
                  borderColor: isSelected ? '#2563eb' : '#1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong style={{ fontSize: 17, color: '#ffffff' }}>{store.name || store.hostname}</strong>
                    {isSelected && (
                      <span style={{ ...S.badge, background: '#2563eb', color: '#fff' }}>
                        ACTIVE SELECTION
                      </span>
                    )}
                    <span
                      style={{
                        ...S.badge,
                        background: store.verified_at ? '#064e3b' : '#78350f',
                        color: store.verified_at ? '#34d399' : '#fbbf24',
                      }}
                    >
                      {store.verified_at ? '✓ Domain Verified' : '⚠ Unverified'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
                    Hostname: <code>https://{store.hostname}</code> · Added: {fmtDate(store.created_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  {!isSelected && (
                    <button
                      onClick={() => setSelectedStoreId(store.id)}
                      style={{ ...S.btn, ...S.btnSecondary }}
                    >
                      Select Store
                    </button>
                  )}

                  {!store.verified_at && (
                    <button
                      onClick={() => handleVerifyDomain(store)}
                      style={{ ...S.btn, background: '#78350f', color: '#fbbf24' }}
                      disabled={verifying}
                    >
                      Verify Domain
                    </button>
                  )}

                  <button
                    onClick={() => loadSnippet(store)}
                    style={{ ...S.btn, ...S.btnPrimary }}
                  >
                    📋 View Snippet
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snippet Viewer Modal/Section */}
      {currentStore && (
        <div style={{ ...S.card, background: '#0f172a', borderColor: '#1e293b' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#f8fafc' }}>
            Single YouCan Snippet — {currentStore.name || currentStore.hostname}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14 }}>
            Copy this snippet and paste it ONCE in <strong>YouCan Admin → Theme Settings → Additional Header Code</strong>.
          </p>

          <textarea
            readOnly
            value={snippet || `<!-- YouCan Remote Code Manager Bootstrap -->
<style>
html.ycm-protection-wait body { visibility: hidden !important; }
html.ycm-protection-denied body > :not(#ycm-protection-curtain) { display: none !important; }
</style>
<script>
(function(){
  var s = document.createElement('script');
  s.src = "${typeof window !== 'undefined' ? window.location.origin : ''}/bootstrap.js";
  s.setAttribute('data-store-id', "${currentStore.id}");
  s.async = false;
  document.head.appendChild(s);
})();
</script>`}
            style={{ ...S.textarea, minHeight: 180, marginBottom: 14 }}
          />

          <button
            onClick={() => {
              const text = snippet || `<!-- YouCan Remote Code Manager Bootstrap -->
<script src="${window.location.origin}/bootstrap.js" data-store-id="${currentStore.id}" async="false"></script>`;
              navigator.clipboard.writeText(text);
              setMsg({ text: 'Installation snippet copied to clipboard!', type: 'success' });
            }}
            style={{ ...S.btn, ...S.btnPrimary }}
          >
            📋 Copy Snippet Code
          </button>
        </div>
      )}
    </div>
  );
}
