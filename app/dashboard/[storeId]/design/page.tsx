'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useApp } from '../../../../lib/app-context';
import { S } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { CodeDocument } from '../../../../lib/types';

export default function DesignAssetsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session } = useApp();
  const [docs, setDocs] = useState<CodeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await apiCall<{ documents: CodeDocument[] }>(`/api/code?storeId=${storeId}`, 'GET', undefined, session);
      // Filter for CSS documents
      setDocs(res.documents.filter(d => d.doc_type.endsWith('_css')));
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [storeId, session]);

  const handleSave = async (doc: CodeDocument) => {
    try {
      await apiCall(`/api/code/${doc.id}`, 'PATCH', { draft_content: doc.draft_content, enabled: doc.enabled }, session);
      setMsg({ text: `Saved CSS for "${doc.name}"`, type: 'success' });
      await fetchDocs();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const updateLocal = (id: string, text: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, draft_content: text } : d));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🎨 Design & Stylesheets</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage storefront stylesheets, CSS variables, and layout overrides remotely.
          </p>
        </div>
        <Link href={`/dashboard/${storeId}/publishing`} style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none' }}>
          🚀 Publish CSS Changes
        </Link>
      </div>

      <div style={{ ...S.info, marginBottom: 20 }}>
        💅 <strong>Performance Tip:</strong> Main CSS files are bundled and served via CDN with content hashing. Critical CSS is inlined directly in the initial HTML loader to avoid visual layout shifts during page render.
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading CSS Stylesheets...</div>
      ) : docs.length === 0 ? (
        <div style={S.card}>
          <p style={{ margin: 0, color: '#64748b' }}>No CSS documents found. Create CSS files in the Header Code section.</p>
          <Link href={`/dashboard/${storeId}/header`} style={{ ...S.btn, ...S.btnPrimary, marginTop: 12, textDecoration: 'none' }}>
            Go to Header Code →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {docs.map(doc => (
            <div key={doc.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{doc.name}</span>
                  <span style={{ ...S.badge, background: '#e0f2fe', color: '#0369a1', marginLeft: 10 }}>
                    {doc.doc_type}
                  </span>
                </div>
                <button onClick={() => handleSave(doc)} style={{ ...S.btn, ...S.btnSuccess }}>
                  💾 Save CSS Draft
                </button>
              </div>

              <textarea
                value={doc.draft_content}
                onChange={e => updateLocal(doc.id, e.target.value)}
                style={{ ...S.textarea, minHeight: 320 }}
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
