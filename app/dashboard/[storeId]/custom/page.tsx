'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useApp } from '../../../../lib/app-context';
import { S } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { CodeDocument, DocType, ExecutionPhase, PageTarget } from '../../../../lib/types';

export default function CustomModulesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session } = useApp();
  const [docs, setDocs] = useState<CodeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DocType>('module_js');
  const [newPhase, setNewPhase] = useState<ExecutionPhase>('async');
  const [newTarget, setNewTarget] = useState<PageTarget>('all');
  const [newPattern, setNewPattern] = useState('');
  const [newContent, setNewContent] = useState('');

  const fetchDocs = async () => {
    try {
      const res = await apiCall<{ documents: CodeDocument[] }>(`/api/code?storeId=${storeId}`, 'GET', undefined, session);
      const moduleTypes: DocType[] = ['module_css', 'module_js', 'module_html'];
      setDocs(res.documents.filter(d => moduleTypes.includes(d.doc_type)));
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [storeId, session]);

  const handleSaveDraft = async (doc: CodeDocument) => {
    setMsg(null);
    try {
      await apiCall(`/api/code/${doc.id}`, 'PATCH', {
        draft_content: doc.draft_content,
        published_content: doc.draft_content,
        enabled: doc.enabled,
        execution_phase: doc.execution_phase,
        page_target: doc.page_target,
        page_pattern: doc.page_pattern,
      }, session);
      setMsg({ text: `Saved module "${doc.name}"`, type: 'success' });
      await fetchDocs();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleDelete = async (doc: CodeDocument) => {
    if (!window.confirm(`Delete module "${doc.name}"?`)) return;
    try {
      await apiCall(`/api/code/${doc.id}`, 'DELETE', undefined, session);
      setMsg({ text: `Deleted "${doc.name}"`, type: 'success' });
      await fetchDocs();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await apiCall('/api/code', 'POST', {
        storeId,
        name: newName,
        doc_type: newType,
        draft_content: newContent,
        execution_phase: newPhase,
        page_target: newTarget,
        page_pattern: newPattern || null,
        priority: 50,
      }, session);
      setNewName('');
      setNewContent('');
      setShowAdd(false);
      setMsg({ text: `Created custom module "${newName}"`, type: 'success' });
      await fetchDocs();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const updateLocal = (id: string, field: keyof CodeDocument, val: any) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🧩 Custom Code Modules</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Create modular features (WhatsApp Floating Widget, Order Form Enhancements, Promotional Banners).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...S.btn, ...S.btnSecondary }}>
            {showAdd ? 'Cancel' : '+ Create Module'}
          </button>
          <Link href={`/dashboard/${storeId}/publishing`} style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none' }}>
            🚀 Publish Draft Changes
          </Link>
        </div>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {showAdd && (
        <form onSubmit={handleAddModule} style={{ ...S.card, marginBottom: 24, display: 'grid', gap: 14, background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Create New Custom Module</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Module Name</label>
              <input
                type="text"
                required
                placeholder="e.g. WhatsApp Floating Button"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Module Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value as DocType)} style={S.input}>
                <option value="module_js">Module JavaScript</option>
                <option value="module_css">Module CSS</option>
                <option value="module_html">Module HTML Snippet</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Execution Phase</label>
              <select value={newPhase} onChange={e => setNewPhase(e.target.value as ExecutionPhase)} style={S.input}>
                <option value="async">Async (Non-blocking, background)</option>
                <option value="footer">Footer (DOM-ready)</option>
                <option value="header">Header (Early)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Page Target</label>
              <select value={newTarget} onChange={e => setNewTarget(e.target.value as PageTarget)} style={S.input}>
                <option value="all">Entire Store (All Pages)</option>
                <option value="home">Homepage Only</option>
                <option value="product">Product Pages Only (/products/*)</option>
                <option value="collection">Collection Pages Only</option>
                <option value="cart">Cart Page</option>
                <option value="confirmation">Thank You / Order Confirmation</option>
                <option value="pattern">Custom RegEx URL Pattern</option>
              </select>
            </div>
            {newTarget === 'pattern' && (
              <div>
                <label style={S.label}>RegEx URL Pattern</label>
                <input
                  type="text"
                  placeholder="e.g. \/checkout|\/special-promo"
                  value={newPattern}
                  onChange={e => setNewPattern(e.target.value)}
                  style={S.input}
                />
              </div>
            )}
          </div>

          <div>
            <label style={S.label}>Module Code</label>
            <textarea
              rows={8}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Paste module JS, CSS or HTML snippet..."
              style={S.textarea}
            />
          </div>
          <div>
            <button style={{ ...S.btn, ...S.btnPrimary }}>Create & Save Module</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Modules...</div>
      ) : docs.length === 0 ? (
        <div style={S.card}>
          <p style={{ margin: 0, color: '#64748b' }}>No custom modules created yet.</p>
          <button onClick={() => setShowAdd(true)} style={{ ...S.btn, ...S.btnPrimary, marginTop: 14 }}>
            + Create First Custom Module
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {docs.map(doc => (
            <div key={doc.id} style={{ ...S.card, borderLeft: doc.enabled ? '4px solid #16a34a' : '4px solid #94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{doc.name}</span>
                  <span style={{ ...S.badge, background: '#f3e8ff', color: '#7e22ce', marginLeft: 10 }}>
                    {doc.doc_type}
                  </span>
                  <span style={{ ...S.badge, background: '#e0f2fe', color: '#0369a1', marginLeft: 6 }}>
                    target: {doc.page_target}
                  </span>
                  <span style={{ ...S.badge, background: doc.enabled ? '#dcfce7' : '#f1f5f9', color: doc.enabled ? '#15803d' : '#64748b', marginLeft: 6 }}>
                    {doc.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={doc.enabled}
                      onChange={e => updateLocal(doc.id, 'enabled', e.target.checked)}
                    />
                    Enabled
                  </label>
                  <button onClick={() => handleSaveDraft(doc)} style={{ ...S.btn, ...S.btnSuccess }}>
                    💾 Save Module
                  </button>
                  <button onClick={() => handleDelete(doc)} style={{ ...S.btn, ...S.btnDanger, padding: '8px 12px' }}>
                    Delete
                  </button>
                </div>
              </div>

              <textarea
                value={doc.draft_content}
                onChange={e => updateLocal(doc.id, 'draft_content', e.target.value)}
                style={{ ...S.textarea, minHeight: 250 }}
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
