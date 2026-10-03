/*
 * Whole-page translation for guide pages (first used on Immigration Physicals).
 *
 * Markup: a .pt-switch in the hero with a toggle button and a menu of
 * <button data-pt-lang="xx">. Each language's strings live in
 * js/i18n/<page>.<lang>.js (window.MMC_I18N[<page>][<lang>] = {...}), loaded on demand.
 * Keys are the English text of a block (whitespace-normalised); values may
 * contain inline HTML. Links in a value get the attributes of the original
 * block's links, in order, so translations never need to repeat URLs.
 *
 * English is the source. Spanish uses the site-wide Español toggle (js/lang-toggle.js).
 * Arabic and Hebrew switch the translated sections to right-to-left.
 */
(function () {
    'use strict';

    var root = document.querySelector('.pt-switch');
    if (!root) return;

    var PAGE = root.getAttribute('data-pt-page');
    var BASE = root.getAttribute('data-pt-base') || '';
    var STORE_KEY = 'mmc-pt-' + PAGE;
    var SCOPE = 'section#main-content, section.hp-section, section#faq, section.mmc-cta, .mmc-subnav';
    var SKIP = '.pt-switch, script, style, noscript, svg, [data-pt-skip]';
    var INLINE = { STRONG: 1, B: 1, EM: 1, I: 1, BR: 1, SPAN: 1, SMALL: 1, SUP: 1, SUB: 1, A: 1 };
    var RTL = { ar: 1, he: 1 };

    window.MMC_I18N = window.MMC_I18N || {};
    var saved = [];
    var current = 'en';

    function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
    function siteLang() { try { return localStorage.getItem('mmc-lang') || 'en'; } catch (e) { return 'en'; } }
    function dict(lang) { return (window.MMC_I18N[PAGE] || {})[lang]; }

    function isUnit(el) {
        if (!norm(el.textContent)) return false;
        // Section-bar links keep their elements (they carry live handlers): translate each link's text only.
        if (el.tagName !== 'A' && el.closest('.mmc-subnav')) return false;
        var all = el.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) if (!INLINE[all[i].tagName]) return false;
        return true;
    }

    function units() {
        var out = [];
        document.querySelectorAll(SCOPE).forEach(function (scope) {
            (function walk(el) {
                if (el.matches && el.matches(SKIP)) return;
                if (el !== scope && isUnit(el)) { out.push({ el: el, key: norm(el.textContent) }); return; }
                Array.prototype.forEach.call(el.childNodes, function (n) {
                    if (n.nodeType === 1) walk(n);
                    else if (n.nodeType === 3 && norm(n.nodeValue)) out.push({ text: n, key: norm(n.nodeValue) });
                });
            })(scope);
        });
        return out;
    }

    function restore() {
        for (var i = saved.length - 1; i >= 0; i--) {
            var s = saved[i];
            if (s.html !== undefined) { s.node.innerHTML = s.html; s.node.removeAttribute('lang'); }
            else s.node.nodeValue = s.text;
        }
        saved = [];
        document.querySelectorAll(SCOPE).forEach(function (el) { el.removeAttribute('dir'); });
        document.documentElement.removeAttribute('data-pt-lang');
        current = 'en';
    }

    function apply(lang) {
        var map = dict(lang);
        if (!map) return;
        restore();
        units().forEach(function (u) {
            var tr = map[u.key];
            if (!tr) return;
            if (u.el) {
                var links = Array.prototype.slice.call(u.el.querySelectorAll('a'));
                saved.push({ node: u.el, html: u.el.innerHTML });
                u.el.innerHTML = tr;
                u.el.setAttribute('lang', lang);
                u.el.querySelectorAll('a').forEach(function (a, i) {
                    var src = links[i] || links[links.length - 1];
                    if (!src) return;
                    Array.prototype.forEach.call(src.attributes, function (at) { if (!a.hasAttribute(at.name)) a.setAttribute(at.name, at.value); });
                });
            } else {
                saved.push({ node: u.text, text: u.text.nodeValue });
                var v = u.text.nodeValue;
                u.text.nodeValue = /^\s*/.exec(v)[0] + tr + /\s*$/.exec(v)[0];
            }
        });
        if (RTL[lang]) document.querySelectorAll(SCOPE).forEach(function (el) { el.setAttribute('dir', 'rtl'); });
        document.documentElement.setAttribute('data-pt-lang', lang);
        current = lang;
    }

    function load(lang, done) {
        if (lang === 'en' || lang === 'es' || dict(lang)) { done(); return; }
        var s = document.createElement('script');
        s.src = BASE + 'js/i18n/' + PAGE + '.' + lang + '.js?v=' + (root.getAttribute('data-pt-v') || '1');
        s.onload = done;
        s.onerror = function () { root.classList.remove('is-loading'); };
        document.head.appendChild(s);
    }

    function toggleSite(toEs) {
        var t = document.getElementById('lang-toggle');
        if (t && (siteLang() === 'es') !== toEs) t.click();
    }

    function choose(lang) {
        root.classList.add('is-loading');
        load(lang, function () {
            root.classList.remove('is-loading');
            if (lang === 'es') { restore(); toggleSite(true); }
            else { if (siteLang() === 'es') { restore(); toggleSite(false); } if (lang === 'en') restore(); else apply(lang); }
            try { localStorage.setItem(STORE_KEY, lang === 'es' ? 'en' : lang); } catch (e) { /* ignore */ }
            sync();
        });
    }

    function shown() { return siteLang() === 'es' && current === 'en' ? 'es' : current; }

    function sync() {
        var lang = shown();
        var item = root.querySelector('[data-pt-lang="' + lang + '"]');
        var label = root.querySelector('.pt-current');
        if (label && item) label.textContent = item.getAttribute('data-pt-name') || item.textContent;
        root.querySelectorAll('[data-pt-lang]').forEach(function (b) {
            var on = b.getAttribute('data-pt-lang') === lang;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    }

    // Menu open/close
    var btn = root.querySelector('.pt-toggle');
    var menu = root.querySelector('.pt-menu');
    function setOpen(open) {
        root.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) { var a = menu.querySelector('.is-active') || menu.querySelector('button'); if (a) a.focus(); }
    }
    btn.addEventListener('click', function () { setOpen(!root.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pt-lang]');
        if (!b) return;
        setOpen(false); btn.focus();
        choose(b.getAttribute('data-pt-lang'));
    });
    menu.addEventListener('keydown', function (e) {
        var items = Array.prototype.slice.call(menu.querySelectorAll('button'));
        var i = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('is-open')) { setOpen(false); btn.focus(); } });

    // Header Español/English button: put the English back before it translates.
    document.addEventListener('click', function (e) {
        if (current !== 'en' && e.target.closest('#lang-toggle')) { restore(); try { localStorage.setItem(STORE_KEY, 'en'); } catch (x) { /* ignore */ } setTimeout(sync, 0); }
    }, true);
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    window.mmcPageTranslate = { choose: choose, units: function () { return units().map(function (u) { return u.key; }); } };

    function init() {
        var want = 'en';
        try { want = localStorage.getItem(STORE_KEY) || 'en'; } catch (e) { /* ignore */ }
        if (want !== 'en' && siteLang() !== 'es') load(want, function () { apply(want); sync(); });
        else sync();
    }
    if (document.readyState === 'complete') setTimeout(init, 0);
    else window.addEventListener('load', function () { setTimeout(init, 0); });
})();
