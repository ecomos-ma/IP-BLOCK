'use client';

import React, { useEffect, useState, use } from 'react';
import { useApp } from '../../../../lib/app-context';
import { S, fmtDate, fmtRelative } from '../../../../lib/ui';
import { apiCall } from '../../../../lib/api';
import type { AuditLog } from '../../../../lib/types';

export default function ActivityLogsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { session } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<{ logs: AuditLog[] }>(`/api/logs?storeId=${storeId}`, 'GET', undefined, session)
      .then(res => setLogs(res.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId, session]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📜 Store Activity Audit Logs</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Immutable record of code edits, releases, IP changes, and domain verifications for this store.
        </p>
      </div>

      <div style={S.card}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading Audit Logs...</div>
        ) : logs.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No audit logs recorded for this store yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {logs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, color: '#0f172a' }}>{log.action}</strong>
                  {log.metadata && (
                    <span style={{ fontSize: 13, color: '#64748b', marginLeft: 10 }}>
                      {JSON.stringify(log.metadata)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {fmtDate(log.created_at)} ({fmtRelative(log.created_at)})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
