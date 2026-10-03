/*
 * Five Elements Acupuncture: whole-page Chinese (简体中文) view.
 * The English/中文 buttons at the top of the page swap every section's text
 * for the Chinese below and restore the original markup when switched back.
 * Dr. Lu's profile already ships in both languages (data-minlu-bio-view).
 * Translations are keyed by the English text (whitespace-normalised).
 */
(function () {
    'use strict';

    var STORE_KEY = 'mmc-acu-zh';
    var SCOPE = 'section#main-content, section.hp-section, section#faq, section.mmc-cta, .mmc-subnav';
    var SKIP = '[data-minlu-bio-view], .ac-langbar, script, style, noscript, svg';
    var INLINE = { STRONG: 1, B: 1, EM: 1, I: 1, BR: 1, SPAN: 1, SMALL: 1, SUP: 1, SUB: 1 };

    var ZH = window.MMC_ACU_ZH || {};
    var saved = [];   // [{ node, html? , text? }]
    var active = false;

    function norm(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }

    function isUnit(el) {
        if (!norm(el.textContent)) return false;
        var all = el.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) if (!INLINE[all[i].tagName]) return false;
        return true;
    }

    // Translatable pieces in document order: whole elements whose only children
    // are inline formatting, plus loose text nodes inside anything else.
    function collectUnits() {
        var units = [];
        document.querySelectorAll(SCOPE).forEach(function (root) {
            (function walk(el) {
                if (el.matches && el.matches(SKIP)) return;
                if (el !== root && isUnit(el)) { units.push({ el: el, key: norm(el.textContent) }); return; }
                Array.prototype.forEach.call(el.childNodes, function (n) {
                    if (n.nodeType === 1) walk(n);
                    else if (n.nodeType === 3 && norm(n.nodeValue)) units.push({ text: n, key: norm(n.nodeValue) });
                });
            })(root);
        });
        return units;
    }

    function apply() {
        if (active) return;
        collectUnits().forEach(function (u) {
            var zh = ZH[u.key];
            if (!zh) return;
            if (u.el) {
                saved.push({ node: u.el, html: u.el.innerHTML });
                if (zh.indexOf('<') >= 0) u.el.innerHTML = zh; else u.el.textContent = zh;
                u.el.setAttribute('lang', 'zh-Hans');
            } else {
                saved.push({ node: u.text, text: u.text.nodeValue });
                var lead = /^\s*/.exec(u.text.nodeValue)[0], trail = /\s*$/.exec(u.text.nodeValue)[0];
                u.text.nodeValue = lead + zh + trail;
            }
        });
        if (typeof window.setMinLuBioView === 'function') window.setMinLuBioView('zh');
        active = true;
        sync();
    }

    function restore() {
        if (!active) return;
        for (var i = saved.length - 1; i >= 0; i--) {
            var s = saved[i];
            if (s.html !== undefined) { s.node.innerHTML = s.html; s.node.removeAttribute('lang'); }
            else s.node.nodeValue = s.text;
        }
        saved = [];
        if (typeof window.setMinLuBioView === 'function') window.setMinLuBioView('en');
        active = false;
        sync();
    }

    function sync() {
        document.documentElement.classList.toggle('acu-zh', active);
        document.querySelectorAll('.ac-langbar [data-zh-on], .ac-langbar [data-zh-off]').forEach(function (b) {
            var on = b.hasAttribute('data-zh-on') === active;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        try { localStorage.setItem(STORE_KEY, active ? '1' : '0'); } catch (e) { /* private mode */ }
    }

    function siteLang() { try { return localStorage.getItem('mmc-lang') || 'en'; } catch (e) { return 'en'; } }

    function turnOn() {
        // Chinese is written against the English page: leave Spanish first.
        if (siteLang() === 'es') {
            var t = document.getElementById('lang-toggle');
            if (t) t.click();
        }
        apply();
    }

    document.addEventListener('click', function (event) {
        if (event.target.closest('.ac-langbar [data-zh-on]')) { turnOn(); return; }
        if (event.target.closest('.ac-langbar [data-zh-off]')) { restore(); return; }
        // Header Español/English button: put the English back before it translates.
        if (active && event.target.closest('#lang-toggle')) restore();
    }, true);

    window.mmcAcuZh = { on: turnOn, off: restore, units: function () { return collectUnits().map(function (u) { return u.key; }); } };

    function init() {
        var want = false;
        try { want = localStorage.getItem(STORE_KEY) === '1'; } catch (e) { /* ignore */ }
        if (want && siteLang() !== 'es') apply();
    }
    // Wait for the header (in-page section bar) to exist before translating.
    if (document.readyState === 'complete') setTimeout(init, 0);
    else window.addEventListener('load', function () { setTimeout(init, 0); });
})();
