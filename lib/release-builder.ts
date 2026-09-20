import { createHash } from 'node:crypto';
import type { CodeDocument, ReleaseManifest, ExecutionPhase } from './types';

/** Generate a 12-char hex hash for an asset content string */
export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 12);
}

/** Minify CSS — strips comments and collapses whitespace conservatively */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Light JS minification */
export function minifyJs(js: string): string {
  const stripped = js.replace(/(?<!:)\/\/[^\n]*/g, '');
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

/** Build the deployable assets from a list of enabled code documents */
export function buildAssets(docs: CodeDocument[]): BuiltAssets {
  const enabled = docs.filter(d => d.enabled && d.published_content.trim().length > 0);
  const sorted = [...enabled].sort((a, b) => a.priority - b.priority);

  const criticalParts: string[] = [];
  const mainCssParts: string[] = [];
  const headerJsParts: string[] = [];
  const footerJsParts: string[] = [];
  const moduleDocs: CodeDocument[] = [];

  for (const doc of sorted) {
    const isModule = doc.doc_type.startsWith('module_');
    if (isModule) { moduleDocs.push(doc); continue; }

    switch (doc.doc_type) {
      case 'critical_css': criticalParts.push(doc.published_content); break;
      case 'header_css':   mainCssParts.push(doc.published_content); break;
      case 'footer_css':   mainCssParts.push(doc.published_content); break;
      case 'header_js':    headerJsParts.push(doc.published_content); break;
      case 'footer_js':    footerJsParts.push(doc.published_content); break;
    }
  }

  const criticalCss = minifyCss(criticalParts.join('\n'));
  const mainCss = minifyCss(mainCssParts.join('\n'));
  const headerJs = minifyJs(headerJsParts.join('\n;\n'));
  const footerJs = minifyJs(footerJsParts.join('\n;\n'));

  const modules = moduleDocs.map(doc => {
    const type: 'css' | 'js' | 'html' = doc.doc_type === 'module_css' ? 'css'
      : doc.doc_type === 'module_js' ? 'js' : 'html';
    const content = type === 'css' ? minifyCss(doc.published_content)
      : type === 'js' ? minifyJs(doc.published_content)
      : doc.published_content;
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
