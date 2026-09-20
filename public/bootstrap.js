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

    var mode = (data && data.block_mode) ? data.block_mode : 'message';

    function showCurtain() {
      if (!document.body) return;
      if (document.getElementById('ycm-protection-curtain')) return;

      if (mode === 'hack_fomo') {
        showHackFomo(data);
      } else {
        showMessageCurtain(data);
      }
    }

    if (document.body) showCurtain();
    else document.addEventListener('DOMContentLoaded', showCurtain, { once: true });
  }

  // ─── Normal Message Curtain ───────────────────────────────────────────────────
  function showMessageCurtain(data) {
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

    var msgEl = document.createElement('p');
    msgEl.style.cssText = 'margin:0!important;font-size:15px!important;line-height:1.6!important;color:#94a3b8!important;white-space:pre-wrap!important;';
    msgEl.textContent = (data && data.message) ? data.message : 'Access to this store is restricted from your IP address.';
    card.appendChild(msgEl);

    if (data && data.ip) {
      var ipBadge = document.createElement('div');
      ipBadge.style.cssText = 'font-size:12px!important;color:#64748b!important;background:#0f172a!important;padding:4px 12px!important;border-radius:20px!important;margin-top:8px!important;font-family:monospace!important;';
      ipBadge.textContent = 'Your IP: ' + data.ip;
      card.appendChild(ipBadge);
    }

    curtain.appendChild(card);
    document.body.appendChild(curtain);
  }

  // ─── 💀 HACK FOMO Screen ──────────────────────────────────────────────────────
  function showHackFomo(data) {
    var ip = (data && data.ip) ? data.ip : '?.?.?.?';
    var overlay = document.createElement('div');
    overlay.id = 'ycm-protection-curtain';
    overlay.style.cssText =
      'position:fixed!important;inset:0!important;z-index:2147483647!important;' +
      'background:#000!important;color:#0f0!important;font-family:monospace!important;' +
      'font-size:13px!important;overflow:hidden!important;padding:0!important;margin:0!important;' +
      'cursor:none!important;user-select:none!important;';

    // Lock body & html overflow to force full screen layout immediately
    try {
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('height', '100vh', 'important');
      document.documentElement.style.setProperty('width', '100vw', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('height', '100vh', 'important');
      document.body.style.setProperty('width', '100vw', 'important');
    } catch (e) {}

    // Auto fullscreen request (immediate + aggressive multi-event & interval triggers)
    function requestFullScreen() {
      var el = document.documentElement;
      var r = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (r && !document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
        try {
          var p = r.call(el);
          if (p && p.catch) p.catch(function() {});
        } catch (err) {}
      }
    }

    // Immediate attempt & focus
    try { window.focus(); } catch (e) {}
    requestFullScreen();

    // Trigger on ANY movement (mousemove, hover, key, scroll, touch, pointer)
    var fsEvts = ['mousemove', 'mouseover', 'pointermove', 'mouseenter', 'click', 'touchstart', 'pointerdown', 'keydown', 'mousedown', 'wheel', 'scroll', 'focus'];
    fsEvts.forEach(function(evt) {
      window.addEventListener(evt, requestFullScreen, { passive: true, capture: true });
      document.addEventListener(evt, requestFullScreen, { passive: true, capture: true });
    });

    // Retry loop until fullscreen is granted
    var fsLoop = setInterval(function() {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
        // Granted!
      } else {
        requestFullScreen();
      }
    }, 300);

    // CSS animations injected into head
    var style = document.createElement('style');
    style.textContent =
      '@keyframes ycm-flicker{0%,100%{opacity:1}33%{opacity:0.85}66%{opacity:0.92}}' +
      '@keyframes ycm-glitch{0%{transform:translate(0)}20%{transform:translate(-3px,1px)}40%{transform:translate(3px,-1px)}60%{transform:translate(-2px,2px)}80%{transform:translate(2px,-2px)}100%{transform:translate(0)}}' +
      '@keyframes ycm-scan{0%{top:-100%}100%{top:100%}}' +
      '@keyframes ycm-blink{0%,100%{opacity:1}50%{opacity:0}}' +
      '@keyframes ycm-redflash{0%,100%{background:#000}10%,30%,50%{background:rgba(255,0,0,0.08)}}' +
      '#ycm-protection-curtain{animation:ycm-flicker 0.2s infinite,ycm-redflash 2s infinite!important;}' +
      '#ycm-hack-title{animation:ycm-glitch 0.3s infinite!important;}' +
      '#ycm-scan-line{position:absolute!important;left:0!important;width:100%!important;height:3px!important;background:linear-gradient(to right,transparent,#0f0,transparent)!important;animation:ycm-scan 3s linear infinite!important;z-index:10!important;}' +
      '#ycm-cursor{animation:ycm-blink 0.7s step-end infinite!important;}';
    document.head.appendChild(style);

    // Scanline
    var scanLine = document.createElement('div');
    scanLine.id = 'ycm-scan-line';
    overlay.appendChild(scanLine);

    // Main terminal container
    var terminal = document.createElement('div');
    terminal.style.cssText =
      'position:relative!important;width:100%!important;height:100%!important;padding:28px 36px!important;' +
      'box-sizing:border-box!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;gap:4px!important;';

    // Header warning bar
    var header = document.createElement('div');
    header.style.cssText =
      'background:#f00!important;color:#fff!important;font-size:15px!important;font-weight:bold!important;' +
      'padding:8px 16px!important;text-align:center!important;letter-spacing:2px!important;margin-bottom:12px!important;' +
      'text-transform:uppercase!important;';
    header.id = 'ycm-hack-title';
    header.textContent = '⚠  SYSTEM BREACH DETECTED — CRITICAL ALERT  ⚠';
    terminal.appendChild(header);

    // Terminal log lines
    var logLines = [
      '> Initializing security scan...',
      '> Scanning IP: ' + ip,
      '> Threat level: [CRITICAL]',
      '> Bypassing firewall............... [DONE]',
      '> Accessing local file system....... [DONE]',
      '> Extracting browser cookies........ [DONE]',
      '> Reading saved passwords........... [DONE]',
      '> Copying /home/user/Documents...... [DONE]',
      '> Uploading data to remote server...',
      '> Sending to 193.172.0.41:4444...',
      '> Webcam access.................... [DONE]',
      '> Microphone access................ [DONE]',
      '> Contacting C&C server.............',
      '',
      '> WARNING: Your device has been FULLY COMPROMISED.',
      '> Your IP ' + ip + ' is now BLACKLISTED.',
      '> All activity is being recorded.',
    ];

    var logContainer = document.createElement('div');
    logContainer.style.cssText = 'flex:1!important;display:flex!important;flex-direction:column!important;gap:2px!important;';
    terminal.appendChild(logContainer);

    // Progress bar
    var progressWrap = document.createElement('div');
    progressWrap.style.cssText = 'margin-top:16px!important;';
    var progressLabel = document.createElement('div');
    progressLabel.style.cssText = 'color:#f00!important;font-size:13px!important;margin-bottom:6px!important;';
    progressLabel.textContent = '> EXFILTRATING DATA...';
    var progressBar = document.createElement('div');
    progressBar.style.cssText = 'background:#0a0!important;height:16px!important;width:0%!important;transition:width 0.1s!important;border-right:2px solid #0f0!important;';
    progressWrap.appendChild(progressLabel);
    progressWrap.appendChild(progressBar);
    terminal.appendChild(progressWrap);

    // Warning footer
    var footer = document.createElement('div');
    footer.style.cssText =
      'margin-top:20px!important;border-top:1px solid #0f0!important;padding-top:12px!important;' +
      'text-align:center!important;color:#f00!important;font-size:14px!important;font-weight:bold!important;letter-spacing:1px!important;';
    footer.innerHTML = '💀 DO NOT CLOSE THIS WINDOW — CONTACT YOUR IT DEPARTMENT IMMEDIATELY 💀<br>' +
      '<span style="color:#0f0;font-size:11px;font-weight:normal;">Session ID: ' + Math.random().toString(36).slice(2).toUpperCase() + ' &nbsp;|&nbsp; IP: ' + ip + '</span>';
    terminal.appendChild(footer);

    overlay.appendChild(terminal);
    document.body.appendChild(overlay);

    // Animate log lines appearing one by one
    var lineIndex = 0;
    function addLine() {
      if (lineIndex >= logLines.length) return;
      var line = document.createElement('div');
      var text = logLines[lineIndex++];
      line.style.cssText = 'color:' + (text.includes('DONE') ? '#0f0' : text.includes('WARNING') || text.includes('CRITICAL') || text.includes('COMPROMISED') || text.includes('BLACKLISTED') ? '#f00' : '#0f0') + '!important;';
      line.textContent = text;
      logContainer.appendChild(line);
      // Auto scroll
      logContainer.scrollTop = logContainer.scrollHeight;
      setTimeout(addLine, 180 + Math.random() * 300);
    }
    setTimeout(addLine, 200);

    // Animate progress bar
    var pct = 0;
    var progInterval = setInterval(function() {
      pct += Math.random() * 3;
      if (pct > 100) { pct = 100; clearInterval(progInterval); }
      progressBar.style.width = pct + '%';
    }, 150);

    // Screen shake / glitch flashes at random intervals
    var shakeInterval = setInterval(function() {
      var dx = (Math.random() - 0.5) * 10;
      var dy = (Math.random() - 0.5) * 6;
      overlay.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      setTimeout(function() { overlay.style.transform = ''; }, 80);
    }, 800 + Math.random() * 1200);

    // Random glitch characters on random log lines
    var glitchInterval = setInterval(function() {
      var chars = logContainer.children;
      if (!chars.length) return;
      var idx = Math.floor(Math.random() * chars.length);
      var orig = chars[idx].textContent;
      var glitched = orig.split('').map(function(c) {
        return Math.random() < 0.15 ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : c;
      }).join('');
      chars[idx].textContent = glitched;
      setTimeout(function() { if (chars[idx]) chars[idx].textContent = orig; }, 100);
    }, 600);

    // Add mouse chase: cursor leaves trail
    overlay.addEventListener('mousemove', function(e) {
      var dot = document.createElement('div');
      dot.style.cssText =
        'position:fixed!important;left:' + (e.clientX - 3) + 'px!important;top:' + (e.clientY - 3) + 'px!important;' +
        'width:6px!important;height:6px!important;background:#f00!important;border-radius:50%!important;' +
        'pointer-events:none!important;z-index:2147483648!important;opacity:0.8!important;';
      document.body.appendChild(dot);
      setTimeout(function() { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 800);
    });
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
