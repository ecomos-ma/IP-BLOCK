'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider, useApp } from '../../lib/app-context';
import { S } from '../../lib/ui';

function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { stores, selectedStoreId, setSelectedStoreId, currentStore, isDemo } = useApp();

  const handleSelectStore = (id: string) => {
    setSelectedStoreId(id);
  };

  const navItems = [
    { label: 'Stores', href: '/dashboard/stores', icon: '🏪' },
    { label: 'Custom Code', href: '/dashboard/code', icon: '⚡' },
    { label: 'Blocklist', href: '/dashboard/blocklist', icon: '🛡️' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: 250, background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Brand */}
        <div style={{ padding: '22px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: -0.4 }}>
              YouCan Code Manager
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: isDemo ? '#f59e0b' : '#10b981', color: '#000' }}>
              {isDemo ? 'DEMO' : 'ACTIVE'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Remote Store Control</p>
        </div>

        {/* Store Selector */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', background: '#0b1329' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Active Store
          </label>
          <select
            value={selectedStoreId}
            onChange={e => handleSelectStore(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
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
            <span style={{ fontSize: 12, color: currentStore?.verified_at ? '#10b981' : '#f59e0b' }}>
              {currentStore?.verified_at ? '✓ Verified Domain' : '⚠ Domain Unverified'}
            </span>
            <Link href="/dashboard/stores" style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
              Manage →
            </Link>
          </div>
        </div>

        {/* Primary 3 Navigation Items */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'grid', gap: 4, alignContent: 'start' }}>
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href) || (item.href === '/dashboard/stores' && pathname === '/dashboard');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? '#2563eb' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', fontSize: 12, color: '#64748b' }}>
          <div>Current Host:</div>
          <code style={{ color: '#94a3b8', fontSize: 12 }}>{currentStore?.hostname || 'None selected'}</code>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{ height: 60, borderBottom: '1px solid #1e293b', background: '#0f172a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: '#94a3b8' }}>Selected Store:</span>
            <strong style={{ fontSize: 15, color: '#f8fafc' }}>{currentStore ? (currentStore.name || currentStore.hostname) : 'Select a store'}</strong>
            {currentStore && (
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: '#1e293b', color: '#38bdf8', fontFamily: 'monospace' }}>
                https://{currentStore.hostname}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/dashboard/code" style={{ ...S.btn, ...S.btnPrimary, padding: '8px 16px', textDecoration: 'none', fontSize: 13 }}>
              ⚡ Open Code Editor
            </Link>
          </div>
        </header>

        {/* Content body */}
        <main style={{ flex: 1, padding: 32, overflowY: 'auto', background: '#090d16' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Navigation>{children}</Navigation>
    </AppProvider>
  );
}
