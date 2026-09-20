/* Browser-only visual guard. This is NOT server-side IP blocking. */
(function () {
  'use strict';
  if (window.__kxProtectionGuardStarted) return;
  window.__kxProtectionGuardStarted=true;
  var script=document.currentScript;
  var root=document.documentElement;
  var id=script&&script.getAttribute('data-store-id');
  var endpoint=script&&script.src?new URL('/api/guard',script.src).origin+'/api/guard':null;
  var finished=false;
  var timeout;
  function allow(){if(finished)return;finished=true;clearTimeout(timeout);root.classList.remove('kx-protection-wait');}
  function block(){if(finished)return;finished=true;clearTimeout(timeout);root.classList.remove('kx-protection-wait');root.classList.add('kx-protection-denied');
    function show(){if(!document.body)return;var curtain=document.createElement('div');curtain.id='kx-protection-curtain';curtain.style.cssText='position:fixed!important;inset:0!important;z-index:2147483647!important;background:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font:16px Arial,sans-serif!important;color:#333!important';curtain.textContent='Access Denied';document.body.appendChild(curtain)}
    if(document.body)show();else document.addEventListener('DOMContentLoaded',show,{once:true});
  }
  timeout=setTimeout(allow,3200);
  if(!id||!endpoint){allow();return;}
  fetch(endpoint+'?storeId='+encodeURIComponent(id),{mode:'cors',cache:'no-store',credentials:'omit'})
    .then(function(r){if(!r.ok)throw Error('guard request failed');return r.json()})
    .then(function(data){if(data.blocked===true||data.decision==='block')block();else allow()})
    .catch(function(error){if(window.console&&console.warn)console.warn('IP protection check unavailable; allowing page',error&&error.message||'request failed');allow()});
})();
