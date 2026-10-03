/*
 * Site-wide translation (header language menu).
 *
 * English is the source text. Spanish keeps using the original Español system
 * (data-en / data-es + js/lang-toggle.js). French, Arabic, Hebrew and Chinese
 * (plus page extras such as Italian on Immigration Physicals) use hand-written
 * dictionaries in js/i18n/site.<lang>.js:
 *
 *   window.MMC_I18N_SITE = { fr: { "<English text>": "<translation, may contain inline tags>" } }
 *
 * Keys are a block's English text with whitespace collapsed. Inline tags in a
 * translation (<strong>, <a>, <span>…) receive the attributes of the original
 * block's tags of the same name, in order, so URLs and classes never need to be
 * repeated in a dictionary. Content added later (header, footer, banners,
 * slides, filters, search results) is translated as it appears.
 *
 * Changing language stores the choice and reloads the page, so every script
 * starts from a clean state. Arabic and Hebrew switch the page to right-to-left.
 */
(function () {
    'use strict';

    var STORE = 'mmc-site-lang';
    var LANGS = [
        { code: 'en', name: 'English', en: 'English' },
        { code: 'es', name: 'Español', en: 'Spanish' },
        { code: 'fr', name: 'Français', en: 'French' },
        { code: 'ar', name: 'العربية', en: 'Arabic', rtl: true },
        { code: 'he', name: 'עברית', en: 'Hebrew', rtl: true },
        { code: 'zh', name: '中文', en: 'Chinese', tag: 'zh-Hans' }
    ];
    var EXTRA = { it: { code: 'it', name: 'Italiano', en: 'Italian' } };
    var INLINE = { STRONG: 1, B: 1, EM: 1, I: 1, BR: 1, SPAN: 1, SMALL: 1, SUP: 1, SUB: 1, A: 1, CODE: 1 };
    var SKIP = 'script,style,noscript,svg,textarea,[data-pt-skip],.mmc-lang,.mmc-lang-menu,[data-minlu-bio-view="zh"],#med-results-list';
    var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

    // Page-specific extra languages: <meta name="mmc-extra-langs" content="it">
    var extraMeta = document.querySelector('meta[name="mmc-extra-langs"]');
    (extraMeta ? extraMeta.content.split(/[\s,]+/) : []).forEach(function (c) { if (EXTRA[c]) LANGS.push(EXTRA[c]); });
    function info(code) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i]; return null; }

    var stored = get(STORE);
    var current = get('mmc-lang') === 'es' ? 'es' : (stored && info(stored) ? stored : 'en');
    var active = current !== 'en' && current !== 'es';
    var doc = document.documentElement;

    /* ── Choosing a language ── */

    function choose(code) {
        if (code === current) return;
        set(STORE, code);
        set('mmc-lang', code === 'es' ? 'es' : 'en');
        location.reload();
    }

    /* ── Menu (header) ── */

    var GLOBE = '<svg class="mmc-lang-globe" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.25" stroke="currentColor" stroke-width="1.5"/><path d="M2.75 10h14.5M10 2.75c2 2.1 3 4.5 3 7.25s-1 5.15-3 7.25c-2-2.1-3-4.5-3-7.25s1-5.15 3-7.25Z" stroke="currentColor" stroke-width="1.5"/></svg>';
    var CHEV = '<svg class="mmc-lang-chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function buildMenu(anchor) {
        if (!anchor || anchor.parentNode.querySelector('.mmc-lang')) return;
        var cur = info(current) || LANGS[0];
        var wrap = document.createElement('div');
        wrap.className = 'mmc-lang';
        wrap.setAttribute('data-pt-skip', '');
        wrap.innerHTML = '<button type="button" class="mmc-lang-btn" aria-haspopup="true" aria-expanded="false" aria-label="Language / Idioma / Langue / اللغة / שפה / 语言">'
            + GLOBE + '<span class="mmc-lang-cur" lang="' + (cur.tag || cur.code) + '">' + cur.name + '</span>' + CHEV + '</button>'
            + '<ul class="mmc-lang-menu" role="menu" data-pt-skip>' + LANGS.map(function (l) {
                return '<li><button type="button" role="menuitemradio" aria-checked="' + (l.code === current) + '" data-lang="' + l.code + '"'
                    + (l.code === current ? ' class="is-active"' : '') + '><span lang="' + (l.tag || l.code) + '"' + (l.rtl ? ' dir="rtl"' : '') + '>'
                    + l.name + '</span><small>' + l.en + '</small></button></li>';
            }).join('') + '</ul>';
        anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
        var btn = wrap.querySelector('.mmc-lang-btn');
        var menu = wrap.querySelector('.mmc-lang-menu');
        // The menu lives on <body>, positioned under the button. Inside the header
        // it was cropped by the top bar and, in Safari, painted over by the
        // blurred nav row on hover.
        document.querySelectorAll('body > .mmc-lang-menu').forEach(function (m) { if (!m.__ptOwner || !m.__ptOwner.isConnected) m.remove(); });
        menu.__ptOwner = wrap;
        document.body.appendChild(menu);
        function place() {
            var r = btn.getBoundingClientRect();
            menu.style.top = Math.round(r.bottom + 8) + 'px';
            if (doc.dir === 'rtl') { menu.style.left = Math.round(r.left) + 'px'; menu.style.right = 'auto'; }
            else { menu.style.right = Math.round(document.documentElement.clientWidth - r.right) + 'px'; menu.style.left = 'auto'; }
        }
        function open(on) {
            wrap.classList.toggle('is-open', on);
            menu.classList.toggle('is-open', on);
            btn.setAttribute('aria-expanded', on ? 'true' : 'false');
            if (on) { place(); (menu.querySelector('.is-active') || menu.querySelector('button')).focus({ preventScroll: true }); }
        }
        function replace() { if (wrap.classList.contains('is-open')) place(); }
        window.addEventListener('resize', replace);
        window.addEventListener('scroll', replace, { passive: true });
        btn.addEventListener('click', function (e) { e.stopPropagation(); open(!wrap.classList.contains('is-open')); });
        menu.addEventListener('click', function (e) {
            var b = e.target.closest('[data-lang]');
            if (b) choose(b.getAttribute('data-lang'));
        });
        menu.addEventListener('keydown', function (e) {
            var items = Array.prototype.slice.call(menu.querySelectorAll('button'));
            var i = items.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        });
        document.addEventListener('click', function (e) { if (!wrap.contains(e.target) && !menu.contains(e.target)) open(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && wrap.classList.contains('is-open')) { open(false); btn.focus(); } });
    }

    function mountMenus() {
        document.querySelectorAll('#lang-toggle').forEach(buildMenu);
    }

    /* ── Translation ── */

    function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
    function dict() { return (window.MMC_I18N_SITE || {})[current] || null; }

    function isUnit(el) {
        if (!norm(el.textContent)) return false;
        var all = el.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) if (!INLINE[all[i].tagName]) return false;
        // Section-bar links carry live handlers: translate each link's text only.
        if (el.tagName !== 'A' && el.closest('.mmc-subnav')) return false;
        // Live parts (weekend hours, hidden toggles) are left to their own scripts.
        if (el.querySelector('[data-pt-skip]')) return false;
        return true;
    }

    function restoreAttrs(el, originals) {
        var seen = {};
        Array.prototype.forEach.call(el.getElementsByTagName('*'), function (node) {
            var t = node.tagName;
            var list = originals[t] || [];
            var src = list[seen[t] = (seen[t] || 0)] || list[list.length - 1];
            seen[t]++;
            if (!src) return;
            for (var i = 0; i < src.attributes.length; i++) {
                var a = src.attributes[i];
                if (!node.hasAttribute(a.name)) node.setAttribute(a.name, a.value);
            }
        });
    }

    function translateUnit(el, map) {
        var key = norm(el.textContent);
        var tr = map[key];
        // Other scripts (e.g. the Spanish toggle) may put the English back later;
        // only the current text decides, so those blocks are translated again.
        if (!tr || norm(tr.replace(/<[^>]+>/g, '')) === key) return;
        var originals = {};
        Array.prototype.forEach.call(el.getElementsByTagName('*'), function (n) { (originals[n.tagName] = originals[n.tagName] || []).push(n.cloneNode(false)); });
        if (tr.indexOf('<') >= 0) { el.innerHTML = tr; restoreAttrs(el, originals); }
        else el.textContent = tr;
        el.__ptDone = tr;
    }

    function walk(root, map) {
        if (root.nodeType !== 1 || (root.matches && root.matches(SKIP))) return;
        if (root !== document.body && isUnit(root)) { translateUnit(root, map); return; }
        for (var n = root.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 1) walk(n, map);
            else if (n.nodeType === 3) {
                var key = norm(n.nodeValue);
                var tr = key && map[key];
                if (tr) { var v = n.nodeValue; n.nodeValue = /^\s*/.exec(v)[0] + tr + /\s*$/.exec(v)[0]; }
            }
        }
    }

    function translateAttrs(map) {
        document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(function (el) {
            if (el.closest('.mmc-lang, .mmc-lang-menu')) return;
            ATTRS.forEach(function (a) {
                var v = el.getAttribute(a);
                var tr = v && map[norm(v)];
                if (tr) el.setAttribute(a, tr.replace(/<[^>]+>/g, ''));
            });
        });
    }

    var busy = false;
    function pass() {
        var map = dict();
        if (!map || !document.body) return;
        busy = true;
        walk(document.body, map);
        translateAttrs(map);
        busy = false;
        if (current === 'zh' && typeof window.setMinLuBioView === 'function' && !pass.lu) { pass.lu = true; window.setMinLuBioView('zh'); }
    }

    var queued = false;
    function schedule() {
        if (queued || busy) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(function () { queued = false; pass(); reveal(); });
    }

    function reveal() {
        var header = document.getElementById('header-placeholder');
        if (!header || header.getAttribute('data-mmc-header-inserted') === 'true') doc.classList.remove('pt-pending');
    }

    function applyDocument() {
        var l = info(current);
        doc.setAttribute('data-pt-lang', current);
        doc.lang = l.tag || l.code;
        if (l.rtl) doc.dir = 'rtl'; else doc.removeAttribute('dir');
    }

    function start() {
        mountMenus();
        new MutationObserver(function () { mountMenus(); if (active) schedule(); })
            .observe(document.body, { childList: true, subtree: true, characterData: true });
        if (!active) return;
        applyDocument();
        // Other scripts reset <html lang> (e.g. the Spanish toggle); keep ours.
        new MutationObserver(function () { if (doc.getAttribute('data-pt-lang') !== current || (doc.lang || '').slice(0, 2) !== current) applyDocument(); })
            .observe(doc, { attributes: true, attributeFilter: ['lang', 'dir', 'data-pt-lang'] });
        function go() { if (dict()) { pass(); reveal(); } else setTimeout(go, 40); }
        go();
        setTimeout(function () { doc.classList.remove('pt-pending'); }, 2500);
    }

    window.mmcSiteTranslate = { current: function () { return current; }, choose: choose, pass: pass };

    if (active && !dict()) {
        // The early head snippet normally starts this download; make sure it happens.
        if (!document.querySelector('script[data-pt-dict]')) {
            var s = document.createElement('script');
            s.src = '/js/i18n/site.' + current + '.js?v=' + (window.MMC_PT_V || '1');
            s.setAttribute('data-pt-dict', '');
            document.head.appendChild(s);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
