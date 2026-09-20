export const S = {
  card: { background: '#ffffff', border: '1px solid #e1e4e8', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  input: { padding: '9px 13px', border: '1px solid #d0d7de', borderRadius: 6, fontSize: 14, width: '100%', boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit', background: '#fff' },
  textarea: { padding: '12px', border: '1px solid #d0d7de', borderRadius: 6, fontSize: 13, fontFamily: '"Courier New", Courier, monospace', width: '100%', boxSizing: 'border-box' as const, outline: 'none', background: '#0d1117', color: '#c9d1d9', lineHeight: 1.5, tabSize: 2 },
  btn: { padding: '8px 16px', borderRadius: 6, fontSize: 14, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' },
  btnPrimary: { background: '#2563eb', color: '#ffffff' },
  btnDanger: { background: '#dc2626', color: '#ffffff' },
  btnSecondary: { background: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db' },
  btnSuccess: { background: '#16a34a', color: '#ffffff' },
  label: { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 },
  error: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '12px 16px', color: '#dc2626', fontSize: 14, margin: '12px 0' },
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '12px 16px', color: '#16a34a', fontSize: 14, margin: '12px 0' },
  info: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '12px 16px', color: '#1d4ed8', fontSize: 14, margin: '12px 0' },
  warning: { background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, padding: '12px 16px', color: '#b45309', fontSize: 14, margin: '12px 0' },
  badge: { padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, display: 'inline-block' },
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'Never / Permanent';
  return new Date(iso).toLocaleString();
}

export function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
