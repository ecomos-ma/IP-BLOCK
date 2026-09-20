'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '../../../lib/app-context';
import { S, fmtDate } from '../../../lib/ui';

export default function StoresListPage() {
  const { stores, setSelectedStoreId } = useApp();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Stores Management</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage all connected YouCan e-commerce stores.
          </p>
        </div>
        <Link href="/dashboard/stores/new" style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none' }}>
          + Add New Store
        </Link>
      </div>

      <div style={S.card}>
        {stores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#334155' }}>No Stores Registered</h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              Add a store to get started with remote code management and protection.
            </p>
            <Link href="/dashboard/stores/new" style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none' }}>
              + Add Store Now
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {stores.map(store => (
              <div
                key={store.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#f8fafc',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong style={{ fontSize: 16, color: '#0f172a' }}>{store.name || store.hostname}</strong>
                    <span
                      style={{
                        ...S.badge,
                        background: store.verified_at ? '#dcfce7' : '#fef3c7',
                        color: store.verified_at ? '#15803d' : '#b45309',
                      }}
                    >
                      {store.verified_at ? 'Verified' : 'Unverified'}
                    </span>
                    <span
                      style={{
                        ...S.badge,
                        background: store.status === 'active' ? '#e0f2fe' : '#fee2e2',
                        color: store.status === 'active' ? '#0369a1' : '#b91c1c',
                      }}
                    >
                      {store.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    URL: <code>https://{store.hostname}</code> · Created: {fmtDate(store.created_at)}
                  </div>
                  {store.description && (
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{store.description}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    href={`/dashboard/${store.id}/header`}
                    onClick={() => setSelectedStoreId(store.id)}
                    style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none', fontSize: 13 }}
                  >
                    Manage Store →
                  </Link>
                  <Link
                    href={`/dashboard/${store.id}/installation`}
                    onClick={() => setSelectedStoreId(store.id)}
                    style={{ ...S.btn, ...S.btnSecondary, textDecoration: 'none', fontSize: 13 }}
                  >
                    Snippet
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
