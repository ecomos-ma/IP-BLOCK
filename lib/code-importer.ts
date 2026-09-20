import { extractCssContent, extractJsContent } from './release-builder';

export interface ImportResult {
  extractedCss: string;
  extractedJs: string;
  warnings: string[];
}

/**
 * Parse raw YouCan Additional Header or Footer HTML block and extract CSS / JS chunks.
 * Preserves execution semantics and emits warnings for unparseable or complex inline HTML constructs.
 */
export function importYoucanRawCode(rawHtml: string): ImportResult {
  if (!rawHtml || !rawHtml.trim()) {
    return { extractedCss: '', extractedJs: '', warnings: [] };
  }

  const warnings: string[] = [];
  const cssBlocks: string[] = [];
  const jsBlocks: string[] = [];

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(rawHtml)) !== null) {
    const cssText = extractCssContent(styleMatch[1]);
    if (cssText) cssBlocks.push(cssText);
  }

  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(rawHtml)) !== null) {
    const fullTag = scriptMatch[0];
    const jsText = extractJsContent(scriptMatch[1]);

    if (/src=["']([^"']+)["']/i.test(fullTag)) {
      const src = RegExp.$1;
      // Convert external script tag to dynamic loader in JS
      jsBlocks.push(`(function(){ var s = document.createElement('script'); s.src = "${src}"; s.async = true; document.head.appendChild(s); })();`);
    } else if (jsText) {
      jsBlocks.push(jsText);
    }
  }

  // Check for leftover HTML elements like <div>, <meta>, <link>
  const strippedHtml = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();

  if (strippedHtml.length > 0) {
    // Check if plain CSS/JS was pasted without tags
    if (cssBlocks.length === 0 && jsBlocks.length === 0) {
      if (/^\s*(?:\.|#|@|[a-z0-9_-]+)\s*\{/i.test(strippedHtml)) {
        cssBlocks.push(strippedHtml);
      } else if (/^\s*(?:var|let|const|function|window|document|\$|console|if|for|while|\()/i.test(strippedHtml)) {
        jsBlocks.push(strippedHtml);
      } else {
        warnings.push('Contains unhandled HTML markup outside <style> or <script> tags.');
      }
    } else {
      warnings.push('Extracted CSS and JavaScript blocks. Residual HTML elements were ignored for clean execution.');
    }
  }

  return {
    extractedCss: cssBlocks.join('\n\n'),
    extractedJs: jsBlocks.join('\n;\n'),
    warnings,
  };
}
