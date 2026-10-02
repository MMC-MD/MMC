/*
 * Mobile menu placement
 * ---------------------
 * The header wrapper (.site-sticky-header) is position:fixed with a transform,
 * and Safari clips absolutely positioned children of such elements - so the
 * open menu could be cut off after a few items. We move the menu to <body> and
 * pin it just below the header with position:fixed (see css/style.css).
 * Sizes come from measured pixels rather than vh/dvh units, which vary across
 * browsers, zoom levels and responsive-design previews.
 */
(function () {
    'use strict';

    var GAP = 12;
    var root = document.documentElement;

    function headerBottom() {
        var headers = document.querySelectorAll('.site-sticky-header');
        var bottom = 0;
        for (var i = 0; i < headers.length; i++) {
            bottom = Math.max(bottom, headers[i].getBoundingClientRect().bottom);
        }
        return Math.round(bottom);
    }

    function measure() {
        var top = headerBottom();
        var viewport = window.innerHeight || root.clientHeight;
        root.style.setProperty('--mmc-menu-top', top + 'px');
        root.style.setProperty('--mmc-menu-avail', Math.max(200, viewport - top - GAP) + 'px');
    }

    function adopt() {
        var menus = document.querySelectorAll('#mobile-menu');
        for (var i = 0; i < menus.length; i++) {
            var menu = menus[i];
            if (menu.parentNode === document.body) continue;
            // A freshly injected header brings its own menu; drop any stale copy.
            var stale = document.querySelectorAll('body > #mobile-menu');
            for (var j = 0; j < stale.length; j++) stale[j].remove();
            document.body.appendChild(menu);
            menu.setAttribute('data-mmc-menu-adopted', '');
            if (!menu.__mmcObserved) {
                menu.__mmcObserved = true;
                new MutationObserver(function () { if (this.classList.contains('is-open')) measure(); }.bind(menu))
                    .observe(menu, { attributes: true, attributeFilter: ['class'] });
            }
        }
        measure();
    }

    if (!window.MutationObserver) return;

    adopt();
    document.addEventListener('mmc:header-ready', adopt);
    var placeholder = document.getElementById('header-placeholder');
    if (placeholder) new MutationObserver(adopt).observe(placeholder, { childList: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adopt);

    // accessibility.js wraps every <body> child in #a11y-page-wrapper when it
    // loads; pull the menu back out if that happens after we adopted it.
    new MutationObserver(adopt).observe(document.body, { childList: true });

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', measure);
})();
