/**
 * Montgomery Medical Clinic - Cookie Consent Banner
 * Compliant with US state privacy laws
 */
(function () {
    'use strict';

    var CONSENT_KEY = 'mmc-cookie-consent';

    // Check if already consented
    try {
        if (localStorage.getItem(CONSENT_KEY)) return;
    } catch (e) { /* proceed without check */ }

    // Build banner
    var banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent notice');
    banner.innerHTML =
        '<div class="cookie-consent-inner">' +
            '<p class="cookie-consent-text">' +
                'This website uses browser local storage to remember your language preference and third-party services (such as Google Fonts) that may set cookies. ' +
                'By continuing to use this site, you consent to these technologies. ' +
                '<a href="' + (window.location.pathname.indexOf('/pages/') !== -1 ? 'privacy-policy.html' : 'pages/privacy-policy.html') + '" class="cookie-consent-link">Learn more in our Privacy Policy</a>.' +
            '</p>' +
            '<div class="cookie-consent-actions">' +
                '<button id="cookie-accept" class="cookie-consent-accept" aria-label="Accept cookies and dismiss this notice">Accept</button>' +
                '<button id="cookie-decline" class="cookie-consent-decline" aria-label="Dismiss this notice">Dismiss</button>' +
            '</div>' +
        '</div>';

    // Inject styles
    var style = document.createElement('style');
    style.textContent =
        '#cookie-consent-banner {' +
            'position: fixed; bottom: 0; left: 0; right: 0; z-index: 999988;' +
            'background: #1a1a1a; color: #e0e0e0; padding: 16px 24px;' +
            'box-shadow: 0 -4px 20px rgba(0,0,0,0.3);' +
            'font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;' +
            'animation: cookieSlideUp 0.4s ease-out;' +
        '}' +
        '@keyframes cookieSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }' +
        '.cookie-consent-inner {' +
            'max-width: 1200px; margin: 0 auto;' +
            'display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;' +
        '}' +
        '.cookie-consent-text {' +
            'flex: 1; min-width: 280px; font-size: 0.875rem; line-height: 1.6; margin: 0; color: #bdbdbd;' +
        '}' +
        '.cookie-consent-link {' +
            'color: #90caf9; text-decoration: underline; min-height: auto; min-width: auto;' +
        '}' +
        '.cookie-consent-link:hover { color: #fff; }' +
        '.cookie-consent-actions {' +
            'display: flex; gap: 10px; flex-shrink: 0;' +
        '}' +
        '.cookie-consent-accept {' +
            'background: #0d47a1; color: #fff; border: none; padding: 10px 24px;' +
            'border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer;' +
            'min-height: 44px; transition: background 0.15s; font-family: inherit;' +
        '}' +
        '.cookie-consent-accept:hover { background: #1565c0; }' +
        '.cookie-consent-accept:focus-visible { outline: 3px solid #ff8f00; outline-offset: 2px; }' +
        '.cookie-consent-decline {' +
            'background: transparent; color: #bdbdbd; border: 1px solid #616161; padding: 10px 18px;' +
            'border-radius: 8px; font-size: 0.875rem; cursor: pointer;' +
            'min-height: 44px; transition: all 0.15s; font-family: inherit;' +
        '}' +
        '.cookie-consent-decline:hover { background: rgba(255,255,255,0.1); color: #fff; }' +
        '.cookie-consent-decline:focus-visible { outline: 3px solid #ff8f00; outline-offset: 2px; }' +
        '@media (max-width: 640px) {' +
            '#cookie-consent-banner { padding: 14px 16px; }' +
            '.cookie-consent-inner { flex-direction: column; text-align: center; }' +
            '.cookie-consent-actions { width: 100%; justify-content: center; }' +
        '}';

    document.head.appendChild(style);
    document.body.appendChild(banner);

    function dismiss(accepted) {
        try {
            localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'dismissed');
        } catch (e) { /* ignore */ }
        banner.style.animation = 'none';
        banner.style.transition = 'transform 0.3s ease-in';
        banner.style.transform = 'translateY(100%)';
        setTimeout(function () { banner.remove(); }, 350);
    }

    document.getElementById('cookie-accept').addEventListener('click', function () { dismiss(true); });
    document.getElementById('cookie-decline').addEventListener('click', function () { dismiss(false); });
})();
