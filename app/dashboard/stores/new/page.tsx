'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../../lib/app-context';
import { S } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { Store } from '../../../../lib/types';

export default function NewStorePage() {
  const router = useRouter();
  const { session, refreshStores, setSelectedStoreId } = useApp();
  const [hostname, setHostname] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      router.push(`/dashboard/${res.store.id}/installation`);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: 0, fontSize: 24, fontWeight: 800 }}>Add New YouCan Store</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        Connect your YouCan storefront to enable remote code management and protection.
      </p>

      {error && <div style={S.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ ...S.card, display: 'grid', gap: 16 }}>
        <div>
          <label style={S.label}>Store Hostname / Domain *</label>
          <input
            type="text"
            required
            placeholder="my-shop.youcan.shop or myshop.com"
            value={hostname}
            onChange={e => setHostname(e.target.value)}
            style={S.input}
          />
          <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>
            Enter your exact storefront hostname without https:// or paths.
          </span>
        </div>

        <div>
          <label style={S.label}>Store Display Name (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Fashion Boutique Store"
            value={name}
            onChange={e => setName(e.target.value)}
            style={S.input}
          />
        </div>

        <div>
          <label style={S.label}>Internal Description (Optional)</label>
          <textarea
            rows={3}
            placeholder="Main production store targeting Moroccan market..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ ...S.input, height: 'auto', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button style={{ ...S.btn, ...S.btnPrimary }} disabled={loading}>
            {loading ? 'Registering Store...' : 'Add Store & Get Snippet →'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ ...S.btn, ...S.btnSecondary }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
