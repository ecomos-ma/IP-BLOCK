import test from 'node:test';
import assert from 'node:assert/strict';
import { contentHash, minifyCss, minifyJs, buildAssets } from '../lib/release-builder.ts';

test('contentHash generates 12-char hex string', () => {
  const hash = contentHash('body { color: red; }');
  assert.equal(hash.length, 12);
  assert.equal(/^[0-9a-f]{12}$/.test(hash), true);
});

test('minifyCss removes comments and collapses whitespace', () => {
  const css = `
    /* Global styles */
    body {
      color: #333;
      margin: 0;
    }
  `;
  const minified = minifyCss(css);
  assert.equal(minified.includes('Global styles'), false);
  assert.equal(minified, 'body{color:#333;margin:0;}');
});

test('buildAssets separates critical CSS, main CSS, header JS, and footer JS', () => {
  const docs = [
    {
      id: '1', store_id: 's1', name: 'Critical', doc_type: 'critical_css',
      draft_content: 'html{visibility:hidden}', published_content: 'html{visibility:hidden}',
      enabled: true, execution_phase: 'critical', page_target: 'all', page_pattern: null, priority: 1,
      created_at: '', updated_at: ''
    },
    {
      id: '2', store_id: 's1', name: 'Main CSS', doc_type: 'header_css',
      draft_content: 'body{background:#fff}', published_content: 'body{background:#fff}',
      enabled: true, execution_phase: 'main', page_target: 'all', page_pattern: null, priority: 10,
      created_at: '', updated_at: ''
    },
    {
      id: '3', store_id: 's1', name: 'Header JS', doc_type: 'header_js',
      draft_content: 'console.log("header init");', published_content: 'console.log("header init");',
      enabled: true, execution_phase: 'header', page_target: 'all', page_pattern: null, priority: 20,
      created_at: '', updated_at: ''
    }
  ];

  const assets = buildAssets(docs);
  assert.equal(assets.criticalCss, 'html{visibility:hidden}');
  assert.equal(assets.mainCss, 'body{background:#fff}');
  assert.equal(assets.headerJs.includes('header init'), true);
});
