'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useApp } from '../../../../lib/app-context';
import { S } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { CodeDocument, DocType } from '../../../../lib/types';

export default function HeaderCodeEditorPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session, currentStore } = useApp();
  const [docs, setDocs] = useState<CodeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // New document form state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DocType>('header_js');
  const [newContent, setNewContent] = useState('');

  const fetchDocs = async () => {
    try {
      const res = await apiCall<{ documents: CodeDocument[] }>(`/api/code?storeId=${storeId}`, 'GET', undefined, session);
      // Filter for header related types
      const headerTypes: DocType[] = ['header_css', 'header_js', 'critical_css'];
      setDocs(res.documents.filter(d => headerTypes.includes(d.doc_type)));
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
      }, session);
      setMsg({ text: `Saved draft for "${doc.name}" successfully`, type: 'success' });
      await fetchDocs();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleDelete = async (doc: CodeDocument) => {
    if (!window.confirm(`Delete document "${doc.name}"?`)) return;
    try {
      await apiCall(`/api/code/${doc.id}`, 'DELETE', undefined, session);
      setMsg({ text: `Deleted "${doc.name}"`, type: 'success' });
      await fetchDocs();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await apiCall('/api/code', 'POST', {
        storeId,
        name: newName,
        doc_type: newType,
        draft_content: newContent,
        execution_phase: newType === 'critical_css' ? 'critical' : newType === 'header_css' ? 'main' : 'header',
        priority: 20,
      }, session);
      setNewName('');
      setNewContent('');
      setShowAdd(false);
      setMsg({ text: `Created new document "${newName}"`, type: 'success' });
      await fetchDocs();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const updateLocalContent = (id: string, text: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, draft_content: text } : d));
  };

  const hasUnpublished = docs.some(d => d.draft_content !== d.published_content);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>⚡ Header Code Manager</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage storefront Header CSS, Critical Styling, and early JavaScript initialization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...S.btn, ...S.btnSecondary }}>
            {showAdd ? 'Cancel' : '+ Add Header Document'}
          </button>
          <Link href={`/dashboard/${storeId}/publishing`} style={{ ...S.btn, ...S.btnPrimary, textDecoration: 'none' }}>
            🚀 Publish Draft Changes
          </Link>
        </div>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {hasUnpublished && (
        <div style={{ ...S.warning, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>Unpublished Changes Detected:</strong> Draft edits are saved locally but not live on your store until published.</span>
          <Link href={`/dashboard/${storeId}/publishing`} style={{ ...S.btn, ...S.btnPrimary, fontSize: 12, textDecoration: 'none' }}>
            Publish Now →
          </Link>
        </div>
      )}

      {/* Add Document Form */}
      {showAdd && (
        <form onSubmit={handleAddDoc} style={{ ...S.card, marginBottom: 24, display: 'grid', gap: 14, background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>New Header Code Document</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Document Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Header Initialization JS"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value as DocType)} style={S.input}>
                <option value="header_js">Header JavaScript (early execution)</option>
                <option value="header_css">Header Main CSS (stylesheet link)</option>
                <option value="critical_css">Critical CSS (inlined immediately)</option>
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Initial Code Content</label>
            <textarea
              rows={8}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Paste or write your CSS/JS code here..."
              style={S.textarea}
            />
          </div>
          <div>
            <button style={{ ...S.btn, ...S.btnPrimary }}>Create Document</button>
          </div>
        </form>
      )}

      {/* Documents List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Header Documents...</div>
      ) : docs.length === 0 ? (
        <div style={S.card}>
          <p style={{ margin: 0, color: '#64748b' }}>No Header code documents found for this store.</p>
          <button onClick={() => setShowAdd(true)} style={{ ...S.btn, ...S.btnPrimary, marginTop: 14 }}>
            + Create First Header Document
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {docs.map(doc => {
            const isDiff = doc.draft_content !== doc.published_content;
            const lineCount = (doc.draft_content.match(/\n/g) || []).length + 1;

            return (
              <div key={doc.id} style={{ ...S.card, borderLeft: isDiff ? '4px solid #f59e0b' : '1px solid #e1e4e8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{doc.name}</span>
                    <span style={{ ...S.badge, background: '#e0f2fe', color: '#0369a1', marginLeft: 10 }}>
                      {doc.doc_type}
                    </span>
                    {isDiff && (
                      <span style={{ ...S.badge, background: '#fef3c7', color: '#b45309', marginLeft: 8 }}>
                        Unpublished Draft Edits
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{lineCount} lines</span>
                    <button onClick={() => handleSaveDraft(doc)} style={{ ...S.btn, ...S.btnSuccess }}>
                      💾 Save Draft
                    </button>
                    <button onClick={() => handleDelete(doc)} style={{ ...S.btn, ...S.btnDanger, padding: '8px 12px' }}>
                      Delete
                    </button>
                  </div>
                </div>

                <textarea
                  value={doc.draft_content}
                  onChange={e => updateLocalContent(doc.id, e.target.value)}
                  style={{ ...S.textarea, minHeight: 350 }}
                  spellCheck={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
