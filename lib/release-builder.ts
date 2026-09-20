import type { CodeDocument, ReleaseManifest, ExecutionPhase } from './types';

/** Extract pure CSS content by stripping any surrounding HTML <style> tags safely */
export function extractCssContent(input: string): string {
  if (!input) return '';
  let str = input.trim();
  // Strip opening <style...> tags (case insensitive)
  str = str.replace(/^<style[^>]*>/i, '');
  // Strip closing </style> tags (case insensitive)
  str = str.replace(/<\/style>/gi, '');
  return str.trim();
}

/** Extract pure JS content by stripping any surrounding HTML <script> tags safely */
export function extractJsContent(input: string): string {
  if (!input) return '';
  let str = input.trim();
  // Strip opening <script...> tags (case insensitive)
  str = str.replace(/^<script[^>]*>/i, '');
  // Strip closing </script> tags (case insensitive)
  str = str.replace(/<\/script>/gi, '');
  return str.trim();
}

/** Generate a 12-char hex hash for an asset content string (pure JS, browser and Node compatible) */
export function contentHash(content: string): string {
  let h1 = 0xdeadbeef ^ content.length;
  let h2 = 0x41c6ce57 ^ content.length;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (hex1 + hex2).slice(0, 12);
}

/** Minify CSS — strips comments and collapses whitespace conservatively without corrupting selectors or CSS variables */
export function minifyCss(css: string): string {
  const clean = extractCssContent(css);
  if (!clean) return '';
  return clean
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Light JS minification preserving line breaks for safety */
export function minifyJs(js: string): string {
  const clean = extractJsContent(js);
  if (!clean) return '';
  const stripped = clean.replace(/(?<!:)\/\/[^\n]*/g, '');
  return stripped.replace(/\n{3,}/g, '\n\n').trim();
}

export interface BuiltAssets {
  criticalCss: string;
  mainCss: string;
  headerJs: string;
  footerJs: string;
  modules: Array<{
    name: string;
    type: 'css' | 'js' | 'html';
    content: string;
    phase: ExecutionPhase;
    target: string;
    pattern?: string;
    priority: number;
  }>;
}

/** Build deployable assets from a list of enabled code documents */
export function buildAssets(docs: CodeDocument[]): BuiltAssets {
  const enabled = docs.filter(d => {
    const content = (d.published_content || d.draft_content || '').trim();
    return d.enabled && content.length > 0;
  });
  const sorted = [...enabled].sort((a, b) => a.priority - b.priority);

  const criticalParts: string[] = [];
  const mainCssParts: string[] = [];
  const headerJsParts: string[] = [];
  const footerJsParts: string[] = [];
  const moduleDocs: CodeDocument[] = [];

  for (const doc of sorted) {
    const rawContent = doc.published_content || doc.draft_content || '';
    const isModule = doc.doc_type.startsWith('module_');
    if (isModule) { moduleDocs.push({ ...doc, published_content: rawContent, draft_content: rawContent }); continue; }

    switch (doc.doc_type) {
      case 'critical_css': criticalParts.push(extractCssContent(rawContent)); break;
      case 'header_css':   mainCssParts.push(extractCssContent(rawContent)); break;
      case 'footer_css':   mainCssParts.push(extractCssContent(rawContent)); break;
      case 'header_js':    headerJsParts.push(extractJsContent(rawContent)); break;
      case 'footer_js':    footerJsParts.push(extractJsContent(rawContent)); break;
    }
  }

  const criticalCss = minifyCss(criticalParts.join('\n'));
  const mainCss = minifyCss(mainCssParts.join('\n'));
  const headerJs = minifyJs(headerJsParts.join('\n;\n'));
  const footerJs = minifyJs(footerJsParts.join('\n;\n'));

  const modules = moduleDocs.map(doc => {
    const type: 'css' | 'js' | 'html' = doc.doc_type === 'module_css' ? 'css'
      : doc.doc_type === 'module_js' ? 'js' : 'html';
    const content = type === 'css' ? minifyCss(doc.published_content || doc.draft_content || '')
      : type === 'js' ? minifyJs(doc.published_content || doc.draft_content || '')
      : (doc.published_content || doc.draft_content || '');
    return {
      name: doc.name,
      type,
      content,
      phase: doc.execution_phase,
      target: doc.page_target,
      pattern: doc.page_pattern ?? undefined,
      priority: doc.priority,
    };
  });

  return { criticalCss, mainCss, headerJs, footerJs, modules };
}

/** Build the release manifest from built assets + hashes */
export function buildManifest(
  storeId: string,
  version: number,
  assets: BuiltAssets,
  assetHashMap: Map<string, string>,
): ReleaseManifest {
  const getHash = (content: string) => content ? (assetHashMap.get(content) ?? contentHash(content)) : null;

  return {
    storeId,
    version,
    publishedAt: new Date().toISOString(),
    criticalCss: assets.criticalCss,
    mainCssHash: assets.mainCss ? getHash(assets.mainCss) : null,
    headerJsHash: assets.headerJs ? getHash(assets.headerJs) : null,
    footerJsHash: assets.footerJs ? getHash(assets.footerJs) : null,
    modules: assets.modules.map(m => ({
      name: m.name,
      type: m.type,
      hash: getHash(m.content) ?? contentHash(m.content),
      phase: m.phase,
      target: m.target as ReleaseManifest['modules'][0]['target'],
      pattern: m.pattern,
      priority: m.priority,
    })),
    ipGuard: true,
    customerGuard: true,
  };
}
