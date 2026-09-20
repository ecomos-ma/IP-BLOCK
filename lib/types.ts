// Shared TypeScript types for the YouCan Code Management SaaS
// Used across API routes, dashboard pages, and lib modules

// ─── Store ────────────────────────────────────────────────────────────────────
export interface Store {
  id: string;
  owner_id: string;
  hostname: string;
  name: string | null;
  description: string | null;
  status: 'active' | 'suspended';
  license_expires_at: string | null;
  verification_token: string | null;
  verified_at: string | null;
  block_message?: string | null;
  block_image_url?: string | null;
  block_mode?: 'message' | 'hack_fomo' | null;
  created_at: string;
  updated_at?: string;
}

// ─── IP Rules ─────────────────────────────────────────────────────────────────
export interface IpRule {
  id: string;
  store_id: string;
  ip: string;
  enabled: boolean;
  starts_at: string;
  expires_at: string | null;
  note: string;
  created_at: string;
}

// ─── Code Documents ───────────────────────────────────────────────────────────
export type DocType =
  | 'header_css' | 'header_js'
  | 'footer_css' | 'footer_js'
  | 'module_css' | 'module_js' | 'module_html'
  | 'critical_css';

export type ExecutionPhase = 'critical' | 'main' | 'header' | 'footer' | 'async';

export type PageTarget = 'all' | 'home' | 'product' | 'collection' | 'cart' | 'confirmation' | 'pattern';

export interface CodeDocument {
  id: string;
  store_id: string;
  name: string;
  doc_type: DocType;
  draft_content: string;
  published_content: string;
  enabled: boolean;
  execution_phase: ExecutionPhase;
  page_target: PageTarget;
  page_pattern: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

// ─── Releases ─────────────────────────────────────────────────────────────────
export interface ReleaseManifest {
  storeId: string;
  version: number;
  publishedAt: string;
  criticalCss: string;          // inlined CSS string (small, blocking)
  mainCssHash: string | null;   // content hash → /api/runtime/[id]/asset/[hash]
  headerJsHash: string | null;
  footerJsHash: string | null;
  modules: Array<{
    name: string;
    type: 'css' | 'js' | 'html';
    hash: string;
    phase: ExecutionPhase;
    target: PageTarget;
    pattern?: string;
    priority: number;
  }>;
  ipGuard: boolean;
  customerGuard: boolean;
}

export interface Release {
  id: string;
  store_id: string;
  version_number: number;
  published_by: string | null;
  published_at: string;
  is_active: boolean;
  notes: string;
  manifest: ReleaseManifest;
}

export interface ReleaseAsset {
  id: string;
  store_id: string;
  release_id: string;
  asset_type: 'css' | 'js' | 'html' | 'json';
  content_hash: string;
  content: string;
  content_length: number;
  created_at: string;
}

// ─── Customer Rules ───────────────────────────────────────────────────────────
export type CustomerRuleType = 'phone' | 'name' | 'address' | 'address_contains';

export interface CustomerRule {
  id: string;
  store_id: string;
  rule_type: CustomerRuleType;
  value: string;
  normalized_value: string;
  enabled: boolean;
  reason: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  store_id: string | null;
  actor_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────
export interface ApiError { error: string }
