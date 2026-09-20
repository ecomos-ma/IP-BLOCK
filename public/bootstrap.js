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

  function blockStore(data) {
    if (ipDecided) return;
    ipDecided = true;
    if (ipTimer) clearTimeout(ipTimer);
    ROOT.classList.remove('ycm-protection-wait');
    ROOT.classList.add('ycm-protection-denied');
    function showCurtain() {
      if (!document.body) return;
      if (document.getElementById('ycm-protection-curtain')) return;

      var curtain = document.createElement('div');
      curtain.id = 'ycm-protection-curtain';
      curtain.style.cssText =
        'position:fixed!important;inset:0!important;z-index:2147483647!important;' +
        'background:#0f172a!important;display:flex!important;align-items:center!important;' +
        'justify-content:center!important;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif!important;' +
        'color:#f8fafc!important;padding:24px!important;box-sizing:border-box!important;text-align:center!important;';

      var card = document.createElement('div');
      card.style.cssText =
        'max-width:520px!important;width:100%!important;background:#1e293b!important;' +
        'border:1px solid #334155!important;border-radius:16px!important;padding:36px 28px!important;' +
        'box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)!important;display:flex!important;flex-direction:column!important;' +
        'align-items:center!important;gap:16px!important;';

      var imgUrl = data && data.image_url ? data.image_url : null;
      if (imgUrl) {
        var img = document.createElement('img');
        img.src = imgUrl;
        img.style.cssText = 'max-height:160px!important;max-width:100%!important;border-radius:12px!important;object-fit:contain!important;margin-bottom:8px!important;';
        card.appendChild(img);
      } else {
        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px!important;margin-bottom:4px!important;';
        icon.textContent = '🚫';
        card.appendChild(icon);
      }

      var title = document.createElement('h2');
      title.style.cssText = 'margin:0!important;font-size:22px!important;font-weight:700!important;color:#f8fafc!important;letter-spacing:-0.4px!important;';
      title.textContent = 'Access Restricted';
      card.appendChild(title);

      var msg = document.createElement('p');
      msg.style.cssText = 'margin:0!important;font-size:15px!important;line-height:1.6!important;color:#94a3b8!important;white-space:pre-wrap!important;';
      msg.textContent = (data && data.message) ? data.message : 'Access to this store is restricted from your IP address.';
      card.appendChild(msg);

      if (data && data.ip) {
        var ipBadge = document.createElement('div');
        ipBadge.style.cssText = 'font-size:12px!important;color:#64748b!important;background:#0f172a!important;padding:4px 12px!important;border-radius:20px!important;margin-top:8px!important;font-family:monospace!important;';
        ipBadge.textContent = 'Your IP: ' + data.ip;
        card.appendChild(ipBadge);
      }

      curtain.appendChild(card);
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
    if (data.blocked === true || data.decision === 'block') blockStore(data);
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

  function executeJsOrHtml(code) {
    if (!code || !code.trim()) return;
    var trimmed = code.trim();

    // Check if payload contains HTML elements or tags
    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
      var container = document.createElement('div');
      container.innerHTML = trimmed;

      // 1. Process style tags
      var styles = container.querySelectorAll('style');
      for (var i = 0; i < styles.length; i++) {
        var st = document.createElement('style');
        st.textContent = styles[i].textContent;
        HEAD.appendChild(st);
      }

      // 2. Process link stylesheets
      var links = container.querySelectorAll('link[rel="stylesheet"]');
      for (var l = 0; l < links.length; l++) {
        var lk = document.createElement('link');
        lk.rel = 'stylesheet';
        lk.href = links[l].href || links[l].getAttribute('href');
        HEAD.appendChild(lk);
      }

      // 3. Process script tags
      var scripts = container.querySelectorAll('script');
      for (var s = 0; s < scripts.length; s++) {
        var sc = document.createElement('script');
        var src = scripts[s].getAttribute('src');
        if (src) {
          sc.src = src;
          if (scripts[s].async) sc.async = true;
          if (scripts[s].defer) sc.defer = true;
          (document.body || HEAD).appendChild(sc);
        } else {
          var inlineText = scripts[s].textContent;
          if (inlineText && inlineText.trim()) {
            try {
              (new Function(inlineText))();
            } catch (e) {
              var el = document.createElement('script');
              el.textContent = inlineText;
              (document.body || HEAD).appendChild(el);
            }
          }
        }
      }

      // 4. Process non-script non-style DOM nodes (e.g., custom HTML widgets)
      var children = Array.prototype.slice.call(container.childNodes);
      for (var c = 0; c < children.length; c++) {
        var node = children[c];
        if (node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE' && node.nodeName !== 'LINK') {
          (document.body || HEAD).appendChild(node.cloneNode(true));
        }
      }
    } else {
      // Pure JS payload
      try {
        (new Function(trimmed))();
      } catch (e) {
        console.error('[YCM] JS Execution Error:', e);
      }
    }
  }

  function loadScript(url, key, callback) {
    if (scriptRegistry[key]) { callback && callback(); return; }
    scriptRegistry[key] = true;
    fetch(url, { mode: 'cors', cache: 'force-cache', credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('script ' + r.status);
        return r.text();
      })
      .then(function (code) {
        executeJsOrHtml(code);
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
