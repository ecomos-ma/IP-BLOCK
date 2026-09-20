'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../../lib/app-context';
import { S, fmtDate, fmtRelative } from '../../lib/ui';
import { apiCall } from '../../lib/api';
import type { AuditLog, IpRule, Release } from '../../lib/types';

export default function DashboardOverview() {
  const { session, stores, currentStore, isDemo } = useApp();
  const [activeIpCount, setActiveIpCount] = useState<number>(0);
  const [releaseCount, setReleaseCount] = useState<number>(0);
  const [latestRelease, setLatestRelease] = useState<Release | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!currentStore) return;

    // Fetch store overview metrics
    apiCall<{ rules: IpRule[] }>(`/api/rules?storeId=${currentStore.id}`, 'GET', undefined, session)
      .then(res => setActiveIpCount(res.rules.filter(r => r.enabled).length))
      .catch(() => {});

    apiCall<{ releases: Release[] }>(`/api/releases?storeId=${currentStore.id}`, 'GET', undefined, session)
      .then(res => {
        setReleaseCount(res.releases.length);
        setLatestRelease(res.releases.find(r => r.is_active) || res.releases[0] || null);
      })
      .catch(() => {});

    apiCall<{ logs: AuditLog[] }>(`/api/logs?storeId=${currentStore.id}`, 'GET', undefined, session)
      .then(res => setRecentLogs((res.logs || []).slice(0, 5)))
      .catch(() => {});
  }, [currentStore, session]);

  if (!currentStore) {
    return (
      <div>
        <h1 style={{ marginTop: 0, fontSize: 24, fontWeight: 700 }}>Welcome to YouCan Remote Code Manager</h1>
        <p style={{ color: '#6b7280' }}>You don&apos;t have any stores registered yet.</p>
        <Link href="/dashboard/stores/new" style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none' }}>
          + Add Your First Store
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Store Overview — {currentStore.name || currentStore.hostname}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Remote Code Management & Protection Control Center
          </p>
        </div>
        <Link href={`/dashboard/${currentStore.id}/publishing`} style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none' }}>
          🚀 Publishing & Releases
        </Link>
      </div>

      {/* Domain Verification Notice */}
      {!currentStore.verified_at && (
        <div style={{ ...S.warning, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <strong>Store Ownership Unverified:</strong> Verify your domain to ensure custom assets are served with proper security context.
          </div>
          <Link href={`/dashboard/${currentStore.id}/installation`} style={{ ...S.btn, ...S.btnSecondary, textDecoration: 'none', fontSize: 13 }}>
            Verify Domain →
          </Link>
        </div>
      )}

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Store</div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 4px', color: '#0f172a' }}>{currentStore.hostname}</div>
          <div style={{ fontSize: 12, color: currentStore.verified_at ? '#16a34a' : '#d97706' }}>
            {currentStore.verified_at ? '✓ Domain Verified' : '⚠ Ownership Unverified'}
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Version</div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 4px', color: '#2563eb' }}>
            {latestRelease ? `v${latestRelease.version_number}` : 'No Releases'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {latestRelease ? `Published ${fmtRelative(latestRelease.published_at)}` : 'Draft code only'}
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active IP Rules</div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 4px', color: '#0f172a' }}>{activeIpCount}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Client-side visual protection</div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Stores</div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 4px', color: '#0f172a' }}>{stores.length}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Multi-store account</div>
        </div>
      </div>

      {/* Action Quick Links */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
        <Link href={`/dashboard/${currentStore.id}/header`} style={{ ...S.card, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>⚡ Header Code Editor</div>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Manage critical CSS and early initialization scripts.</p>
        </Link>

        <Link href={`/dashboard/${currentStore.id}/footer`} style={{ ...S.card, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>🦶 Footer Code Editor</div>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Manage DOM-ready scripts, product variant handlers.</p>
        </Link>

        <Link href={`/dashboard/${currentStore.id}/custom`} style={{ ...S.card, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>🧩 Custom Code Modules</div>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>WhatsApp widgets, phone validation, targeted tools.</p>
        </Link>

        <Link href={`/dashboard/${currentStore.id}/installation`} style={{ ...S.card, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>📋 Installation Snippet</div>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Copy your permanent single bootstrap snippet for YouCan.</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Recent Audit Activity</h3>
        {recentLogs.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>No activity recorded yet for this store.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {recentLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: '#f8fafc', fontSize: 13 }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                  <span style={{ color: '#64748b', marginLeft: 8 }}>{JSON.stringify(log.metadata)}</span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{fmtRelative(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
