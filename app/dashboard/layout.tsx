'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppProvider, useApp } from '../../lib/app-context';
import { S } from '../../lib/ui';

function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, stores, selectedStoreId, setSelectedStoreId, currentStore, isDemo, supabaseClient, setSession } = useApp();
  const [email, setEmail] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [sending, setSending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) return;
    setSending(true);
    setAuthMsg('');
    const redirectOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectOrigin.replace(/\/$/, '') + '/dashboard', shouldCreateUser: false },
    });
    setSending(false);
    if (error) {
      setAuthMsg(error.message);
    } else {
      setAuthMsg('Check your email for the magic sign-in link.');
    }
  };

  if (!session && !isDemo) {
    return (
      <div style={{ maxWidth: 420, margin: '12vh auto', ...S.card }}>
        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Sign In — YouCan Code Manager</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
          Enter your email to receive a passwordless sign-in link.
        </p>
        {authMsg && (
          <div style={authMsg.includes('Check') ? S.success : S.error}>{authMsg}</div>
        )}
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={S.label}>Owner Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@example.com"
              style={S.input}
            />
          </div>
          <button style={{ ...S.btn, ...S.btnPrimary, width: '100%', justifyContent: 'center' }} disabled={sending}>
            {sending ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </div>
    );
  }

  const storeId = selectedStoreId || (stores[0]?.id ?? '');

  const navSection = (title: string, items: Array<{ label: string; href: string; icon?: string }>) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 12 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {items.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : '#cbd5e1',
                background: isActive ? '#2563eb' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', color: '#f8fafc', flexShrink: 0 }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', letterSpacing: -0.3 }}>
              YouCan Code Manager
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: isDemo ? '#f59e0b' : '#10b981', color: '#000' }}>
              {isDemo ? 'DEMO' : 'PROD'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Remote Custom Code SaaS</p>
        </div>

        {/* Store Switcher */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
            CURRENT STORE
          </label>
          <select
            value={selectedStoreId}
            onChange={e => setSelectedStoreId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              background: '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {stores.length === 0 && <option value="">No stores found</option>}
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name || store.hostname} {store.verified_at ? '✓' : '(unverified)'}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/dashboard/stores/new" style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
              + Add Store
            </Link>
            <Link href="/dashboard/stores" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>
              All Stores ({stores.length})
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
          {navSection('Global', [
            { label: 'Overview', href: '/dashboard', icon: '📊' },
            { label: 'Stores List', href: '/dashboard/stores', icon: '🏪' },
          ])}

          {storeId && navSection('Code Manager', [
            { label: 'Header Code', href: `/dashboard/${storeId}/header`, icon: '⚡' },
            { label: 'Footer Code', href: `/dashboard/${storeId}/footer`, icon: '🦶' },
            { label: 'Custom Modules', href: `/dashboard/${storeId}/custom`, icon: '🧩' },
            { label: 'Design & Assets', href: `/dashboard/${storeId}/design`, icon: '🎨' },
          ])}

          {storeId && navSection('Protection', [
            { label: 'IP Block', href: `/dashboard/${storeId}/ip-block`, icon: '🛡️' },
            { label: 'Customer Block', href: `/dashboard/${storeId}/customer-block`, icon: '👤' },
          ])}

          {storeId && navSection('Deployment', [
            { label: 'Installation', href: `/dashboard/${storeId}/installation`, icon: '📋' },
            { label: 'Publish & Rollback', href: `/dashboard/${storeId}/publishing`, icon: '🚀' },
          ])}

          {storeId && navSection('Management', [
            { label: 'Activity Logs', href: `/dashboard/${storeId}/logs`, icon: '📜' },
            { label: 'Settings', href: `/dashboard/${storeId}/settings`, icon: '⚙️' },
          ])}
        </div>

        {/* Footer info */}
        <div style={{ padding: 14, borderTop: '1px solid #1e293b', fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{currentStore ? currentStore.hostname : 'No active store'}</span>
          {!isDemo && supabaseClient && (
            <button
              onClick={() => { supabaseClient.auth.signOut(); setSession(null); }}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: 0 }}
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', maxWidth: 1180 }}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Sidebar>{children}</Sidebar>
    </AppProvider>
  );
}
