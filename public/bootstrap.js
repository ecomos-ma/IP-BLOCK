/**
 * YouCan Remote Code Manager — Bootstrap Loader
 * Version: 1.0.0
 *
 * This is the permanent script loaded by the YouCan installation snippet.
 * It fetches the active release manifest and applies:
 *   1. Critical CSS (inlined in manifest — no network round-trip)
 *   2. Main CSS bundle (non-blocking <link>)
 *   3. Header JavaScript (executed before DOMContentLoaded)
 *   4. IP Guard check (starts immediately, bounded timeout)
 *   5. Footer JavaScript (after DOMContentLoaded)
 *   6. Async modules (animations, widgets — non-blocking)
 *   7. Customer guard (on form-containing pages)
 *
 * PERFORMANCE ARCHITECTURE:
 * - Bootstrap itself is ~4 KB (this file, minified)
 * - Critical CSS is inlined in the manifest → zero extra network round-trips
 * - Main CSS loads as a non-blocking <link rel="stylesheet">
 * - IP guard starts in parallel with manifest fetch; does NOT block CSS or JS
 * - A bounded visibility gate hides the page ONLY during IP decision (max 3.5s)
 * - Manifest is cached for 60s (stale-while-revalidate 300s)
 * - Asset files are immutable, cached for 1 year by content hash
 * - Every step fails open — a SaaS outage does not permanently hide the store
 *
 * LIMITATION:
 * YouCan executes Additional Header Code after its own HTML is parsed.
 * If YouCan performs server-side rendering that delivers visible content before
 * this script runs, a blocked visitor may briefly see the storefront. This is a
 * fundamental limitation of JavaScript-only blocking. True edge-level blocking
 * requires a network-level proxy that YouCan does not expose to merchants.
 */
(function (global) {
  'use strict';

  // ─── Deduplication guard ─────────────────────────────────────────────────────
  if (global.__ycmBootstrapStarted) return;
  global.__ycmBootstrapStarted = true;

  // ─── Configuration from script tag ──────────────────────────────────────────
  var scriptEl = document.currentScript;
  var storeId = scriptEl && scriptEl.getAttribute('data-store-id');
  var saasOrigin = scriptEl && scriptEl.src
    ? new URL(scriptEl.src).origin
    : null;

  if (!storeId || !saasOrigin) {
    console.warn('[YCM] Missing data-store-id or script src. Bootstrap disabled.');
    return;
  }

  // ─── Constants ───────────────────────────────────────────────────────────────
  var MANIFEST_TTL = 60;          // seconds (server Cache-Control matches)
  var IP_TIMEOUT_MS = 3500;       // max wait for IP decision before fail-open
  var MANIFEST_TIMEOUT_MS = 5000; // max wait for manifest fetch

  var ROOT = document.documentElement;
  var HEAD = document.head || document.getElementsByTagName('head')[0];

  // ─── IP Protection Gate ───────────────────────────────────────────────────────
  // Start immediately (before manifest fetch) so the guard decision races
  // against manifest + CSS loads. We only apply visibility: hidden while the
  // decision is truly pending.
  var ipDecided = false;
  var ipAllowed = true;
  var ipTimer = null;

  function applyVisibilityWait() {
    ROOT.classList.add('ycm-protection-wait');
    ipTimer = setTimeout(function () {
      // Fail open — protection service timeout
      if (!ipDecided) {
        console.warn('[YCM] IP guard timeout: failing open.');
        revealStore();
      }
    }, IP_TIMEOUT_MS);
  }

  function revealStore() {
    if (ipDecided) return;
    ipDecided = true;
    if (ipTimer) clearTimeout(ipTimer);
    ROOT.classList.remove('ycm-protection-wait');
  }

  function blockStore() {
    if (ipDecided) return;
    ipDecided = true;
    if (ipTimer) clearTimeout(ipTimer);
    ROOT.classList.remove('ycm-protection-wait');
    ROOT.classList.add('ycm-protection-denied');
    function showCurtain() {
      if (!document.body) return;
      var curtain = document.createElement('div');
      curtain.id = 'ycm-protection-curtain';
      curtain.style.cssText =
        'position:fixed!important;inset:0!important;z-index:2147483647!important;' +
        'background:#fff!important;display:flex!important;align-items:center!important;' +
        'justify-content:center!important;font:16px Arial,sans-serif!important;color:#333!important';
      curtain.textContent = 'Access Denied';
      document.body.appendChild(curtain);
    }
    if (document.body) showCurtain();
    else document.addEventListener('DOMContentLoaded', showCurtain, { once: true });
  }

  // Start IP gate immediately
  applyVisibilityWait();

  // Kick off IP check in parallel with manifest fetch
  fetch(saasOrigin + '/api/guard?storeId=' + encodeURIComponent(storeId), {
    mode: 'cors', cache: 'no-store', credentials: 'omit'
  }).then(function (r) {
    if (!r.ok) throw new Error('guard ' + r.status);
    return r.json();
  }).then(function (data) {
    if (data.blocked === true || data.decision === 'block') blockStore();
    else revealStore();
  }).catch(function (err) {
    console.warn('[YCM] IP guard unavailable, failing open.', err && err.message);
    revealStore();
  });

  // ─── Manifest fetch ───────────────────────────────────────────────────────────
  var manifestUrl = saasOrigin + '/api/runtime/' + encodeURIComponent(storeId) + '/manifest';
  var manifestTimeout = setTimeout(function () {
    console.warn('[YCM] Manifest fetch timed out. Store will run without remote customizations.');
  }, MANIFEST_TIMEOUT_MS);

  fetch(manifestUrl, { mode: 'cors', cache: 'default', credentials: 'omit' })
    .then(function (r) {
      clearTimeout(manifestTimeout);
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    })
    .then(function (data) {
      var manifest = data && data.manifest;
      if (!manifest) {
        console.info('[YCM] No active release for this store.');
        return;
      }
      applyManifest(manifest);
    })
    .catch(function (err) {
      clearTimeout(manifestTimeout);
      console.warn('[YCM] Could not load manifest. Store runs without remote customizations.', err && err.message);
    });

  // ─── Apply manifest ───────────────────────────────────────────────────────────
  function applyManifest(manifest) {
    // 1. Inject critical CSS inline (already in manifest — no extra request)
    if (manifest.criticalCss) {
      var critStyle = document.createElement('style');
      critStyle.setAttribute('data-ycm', 'critical');
      critStyle.textContent = manifest.criticalCss;
      HEAD.insertBefore(critStyle, HEAD.firstChild);
    }

    // 2. Load main CSS non-blocking <link>
    if (manifest.mainCssHash) {
      loadCss(assetUrl(manifest.mainCssHash));
    }

    // 3. Execute Header JavaScript (before DOMContentLoaded)
    if (manifest.headerJsHash) {
      loadScript(assetUrl(manifest.headerJsHash), 'header', function () {});
    }

    // 4. Async modules (CSS and JS that don't need to block anything)
    var asyncModules = (manifest.modules || []).filter(function (m) {
      return m.phase === 'async' && targetMatches(m.target, m.pattern);
    });
    asyncModules.sort(function (a, b) { return a.priority - b.priority; });

    // 5. Footer JS + targeted modules — after DOM is ready
    var footerHash = manifest.footerJsHash;
    var targetedModules = (manifest.modules || []).filter(function (m) {
      return m.phase !== 'async' && m.phase !== 'critical' && targetMatches(m.target, m.pattern);
    });
    targetedModules.sort(function (a, b) { return a.priority - b.priority; });

    function runFooterPhase() {
      // Footer CSS modules
      targetedModules.filter(function (m) { return m.type === 'css'; })
        .forEach(function (m) { loadCss(assetUrl(m.hash)); });

      // Footer JS
      if (footerHash) {
        loadScript(assetUrl(footerHash), 'footer', function () {
          // Footer JS modules after main footer JS
          targetedModules.filter(function (m) { return m.type === 'js'; })
            .forEach(function (m) { loadScript(assetUrl(m.hash), 'module-' + m.name, function () {}); });
        });
      } else {
        targetedModules.filter(function (m) { return m.type === 'js'; })
          .forEach(function (m) { loadScript(assetUrl(m.hash), 'module-' + m.name, function () {}); });
      }

      // Async modules (fire and forget, truly async)
      asyncModules.forEach(function (m) {
        if (m.type === 'css') loadCss(assetUrl(m.hash));
        else if (m.type === 'js') loadScriptAsync(assetUrl(m.hash));
      });

      // Customer guard (on pages with order forms — non-blocking)
      if (manifest.customerGuard) {
        runCustomerGuard();
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runFooterPhase, { once: true });
    } else {
      runFooterPhase();
    }
  }

  // ─── Asset URL builder ────────────────────────────────────────────────────────
  function assetUrl(hash) {
    return saasOrigin + '/api/runtime/' + encodeURIComponent(storeId) + '/asset/' + hash;
  }

  // ─── CSS loader ───────────────────────────────────────────────────────────────
  function loadCss(url) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-ycm', 'css');
    link.onerror = function () { console.warn('[YCM] CSS load error:', url); };
    HEAD.appendChild(link);
  }

  // ─── Script loaders ───────────────────────────────────────────────────────────
  var scriptRegistry = {};

  function loadScript(url, key, callback) {
    if (scriptRegistry[key]) { callback && callback(); return; }
    scriptRegistry[key] = true;
    // Fetch the script text and execute with Function() to ensure proper execution
    // (unlike innerHTML-injected scripts which may not execute in all browsers)
    fetch(url, { mode: 'cors', cache: 'force-cache', credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('script ' + r.status);
        return r.text();
      })
      .then(function (code) {
        try {
          // Execute in global scope — equivalent to a <script> tag at this position
          // eslint-disable-next-line no-new-func
          (new Function(code))();
        } catch (e) {
          console.error('[YCM] Script execution error (' + key + '):', e);
        }
        callback && callback();
      })
      .catch(function (err) {
        console.warn('[YCM] Could not load script (' + key + '):', err && err.message);
        callback && callback();
      });
  }

  function loadScriptAsync(url) {
    var s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.setAttribute('data-ycm', 'async');
    s.onerror = function () { console.warn('[YCM] Async script load error:', url); };
    document.body ? document.body.appendChild(s) : HEAD.appendChild(s);
  }

  // ─── Page target matching ─────────────────────────────────────────────────────
  function targetMatches(target, pattern) {
    if (!target || target === 'all') return true;
    var path = global.location ? global.location.pathname : '';
    switch (target) {
      case 'home':         return path === '/' || path === '';
      case 'product':      return /\/products\//.test(path);
      case 'collection':   return /\/collections\//.test(path);
      case 'cart':         return /\/cart/.test(path);
      case 'confirmation': return /\/order-confirmation|\/thank[_-]you|\/success/.test(path);
      case 'pattern':      return pattern ? new RegExp(pattern).test(path) : true;
      default:             return true;
    }
  }

  // ─── Customer guard ───────────────────────────────────────────────────────────
  function runCustomerGuard() {
    // Only attach on pages that have order/checkout forms
    var forms = document.querySelectorAll('form');
    if (!forms.length) return;

    forms.forEach(function (form) {
      form.addEventListener('submit', function (evt) {
        var phoneInput = form.querySelector('[name="phone"],[name="telephone"],[name="mobile"],[type="tel"]');
        var nameInput  = form.querySelector('[name="name"],[name="full_name"],[name="billing_name"]');
        var addressInput = form.querySelector('[name="address"],[name="address1"],[name="billing_address"]');

        var phone   = phoneInput   ? phoneInput.value   : '';
        var name    = nameInput    ? nameInput.value     : '';
        var address = addressInput ? addressInput.value  : '';

        if (!phone && !name && !address) return; // nothing to check

        evt.preventDefault();
        evt.stopPropagation();

        var params = new URLSearchParams({ storeId: storeId });
        if (phone)   params.set('phone', phone);
        if (name)    params.set('name', name);
        if (address) params.set('address', address);

        fetch(saasOrigin + '/api/customer-guard?' + params.toString(), {
          mode: 'cors', cache: 'no-store', credentials: 'omit'
        }).then(function (r) {
          return r.json();
        }).then(function (data) {
          if (data.blocked === true || data.decision === 'block') {
            console.warn('[YCM] Customer check: blocked.');
            // Optionally show a user-facing message
            var msg = form.querySelector('[data-ycm-block-msg]');
            if (!msg) {
              msg = document.createElement('div');
              msg.setAttribute('data-ycm-block-msg', '1');
              msg.style.cssText = 'color:red;padding:8px;margin-top:8px;font-size:14px';
              msg.textContent = 'Your order cannot be placed at this time.';
              form.appendChild(msg);
            }
          } else {
            // Allow: re-submit without triggering our listener again
            form.removeEventListener('submit', arguments.callee);
            form.submit();
          }
        }).catch(function () {
          // Fail open — customer guard unavailable
          form.submit();
        });
      }, false);
    });
  }

})(typeof window !== 'undefined' ? window : {});
