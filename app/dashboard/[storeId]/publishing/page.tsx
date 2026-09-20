'use client';

import React, { useEffect, useState, use } from 'react';
import { useApp } from '../../../../lib/app-context';
import { S, fmtDate, fmtRelative } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { Release } from '../../../../lib/types';

export default function PublishingPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session } = useApp();
  const [releases, setReleases] = useState<Release[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchReleases = async () => {
    try {
      const res = await apiCall<{ releases: Release[] }>(`/api/releases?storeId=${storeId}`, 'GET', undefined, session);
      setReleases(res.releases || []);
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [storeId, session]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    setMsg(null);
    try {
      const res = await apiCall<{ release: Release }>('/api/releases', 'POST', { storeId, notes }, session);
      setNotes('');
      setMsg({ text: `Published Release v${res.release.version_number} successfully!`, type: 'success' });
      await fetchReleases();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (rel: Release) => {
    if (!window.confirm(`Revert your live store to Release v${rel.version_number}?`)) return;
    setMsg(null);
    try {
      const res = await apiCall<{ message: string }>(`/api/releases/${rel.id}/activate`, 'POST', {}, session);
      setMsg({ text: res.message, type: 'success' });
      await fetchReleases();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const activeRelease = releases.find(r => r.is_active);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🚀 Publishing, Versioning & Rollback</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Publish draft code changes atomically to production. Roll back to any previous version instantly.
        </p>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {/* Publish Form */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Publish New Code Release</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>
          Publishing captures all enabled draft Header Code, Footer Code, CSS, and Custom Modules into a single versioned release bundle.
        </p>

        <form onSubmit={handlePublish} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={S.label}>Release Notes / Summary</label>
            <input
              type="text"
              placeholder="e.g. Updated Moroccan phone validator & added Black Friday sale styles"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={S.input}
            />
          </div>

          <div>
            <button style={{ ...S.btn, ...S.btnPrimary }} disabled={publishing}>
              {publishing ? 'Building & Publishing Assets...' : '🚀 Publish New Release Now'}
            </button>
          </div>
        </form>
      </div>

      {/* Current Active Release */}
      {activeRelease && (
        <div style={{ ...S.card, marginBottom: 24, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Currently Active Release</span>
              <h2 style={{ margin: '4px 0', fontSize: 22, color: '#14532d' }}>Version {activeRelease.version_number}</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>
                Published {fmtDate(activeRelease.published_at)} ({fmtRelative(activeRelease.published_at)})
              </p>
              {activeRelease.notes && (
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#334155' }}>Notes: {activeRelease.notes}</p>
              )}
            </div>
            <span style={{ ...S.badge, background: '#16a34a', color: '#fff', padding: '6px 12px', fontSize: 13 }}>
              LIVE ON STORE
            </span>
          </div>
        </div>
      )}

      {/* Version History */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Version Release History</h3>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading Version History...</div>
        ) : releases.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No releases published yet for this store.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {releases.map(rel => (
              <div
                key={rel.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 6,
                  border: rel.is_active ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: rel.is_active ? '#f0fdf4' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong style={{ fontSize: 16, color: '#0f172a' }}>Release v{rel.version_number}</strong>
                    {rel.is_active ? (
                      <span style={{ ...S.badge, background: '#16a34a', color: '#fff' }}>Active</span>
                    ) : (
                      <span style={{ ...S.badge, background: '#e2e8f0', color: '#64748b' }}>Archived</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Published: {fmtDate(rel.published_at)} ({fmtRelative(rel.published_at)})
                  </div>
                  {rel.notes && (
                    <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>{rel.notes}</div>
                  )}
                </div>

                <div>
                  {!rel.is_active && (
                    <button
                      onClick={() => handleRollback(rel)}
                      style={{ ...S.btn, ...S.btnSecondary, fontSize: 13 }}
                    >
                      ↺ Rollback to v{rel.version_number}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
