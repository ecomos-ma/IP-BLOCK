'use client';

import React, { useEffect, useState, use } from 'react';
import { useApp as useGlobalApp } from '../../../../lib/app-context';
import { S } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';

export default function InstallationPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session, currentStore, refreshStores } = useGlobalApp();
  const [snippet, setSnippet] = useState<string>('');
  const [hostUrl, setHostUrl] = useState<string>('');
  const [customHost, setCustomHost] = useState<string>('');
  const [isLocal, setIsLocal] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchSnippet = async (override?: string) => {
    setLoading(true);
    try {
      const q = override ? `?overrideHost=${encodeURIComponent(override)}` : '';
      const res = await apiCall<{ snippet: string; hostUrl: string; isLocal: boolean }>(
        `/api/stores/${storeId}/snippet${q}`,
        'GET',
        undefined,
        session
      );
      setSnippet(res.snippet);
      setHostUrl(res.hostUrl);
      setIsLocal(res.isLocal);
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippet();
  }, [storeId, session]);

  const handleCopy = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet).then(() => {
      setMsg({ text: 'Installation snippet copied to clipboard!', type: 'success' });
    });
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    setMsg(null);
    try {
      const res = await apiCall<{ verified: boolean; message: string }>(`/api/stores/${storeId}/verify`, 'POST', {}, session);
      setMsg({ text: res.message, type: 'success' });
      await refreshStores();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message, type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  const handleApplyCustomHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHost.trim()) return;
    fetchSnippet(customHost.trim());
  };

  const isVerified = currentStore?.verified_at;
  const token = currentStore?.verification_token || 'demo-token';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📋 YouCan Store Installation Snippet</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Connect your storefront to this SaaS platform with a single, permanent bootstrap snippet.
        </p>
      </div>

      {msg && <div style={msg.type === 'success' ? S.success : S.error}>{msg.text}</div>}

      {/* Step 1: Verification */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Step 1: Domain Ownership Verification</h3>
          <span
            style={{
              ...S.badge,
              background: isVerified ? '#dcfce7' : '#fef3c7',
              color: isVerified ? '#15803d' : '#b45309',
            }}
          >
            {isVerified ? '✓ Domain Verified' : '⚠ Action Required'}
          </span>
        </div>

        {isVerified ? (
          <p style={{ margin: 0, color: '#16a34a', fontSize: 14 }}>
            ✓ Your store hostname (<code>{currentStore?.hostname}</code>) was successfully verified. Remote asset serving and protection policies are active.
          </p>
        ) : (
          <div>
            <p style={{ color: '#475569', fontSize: 14, margin: '0 0 12px' }}>
              Before activating remote asset serving, add the following meta tag to your YouCan Additional Header Code:
            </p>

            <div style={{ background: '#0d1117', padding: 12, borderRadius: 6, marginBottom: 14 }}>
              <code style={{ color: '#58a6ff', fontSize: 13 }}>
                {`<meta name="youcan-site-verification" content="${token}">`}
              </code>
            </div>

            <button onClick={handleVerifyDomain} style={{ ...S.btn, ...S.btnPrimary }} disabled={verifying}>
              {verifying ? 'Checking Domain...' : '🔍 Check Verification Status Now'}
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Single Snippet Installation */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Step 2: Permanent YouCan Installation Snippet</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
          Copy this single snippet and paste it ONCE at the top of <strong>YouCan Admin → Settings → Additional Header Code</strong>.
        </p>

        {isLocal && (
          <div style={{ ...S.warning, marginBottom: 16 }}>
            ⚠️ <strong>Localhost Warning:</strong> Your snippet is currently pointing to <code>{hostUrl}</code>. Live HTTPS YouCan stores block <code>http://localhost</code> scripts due to Mixed Content security rules.
            <br />
            To test on your live YouCan store, use your deployed Vercel HTTPS URL (e.g. <code>https://ip-block.vercel.app</code>) or enter your HTTPS tunnel host below.
          </div>
        )}

        {/* Custom Host Override Form */}
        <form onSubmit={handleApplyCustomHost} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            SaaS HTTPS Host:
          </label>
          <input
            type="text"
            placeholder="e.g. https://your-project.vercel.app"
            value={customHost}
            onChange={e => setCustomHost(e.target.value)}
            style={{ ...S.input, flex: 1 }}
          />
          <button style={{ ...S.btn, ...S.btnSecondary, whiteSpace: 'nowrap' }}>
            Update Snippet Host
          </button>
        </form>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Generating Snippet...</div>
        ) : (
          <div>
            <textarea
              readOnly
              value={snippet}
              style={{ ...S.textarea, minHeight: 180, marginBottom: 14 }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleCopy} style={{ ...S.btn, ...S.btnPrimary }}>
                📋 Copy Installation Code
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155' }}>How Remote Management Works</h4>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
            <li>You paste this snippet in YouCan <strong>only once</strong>.</li>
            <li>When you update CSS, JavaScript, IP rules, or custom modules in this dashboard, they deploy instantly.</li>
            <li>No need to open YouCan&apos;s admin panel ever again for code updates.</li>
            <li>The script executes critical CSS early and defers heavy scripts to keep store load extremely fast.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
