import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Store, IpRule, CodeDocument, Release, ReleaseManifest, CustomerRule, AuditLog} from './types';

export const DEMO_OWNER_ID = 'demo-owner';
export const DEMO_STORE_ID = '00000000-0000-4000-8000-000000000001';

type DemoState = {
  stores: Store[];
  ip_rules: IpRule[];
  code_documents: CodeDocument[];
  releases: Release[];
  customer_rules: CustomerRule[];
  audit_logs: AuditLog[];
};

const file = join(process.cwd(), '.data', 'demo-store.json');

function initialState(): DemoState {
  const now = new Date().toISOString();
  const storeId = DEMO_STORE_ID;
  const headerCssId = '00000000-0000-4000-8000-000000000010';
  const headerJsId  = '00000000-0000-4000-8000-000000000011';
  const footerJsId  = '00000000-0000-4000-8000-000000000012';
  return {
    stores: [{
      id: storeId,
      owner_id: DEMO_OWNER_ID,
      hostname: 'demo.example.com',
      name: 'Demo Store',
      description: 'Local development demo store',
      status: 'active',
      license_expires_at: null,
      verification_token: 'demo-verify-token',
      verified_at: now,
      created_at: now,
    }],
    ip_rules: [{
      id: '00000000-0000-4000-8000-000000000002',
      store_id: storeId,
      ip: '196.118.93.179',
      enabled: true,
      starts_at: now,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      note: 'Seeded 24-hour demo block',
      created_at: now,
    }],
    code_documents: [
      {
        id: headerCssId,
        store_id: storeId,
        name: 'Main Store CSS',
        doc_type: 'header_css',
        draft_content: '/* Paste your Header CSS here */\n',
        published_content: '',
        enabled: true,
        execution_phase: 'main',
        page_target: 'all',
        page_pattern: null,
        priority: 10,
        created_at: now,
        updated_at: now,
      },
      {
        id: headerJsId,
        store_id: storeId,
        name: 'Header JavaScript',
        doc_type: 'header_js',
        draft_content: '// Paste your Header JS here\n',
        published_content: '',
        enabled: true,
        execution_phase: 'header',
        page_target: 'all',
        page_pattern: null,
        priority: 20,
        created_at: now,
        updated_at: now,
      },
      {
        id: footerJsId,
        store_id: storeId,
        name: 'Footer JavaScript',
        doc_type: 'footer_js',
        draft_content: '// Paste your Footer JS here\n',
        published_content: '',
        enabled: true,
        execution_phase: 'footer',
        page_target: 'all',
        page_pattern: null,
        priority: 30,
        created_at: now,
        updated_at: now,
      },
    ],
    releases: [],
    customer_rules: [],
    audit_logs: [],
  };
}

function read(): DemoState {
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<DemoState>;
    // Merge with initial to fill in any missing new keys from upgrades
    const initial = initialState();
    return {
      stores: raw.stores ?? initial.stores,
      ip_rules: raw.ip_rules ?? initial.ip_rules,
      code_documents: raw.code_documents ?? initial.code_documents,
      releases: raw.releases ?? initial.releases,
      customer_rules: raw.customer_rules ?? initial.customer_rules,
      audit_logs: raw.audit_logs ?? initial.audit_logs,
    };
  } catch {
    const state = initialState();
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, JSON.stringify(state, null, 2));
    return state;
  }
}

function write(state: DemoState) {
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(state, null, 2));
}

// ─── Stores ───────────────────────────────────────────────────────────────────
export function demoStores() { return read().stores; }
export function demoStore(storeId: string) { return read().stores.find(s => s.id === storeId) ?? null; }
export function demoCreateStore(hostname: string, name?: string, description?: string): Store {
  const state = read();
  if (state.stores.some(s => s.hostname === hostname)) throw new Error('duplicate');
  const store: Store = {
    id: randomUUID(), owner_id: DEMO_OWNER_ID, hostname,
    name: name ?? hostname, description: description ?? null,
    status: 'active', license_expires_at: null,
    verification_token: randomUUID(), verified_at: null,
    created_at: new Date().toISOString(),
  };
  state.stores.push(store); write(state); return store;
}
export function demoUpdateStore(storeId: string, change: Partial<Pick<Store,'name'|'description'|'status'|'verified_at'|'verification_token'>>) {
  const state = read();
  const store = state.stores.find(s => s.id === storeId);
  if (!store) return null;
  Object.assign(store, change);
  write(state); return store;
}

// ─── IP Rules ─────────────────────────────────────────────────────────────────
export function demoRules(storeId: string) {
  return read().ip_rules.filter(r => r.store_id === storeId).sort((a,b) => b.created_at.localeCompare(a.created_at));
}
export function demoCreateRule(input: Omit<IpRule,'id'|'created_at'>): IpRule {
  const state = read();
  if (state.ip_rules.some(r => r.store_id === input.store_id && r.ip === input.ip)) throw new Error('duplicate');
  const rule: IpRule = {...input, id: randomUUID(), created_at: new Date().toISOString()};
  state.ip_rules.push(rule); write(state); return rule;
}
export function demoRule(ruleId: string) { return read().ip_rules.find(r => r.id === ruleId) ?? null; }
export function demoUpdateRule(ruleId: string, change: Partial<Pick<IpRule,'enabled'|'expires_at'|'note'>>) {
  const state = read();
  const rule = state.ip_rules.find(r => r.id === ruleId);
  if (!rule) return null;
  Object.assign(rule, change); write(state); return rule;
}
export function demoDeleteRule(ruleId: string) {
  const state = read();
  const before = state.ip_rules.length;
  state.ip_rules = state.ip_rules.filter(r => r.id !== ruleId);
  write(state); return before !== state.ip_rules.length;
}

// ─── Code Documents ───────────────────────────────────────────────────────────
export function demoCodeDocs(storeId: string) {
  return read().code_documents.filter(d => d.store_id === storeId).sort((a,b) => a.priority - b.priority);
}
export function demoCodeDoc(docId: string) { return read().code_documents.find(d => d.id === docId) ?? null; }
export function demoCreateCodeDoc(input: Omit<CodeDocument,'id'|'created_at'|'updated_at'>): CodeDocument {
  const state = read();
  const now = new Date().toISOString();
  const doc: CodeDocument = {...input, id: randomUUID(), created_at: now, updated_at: now};
  state.code_documents.push(doc); write(state); return doc;
}
export function demoUpdateCodeDoc(docId: string, change: Partial<Omit<CodeDocument,'id'|'store_id'|'created_at'>>) {
  const state = read();
  const doc = state.code_documents.find(d => d.id === docId);
  if (!doc) return null;
  Object.assign(doc, change, {updated_at: new Date().toISOString()});
  write(state); return doc;
}
export function demoDeleteCodeDoc(docId: string) {
  const state = read();
  const before = state.code_documents.length;
  state.code_documents = state.code_documents.filter(d => d.id !== docId);
  write(state); return before !== state.code_documents.length;
}

// ─── Releases ─────────────────────────────────────────────────────────────────
export function demoReleases(storeId: string) {
  return read().releases.filter(r => r.store_id === storeId).sort((a,b) => b.version_number - a.version_number);
}
export function demoActiveRelease(storeId: string) {
  return read().releases.find(r => r.store_id === storeId && r.is_active) ?? null;
}
export function demoCreateRelease(input: Omit<Release,'id'>): Release {
  const state = read();
  // Deactivate existing active release for this store
  state.releases.forEach(r => { if (r.store_id === input.store_id) r.is_active = false; });
  const release: Release = {...input, id: randomUUID()};
  state.releases.push(release); write(state); return release;
}
export function demoActivateRelease(releaseId: string) {
  const state = read();
  const target = state.releases.find(r => r.id === releaseId);
  if (!target) return null;
  state.releases.forEach(r => { if (r.store_id === target.store_id) r.is_active = false; });
  target.is_active = true; write(state); return target;
}

// ─── Customer Rules ───────────────────────────────────────────────────────────
export function demoCustomerRules(storeId: string) {
  return read().customer_rules.filter(r => r.store_id === storeId).sort((a,b) => b.created_at.localeCompare(a.created_at));
}
export function demoCustomerRule(ruleId: string) { return read().customer_rules.find(r => r.id === ruleId) ?? null; }
export function demoCreateCustomerRule(input: Omit<CustomerRule,'id'|'created_at'|'updated_at'>): CustomerRule {
  const state = read();
  const now = new Date().toISOString();
  const rule: CustomerRule = {...input, id: randomUUID(), created_at: now, updated_at: now};
  state.customer_rules.push(rule); write(state); return rule;
}
export function demoUpdateCustomerRule(ruleId: string, change: Partial<Pick<CustomerRule,'enabled'|'reason'|'expires_at'|'value'|'normalized_value'>>) {
  const state = read();
  const rule = state.customer_rules.find(r => r.id === ruleId);
  if (!rule) return null;
  Object.assign(rule, change, {updated_at: new Date().toISOString()});
  write(state); return rule;
}
export function demoDeleteCustomerRule(ruleId: string) {
  const state = read();
  const before = state.customer_rules.length;
  state.customer_rules = state.customer_rules.filter(r => r.id !== ruleId);
  write(state); return before !== state.customer_rules.length;
}

// ─── Audit ────────────────────────────────────────────────────────────────────
export function demoAuditLogs(storeId: string) {
  return read().audit_logs
    .filter(l => l.store_id === storeId)
    .sort((a,b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 100);
}
export function demoAppendAudit(entry: Omit<AuditLog,'id'|'created_at'>) {
  const state = read();
  state.audit_logs.push({...entry, id: randomUUID(), created_at: new Date().toISOString()});
  // Keep latest 500 entries only to avoid unbounded growth
  if (state.audit_logs.length > 500) state.audit_logs = state.audit_logs.slice(-500);
  write(state);
}
