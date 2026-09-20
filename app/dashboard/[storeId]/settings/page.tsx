'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../../lib/app-context';
import { S } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';

export default function StoreSettingsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const router = useRouter();
  const { session, currentStore, refreshStores } = useApp();
  const [name, setName] = useState(currentStore?.name || '');
  const [description, setDescription] = useState(currentStore?.description || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await apiCall(`/api/stores/${storeId}`, 'PATCH', { name, description }, session);
      setMsg({ text: 'Store settings updated', type: 'success' });
      await refreshStores();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!window.confirm(`Are you SURE you want to delete store "${currentStore?.hostname}"? This cannot be undone.`)) return;
    const confirmName = window.prompt(`Type "${currentStore?.hostname}" to confirm deletion:`);
    if (confirmName !== currentStore?.hostname) {
      alert('Store name did not match. Deletion cancelled.');
      return;
    }

    try {
      await apiCall(`/api/stores/${storeId}`, 'DELETE', undefined, session);
      await refreshStores();
      router.push('/dashboard/stores');
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  if (!currentStore) {
    return <div>Store not found.</div>;
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>⚙️ Store Settings</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Manage metadata, licensing status, and store configuration.
        </p>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      <form onSubmit={handleSave} style={{ ...S.card, marginBottom: 24, display: 'grid', gap: 16 }}>
        <div>
          <label style={S.label}>Store Hostname (Immutable)</label>
          <input
            type="text"
            readOnly
            value={currentStore.hostname}
            style={{ ...S.input, background: '#f1f5f9', color: '#64748b' }}
          />
        </div>

        <div>
          <label style={S.label}>Store Display Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. My YouCan Store"
            style={S.input}
          />
        </div>

        <div>
          <label style={S.label}>Internal Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ ...S.input, height: 'auto', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <button style={{ ...S.btn, ...S.btnPrimary }} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div style={{ ...S.card, border: '1px solid #fecaca', background: '#fef2f2' }}>
        <h3 style={{ margin: '0 0 8px', color: '#dc2626', fontSize: 16 }}>Danger Zone</h3>
        <p style={{ color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
          Deleting a store permanently removes all draft code, release assets, and protection rules.
        </p>

        <button onClick={handleDeleteStore} style={{ ...S.btn, ...S.btnDanger }}>
          🗑️ Delete Store Permanently
        </button>
      </div>
    </div>
  );
}
