'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../../../lib/app-context';
import { S, fmtDate, fmtRelative } from '../../../lib/ui';
import { apiCall } from '../../../lib/api';
import { extractCssContent, extractJsContent } from '../../../lib/release-builder';
import { importYoucanRawCode } from '../../../lib/code-importer';
import type { CodeDocument, Release } from '../../../lib/types';

type CodeTab = 'css' | 'js' | 'advanced';

export default function CustomCodePage() {
  const { currentStore, session } = useApp();
  const [tab, setTab] = useState<CodeTab>('css');
  const [docs, setDocs] = useState<CodeDocument[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Editors state
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [headerAdvHtml, setHeaderAdvHtml] = useState('');
  const [footerAdvHtml, setFooterAdvHtml] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const fetchCode = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const res = await apiCall<{ documents: CodeDocument[] }>(`/api/code?storeId=${currentStore.id}`, 'GET', undefined, session);
      setDocs(res.documents || []);

      const cssDoc = res.documents.find(d => d.doc_type === 'header_css');
      const jsDoc  = res.documents.find(d => d.doc_type === 'header_js');
      const fJsDoc = res.documents.find(d => d.doc_type === 'footer_js');

      setCssCode(cssDoc ? (cssDoc.published_content || cssDoc.draft_content) : '');
      setJsCode(jsDoc ? (jsDoc.published_content || jsDoc.draft_content) : '');
      setFooterAdvHtml(fJsDoc ? (fJsDoc.published_content || fJsDoc.draft_content) : '');

      const relRes = await apiCall<{ releases: Release[] }>(`/api/releases?storeId=${currentStore.id}`, 'GET', undefined, session);
      setReleases(relRes.releases || []);
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCode();
  }, [currentStore?.id, session]);

  const handleSaveAndPublish = async () => {
    if (!currentStore) return;
    setPublishing(true);
    setMsg(null);

    try {
      // Clean HTML style/script wrappers automatically before saving
      const cleanCss = extractCssContent(cssCode);
      const cleanJs  = extractJsContent(jsCode);

      // Find or create CSS & JS documents
      let cssDoc = docs.find(d => d.doc_type === 'header_css');
      let jsDoc  = docs.find(d => d.doc_type === 'header_js');

      if (cssDoc) {
        await apiCall(`/api/code/${cssDoc.id}`, 'PATCH', { draft_content: cleanCss, enabled: true }, session);
      } else {
        await apiCall('/api/code', 'POST', {
          storeId: currentStore.id,
          name: 'Main Storefront CSS',
          doc_type: 'header_css',
          draft_content: cleanCss,
          execution_phase: 'main',
          priority: 10,
        }, session);
      }

      if (jsDoc) {
        await apiCall(`/api/code/${jsDoc.id}`, 'PATCH', { draft_content: cleanJs, enabled: true }, session);
      } else {
        await apiCall('/api/code', 'POST', {
          storeId: currentStore.id,
          name: 'Header Custom JavaScript',
          doc_type: 'header_js',
          draft_content: cleanJs,
          execution_phase: 'header',
          priority: 20,
        }, session);
      }

      // Trigger Publish
      const pubRes = await apiCall<{ release: Release }>('/api/releases', 'POST', {
        storeId: currentStore.id,
        notes: `Published via Custom Code Manager at ${new Date().toLocaleTimeString()}`,
      }, session);

      setMsg({
        text: `🚀 Release v${pubRes.release.version_number} Published Successfully! Your YouCan storefront has been updated.`,
        type: 'success',
      });

      await fetchCode();
    } catch (err: unknown) {
      setMsg({ text: `Publish Failed: ${(err as Error).message}`, type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const handleImportHeaderFooter = () => {
    const headerResult = importYoucanRawCode(headerAdvHtml);
    const footerResult = importYoucanRawCode(footerAdvHtml);

    let newCss = cssCode;
    let newJs = jsCode;

    if (headerResult.extractedCss) newCss += (newCss ? '\n\n' : '') + headerResult.extractedCss;
    if (footerResult.extractedCss) newCss += (newCss ? '\n\n' : '') + footerResult.extractedCss;
    if (headerResult.extractedJs)  newJs  += (newJs ? '\n;\n' : '')  + headerResult.extractedJs;
    if (footerResult.extractedJs)  newJs  += (newJs ? '\n;\n' : '')  + footerResult.extractedJs;

    setCssCode(newCss);
    setJsCode(newJs);

    const allWarnings = [...headerResult.warnings, ...footerResult.warnings];
    if (allWarnings.length > 0) {
      setMsg({ text: `Import Warning: ${allWarnings.join(' ')}`, type: 'error' });
    } else {
      setMsg({ text: 'Extracted style and script blocks from raw YouCan code. Switched to CSS/JS tabs to review.', type: 'success' });
    }
  };

  const handleRollback = async (rel: Release) => {
    if (!currentStore) return;
    if (!window.confirm(`Roll back storefront to Version v${rel.version_number}?`)) return;
    setMsg(null);
    try {
      const res = await apiCall<{ message: string }>(`/api/releases/${rel.id}/activate`, 'POST', {}, session);
      setMsg({ text: res.message, type: 'success' });
      await fetchCode();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    }
  };

  const activeRelease = releases.find(r => r.is_active);

  if (!currentStore) {
    return (
      <div style={{ padding: 40, color: '#94a3b8' }}>
        Please select or connect a store to manage custom code.
      </div>
    );
  }

  const getLineCount = (str: string) => (str.match(/\n/g) || []).length + 1;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>⚡ Custom Code Manager</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
            Manage and publish CSS, JavaScript, and Advanced YouCan code for <strong>{currentStore.name || currentStore.hostname}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {activeRelease && (
            <span style={{ fontSize: 13, background: '#1e293b', border: '1px solid #334155', padding: '6px 12px', borderRadius: 6, color: '#38bdf8' }}>
              Live Version: <strong>v{activeRelease.version_number}</strong> ({fmtRelative(activeRelease.published_at)})
            </span>
          )}

          <button onClick={() => setShowHistory(!showHistory)} style={{ ...S.btn, ...S.btnSecondary }}>
            📜 Version History ({releases.length})
          </button>

          <button onClick={handleSaveAndPublish} style={{ ...S.btn, ...S.btnPrimary, padding: '10px 20px', fontSize: 14 }} disabled={publishing}>
            {publishing ? 'Publishing to YouCan...' : '🚀 Save & Publish Changes'}
          </button>
        </div>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {/* Version History Drawer / Modal */}
      {showHistory && (
        <div style={{ ...S.card, background: '#0f172a', borderColor: '#1e293b', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: 16 }}>Published Version Release History</h3>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Close ✕</button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {releases.map(rel => (
              <div
                key={rel.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 6,
                  border: rel.is_active ? '2px solid #10b981' : '1px solid #1e293b',
                  background: rel.is_active ? '#064e3b' : '#161e31',
                }}
              >
                <div>
                  <strong style={{ color: '#fff', fontSize: 15 }}>Release v{rel.version_number}</strong>
                  <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 10 }}>{fmtDate(rel.published_at)}</span>
                  {rel.notes && <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>{rel.notes}</div>}
                </div>

                {!rel.is_active && (
                  <button onClick={() => handleRollback(rel)} style={{ ...S.btn, ...S.btnSecondary, fontSize: 12 }}>
                    ↺ Rollback to v{rel.version_number}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', marginBottom: 20 }}>
        <button
          onClick={() => setTab('css')}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: tab === 'css' ? '#38bdf8' : '#94a3b8',
            borderBottom: tab === 'css' ? '3px solid #38bdf8' : '3px solid transparent',
          }}
        >
          🎨 CSS ({getLineCount(cssCode)} lines)
        </button>

        <button
          onClick={() => setTab('js')}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: tab === 'js' ? '#38bdf8' : '#94a3b8',
            borderBottom: tab === 'js' ? '3px solid #38bdf8' : '3px solid transparent',
          }}
        >
          ⚡ JavaScript ({getLineCount(jsCode)} lines)
        </button>

        <button
          onClick={() => setTab('advanced')}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: tab === 'advanced' ? '#38bdf8' : '#94a3b8',
            borderBottom: tab === 'advanced' ? '3px solid #38bdf8' : '3px solid transparent',
          }}
        >
          🛠️ Header / Footer Advanced Importer
        </button>
      </div>

      {/* Tab 1: CSS Editor */}
      {tab === 'css' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              Custom Storefront CSS (Supports plain CSS or HTML &lt;style&gt; blocks)
            </label>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Variables, @media queries, UTF-8/Arabic, !important supported
            </span>
          </div>

          <textarea
            value={cssCode}
            onChange={e => setCssCode(e.target.value)}
            placeholder="/* Paste your custom CSS here */&#10;.product-card { border-radius: 16px; }"
            style={{ ...S.textarea, minHeight: 480, fontSize: 14 }}
            spellCheck={false}
          />
        </div>
      )}

      {/* Tab 2: JavaScript Editor */}
      {tab === 'js' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              Custom Header & Footer JavaScript
            </label>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Executes safely on storefront; DOM readiness handled automatically
            </span>
          </div>

          <textarea
            value={jsCode}
            onChange={e => setJsCode(e.target.value)}
            placeholder="// Paste your custom JavaScript here&#10;console.log('YouCan Custom Code Active');"
            style={{ ...S.textarea, minHeight: 480, fontSize: 14 }}
            spellCheck={false}
          />
        </div>
      )}

      {/* Tab 3: Header / Footer Advanced Importer */}
      {tab === 'advanced' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ ...S.info, background: '#0b1329', borderColor: '#1e293b', color: '#93c5fd' }}>
            💡 <strong>Raw Code Importer:</strong> Paste your original complete YouCan <em>Additional Header Code</em> and <em>Additional Footer Code</em> below. The importer automatically separates style blocks into CSS and script blocks into JavaScript without breaking execution semantics.
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Original YouCan Additional Header Code
            </label>
            <textarea
              value={headerAdvHtml}
              onChange={e => setHeaderAdvHtml(e.target.value)}
              placeholder="Paste original Additional Header Code HTML..."
              style={{ ...S.textarea, minHeight: 220 }}
              spellCheck={false}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Original YouCan Additional Footer Code
            </label>
            <textarea
              value={footerAdvHtml}
              onChange={e => setFooterAdvHtml(e.target.value)}
              placeholder="Paste original Additional Footer Code HTML..."
              style={{ ...S.textarea, minHeight: 220 }}
              spellCheck={false}
            />
          </div>

          <div>
            <button onClick={handleImportHeaderFooter} style={{ ...S.btn, ...S.btnPrimary }}>
              🛠️ Extract & Import Style & Script Blocks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
