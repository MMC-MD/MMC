/* Cookie / storage notice: a small card in the corner, shown once until "Got it". */
(function () {
    'use strict';
    var KEY = 'mmc-cookie-consent';
    try { if (localStorage.getItem(KEY)) return; } catch (e) { /* storage blocked: show it */ }

    var es = false;
    try { es = localStorage.getItem('mmc-lang') === 'es'; } catch (e) { /* default English */ }
    var placeholder = document.querySelector('#header-placeholder');
    var base = (placeholder && placeholder.dataset && placeholder.dataset.mmcHeaderBasePath) || '';

    var box = document.createElement('div');
    box.id = 'cookie-consent-banner';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Cookie consent notice');
    box.innerHTML = '<p class="cookie-consent-text">'
        + (es
            ? 'Usamos el almacenamiento del navegador y algunos servicios de confianza (como Google Fonts) para el funcionamiento de este sitio. <a href="' + base + 'privacy-policy/" class="cookie-consent-link">Política de privacidad</a>'
            : 'We use browser storage and a few trusted services (such as Google Fonts) to run this site. <a href="' + base + 'privacy-policy/" class="cookie-consent-link">Privacy Policy</a>')
        + '</p><button type="button" id="cookie-accept" class="cookie-consent-accept" aria-label="Accept cookies and dismiss this notice">'
        + (es ? 'Entendido' : 'Got it') + '</button>';

    var style = document.createElement('style');
    style.textContent = ''
        + '#cookie-consent-banner{position:fixed;z-index:10000002;bottom:20px;inset-inline-end:20px;max-width:380px;box-sizing:border-box;'
        + 'display:flex;align-items:center;gap:14px;padding:12px 12px 12px 16px;border-radius:14px;'
        + 'background:#fff;'
        + 'border:1px solid rgba(15,23,42,.08);box-shadow:0 1px 2px rgba(15,23,42,.06),0 18px 40px -18px rgba(15,23,42,.4);'
        + 'font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:mmc-cc-in .35s cubic-bezier(.2,.7,.3,1) both}'
        + 'html[dir=rtl] #cookie-consent-banner{padding:12px 16px 12px 12px}'
        + '#cookie-consent-banner .cookie-consent-text{margin:0;flex:1;min-width:0;font-size:12.5px;line-height:1.5;color:#475569;letter-spacing:0}'
        + '#cookie-consent-banner .cookie-consent-link{color:#0d47a1;font-weight:600;text-decoration:underline;text-underline-offset:2px;white-space:nowrap;min-height:0;min-width:0}'
        + '#cookie-consent-banner .cookie-consent-link:hover{color:#0b3c8a}'
        + '#cookie-consent-banner .cookie-consent-accept{flex-shrink:0;height:34px;min-height:34px!important;min-width:0!important;padding:0 14px;border:0;border-radius:9px;'
        + 'background:#0f172a;color:#fff;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;transition:background-color .15s ease}'
        + '#cookie-consent-banner .cookie-consent-accept:hover{background:#1e293b}'
        + '#cookie-consent-banner .cookie-consent-accept:focus-visible{outline:2px solid #ff8f00;outline-offset:2px}'
        + '@keyframes mmc-cc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
        + '@media (max-width:640px){#cookie-consent-banner{left:32px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));max-width:none;gap:12px;padding:10px 10px 10px 14px}'
        + 'html[dir=rtl] #cookie-consent-banner{padding:10px 14px 10px 10px}#cookie-consent-banner .cookie-consent-text{font-size:12px}}'
        + '@media (prefers-reduced-motion:reduce){#cookie-consent-banner{animation:none}}';
    document.head.appendChild(style);
    document.body.appendChild(box);

    document.getElementById('cookie-accept').addEventListener('click', function () {
        try { localStorage.setItem(KEY, 'accepted'); } catch (e) { /* private mode */ }
        box.style.transition = 'opacity .2s ease, transform .2s ease';
        box.style.opacity = '0';
        box.style.transform = 'translateY(8px)';
        setTimeout(function () { box.remove(); }, 220);
    });
})();
