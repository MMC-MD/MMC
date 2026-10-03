/*
 * Homepage slideshow renderer (shared by the homepage and MMC Studio previews).
 * Exposes window.MMCSlideshow and the slideMove/slideJump globals used by the
 * homepage controls. Styles live in css/slides.css.
 */
(function () {
    'use strict';

    var DEFAULT_ACCENT = '#0d47a1';
    var INTERVAL_MS = 5000;
    var state = {
        currentIndex: 0,
        intervalId: null,
        resumeTimer: null,
        touchStartX: 0,
        touchBound: false,
        storageBound: false,
        slides: []
    };

    function cleanText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function currentLocale() {
        try {
            return window.localStorage.getItem('mmc-lang') === 'es' ? 'es' : 'en';
        } catch (error) {
            return 'en';
        }
    }

    // Prefer the requested language, fall back to the other one.
    function pick(copy, locale) {
        var source = copy && typeof copy === 'object' ? copy : {};
        return cleanText(source[locale]) || cleanText(source[locale === 'en' ? 'es' : 'en']);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/\n/g, '&#10;');
    }

    function escapeMultiline(value) {
        return escapeHtml(value).replace(/\n/g, '<br>');
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* ── Colour helpers ── */

    function normalizeAccent(value) {
        return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT;
    }

    function hexToRgb(hex) {
        var h = normalizeAccent(hex).slice(1);
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }

    function rgbToHex(rgb) {
        return '#' + rgb.map(function (c) {
            var v = Math.max(0, Math.min(255, Math.round(c)));
            return (v < 16 ? '0' : '') + v.toString(16);
        }).join('');
    }

    function mix(hex, target, amount) {
        var a = hexToRgb(hex);
        var b = hexToRgb(target);
        return rgbToHex(a.map(function (c, i) { return c + (b[i] - c) * amount; }));
    }

    function luminance(hex) {
        var rgb = hexToRgb(hex).map(function (c) {
            var s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    // A vivid, light version of the accent for words on dark photos/backgrounds.
    function vividLight(hex) {
        var c = hexToRgb(hex).map(function (v) { return v / 255; });
        var max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
        var h = 0, d = max - min;
        if (d) {
            if (max === c[0]) h = ((c[1] - c[2]) / d) % 6;
            else if (max === c[1]) h = (c[2] - c[0]) / d + 2;
            else h = (c[0] - c[1]) / d + 4;
            h *= 60; if (h < 0) h += 360;
        }
        var sat = d ? Math.max(0.95, d / (1 - Math.abs(max + min - 1))) : 0;
        var light = 0.68;
        var k = (1 - Math.abs(2 * light - 1)) * sat, x = k * (1 - Math.abs((h / 60) % 2 - 1)), m = light - k / 2;
        var rgb = h < 60 ? [k, x, 0] : h < 120 ? [x, k, 0] : h < 180 ? [0, k, x] : h < 240 ? [0, x, k] : h < 300 ? [x, 0, k] : [k, 0, x];
        return rgbToHex(rgb.map(function (v) { return (v + m) * 255; }));
    }

    function accentVars(accent) {
        var rgb = hexToRgb(accent);
        var bright = luminance(accent) > 0.3;
        return [
            '--accent: ' + accent,
            '--accent-bg: rgba(' + rgb.join(',') + ',0.08)',
            '--accent-deep: ' + mix(accent, '#000000', 0.38),
            '--accent-light: ' + vividLight(accent),
            // Text colour on white buttons placed over dark layouts.
            '--accent-ink: ' + (bright ? mix(accent, '#000000', 0.35) : accent)
        ].join('; ');
    }

    /* ── Markup ── */

    function safeUrl(value) {
        var url = cleanText(value);
        if (url && (url.startsWith('#') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
            || /^(https?:|mailto:|tel:|sms:)/i.test(url)
            || /^[a-z0-9][a-z0-9/_\-.]*([?#].*)?$/i.test(url))) {
            return url;
        }
        return '#';
    }

    function highlightTitle(title, accentWords) {
        var text = cleanText(title);
        var accent = cleanText(accentWords);
        if (!text) return '';
        if (!accent) return escapeHtml(text);
        var match = text.match(new RegExp(escapeRegExp(accent), 'i'));
        if (!match || typeof match.index !== 'number') return escapeHtml(text);
        var start = match.index;
        var end = start + match[0].length;
        return escapeHtml(text.slice(0, start)) + '<span class="accent">'
            + escapeHtml(text.slice(start, end)) + '</span>' + escapeHtml(text.slice(end));
    }

    function credentialHtml(text) {
        return '<span class="slide-cred-icon">&#10003;</span>' + escapeMultiline(text);
    }

    function imageSources(image) {
        // Library images ship as name-1280.webp plus a name-720.webp sibling;
        // the newer photos also have a sharp name-1920.webp for large screens.
        var m = /^(.*)-1280\.webp$/i.exec(image);
        if (!m) return {};
        var hd = /\/(flu-vaccine|aviation-immigration|urgent-care|exam-room)$/.test(m[1]) ? ', ' + m[1] + '-1920.webp 1920w' : '';
        return { srcset: m[1] + '-720.webp 720w, ' + image + ' 1280w' + hd };
    }

    function mediaHtml(slide, layout, eager) {
        var sources = imageSources(slide.image);
        var sizes = layout === 'photo' ? '(max-width: 600px) 100vw, 608px' : '(max-width: 1216px) 100vw, 1216px';
        return '<div class="slide-media"><img src="' + escapeAttr(slide.image) + '"'
            + (sources.srcset ? ' srcset="' + escapeAttr(sources.srcset) + '" sizes="' + sizes + '"' : '')
            + ' alt="" ' + (eager ? 'fetchpriority="low"' : 'loading="lazy"') + ' decoding="async"></div>';
    }

    // Bilingual element: renders the current language and carries both for the language toggle.
    function bilingual(tag, cls, en, es, locale, extraAttrs) {
        var shown = locale === 'es' ? (es || en) : (en || es);
        return '<' + tag + ' class="' + cls + '"' + (extraAttrs || '')
            + ' data-en="' + escapeAttr(en) + '" data-es="' + escapeAttr(es) + '">' + shown + '</' + tag + '>';
    }

    function buildSlideMarkup(slide, isActive, options) {
        var opts = options && typeof options === 'object' ? options : {};
        var locale = opts.locale === 'es' ? 'es' : 'en';
        var accent = normalizeAccent(slide && slide.accent);
        var layout = slide && slide.layout ? slide.layout : 'classic';
        if ((layout === 'photo' || layout === 'feature' || layout === 'light') && !(slide && slide.image)) layout = 'classic';

        var pillEn = escapeMultiline(pick(slide.pill, 'en'));
        var pillEs = escapeMultiline(pick(slide.pill, 'es'));
        var titleEn = highlightTitle(pick(slide.title, 'en'), pick(slide.titleAccent, 'en'));
        var titleEs = highlightTitle(pick(slide.title, 'es'), pick(slide.titleAccent, 'es'));
        var kickerEn = escapeMultiline(pick(slide.kicker, 'en'));
        var kickerEs = escapeMultiline(pick(slide.kicker, 'es'));
        var subEn = escapeMultiline(pick(slide.subtext, 'en'));
        var subEs = escapeMultiline(pick(slide.subtext, 'es'));
        var ctaEn = escapeMultiline(pick(slide.ctaLabel, 'en'));
        var ctaEs = escapeMultiline(pick(slide.ctaLabel, 'es'));
        var credentials = Array.isArray(slide.credentials) ? slide.credentials : [];

        var copy = '';
        if (pillEn || pillEs) copy += bilingual('span', 'slide-pill', pillEn, pillEs, locale);
        copy += bilingual('h2', 'slide-title', titleEn, titleEs, locale);
        if (kickerEn || kickerEs) copy += bilingual('p', 'slide-kicker', kickerEn, kickerEs, locale);
        if (subEn || subEs) copy += bilingual('p', 'slide-sub', subEn, subEs, locale);
        if (credentials.length) {
            copy += '<div class="slide-creds">';
            credentials.forEach(function (cred) {
                copy += bilingual('div', 'slide-cred', credentialHtml(pick(cred, 'en')), credentialHtml(pick(cred, 'es')), locale);
            });
            copy += '</div>';
        }
        if (ctaEn || ctaEs) {
            var attrs = ' href="' + escapeAttr(safeUrl(slide.ctaUrl)) + '"'
                + (slide.ctaNewTab ? ' target="_blank" rel="noopener noreferrer"' : '')
                + (opts.disableLink ? ' data-preview-link="true" tabindex="-1"' : '');
            copy += bilingual('a', 'slide-btn', ctaEn, ctaEs, locale, attrs);
        }

        var html = '<div class="slide-card slide-' + layout + (isActive ? ' active' : '')
            + '" data-layout="' + layout + '" style="' + escapeAttr(accentVars(accent)) + '">';
        if (layout === 'classic' || layout === 'bold') {
            html += copy;
        } else if (layout === 'photo') {
            html += '<div class="slide-copy">' + copy + '</div>' + mediaHtml(slide, layout, isActive);
        } else {
            html += mediaHtml(slide, layout, isActive) + '<div class="slide-scrim"></div><div class="slide-copy">' + copy + '</div>';
        }
        return html + '</div>';
    }

    function needsTallTrack(slides) {
        return slides.some(function (slide) { return slide && slide.layout && slide.layout !== 'classic'; });
    }

    function buildPreviewMarkup(slide, locale) {
        return '<div class="admin-slide-preview-frame"><div class="slide-container">'
            + '<div class="slide-track' + (needsTallTrack([slide]) ? ' slide-track--tall' : '') + '">'
            + buildSlideMarkup(slide, true, { locale: locale === 'es' ? 'es' : 'en', disableLink: true })
            + '</div></div></div>';
    }

    /* ── Homepage carousel ── */

    function setAutoplayClass(on) {
        var container = document.getElementById('slideshow');
        if (container) container.classList.toggle('is-autoplay', on);
    }

    function stopTimers() {
        setAutoplayClass(false);
        window.clearInterval(state.intervalId);
        window.clearTimeout(state.resumeTimer);
        state.intervalId = null;
        state.resumeTimer = null;
    }

    function showSlide(index) {
        var cards = document.querySelectorAll('#slideTrack .slide-card');
        var dots = document.querySelectorAll('#slideDots .s-dot');
        if (!cards.length) return;
        state.currentIndex = (index + cards.length) % cards.length;
        cards.forEach(function (card, i) { card.classList.toggle('active', i === state.currentIndex); });
        dots.forEach(function (dot, i) { dot.classList.toggle('active', i === state.currentIndex); });
    }

    function startAutoplay() {
        stopTimers();
        if (state.slides.length <= 1) return;
        setAutoplayClass(true);
        state.intervalId = window.setInterval(function () { showSlide(state.currentIndex + 1); }, INTERVAL_MS);
    }

    function slideMove(step) {
        stopTimers();
        showSlide(state.currentIndex + step);
        state.resumeTimer = window.setTimeout(startAutoplay, INTERVAL_MS);
    }

    function slideJump(index) {
        stopTimers();
        showSlide(index);
        state.resumeTimer = window.setTimeout(startAutoplay, INTERVAL_MS);
    }

    function renderHomepageSlideshow() {
        var container = document.getElementById('slideshow');
        var track = document.getElementById('slideTrack');
        var dots = document.getElementById('slideDots');
        var controls = document.getElementById('slideControls');
        var store = window.MMCSlideshowStore;
        if (!container || !track || !dots || !controls || !store) return;
        container.style.setProperty('--slide-interval', INTERVAL_MS + 'ms');

        state.slides = store.getSlidesForRender();
        state.currentIndex = 0;
        var locale = currentLocale();
        track.classList.toggle('slide-track--tall', needsTallTrack(state.slides));
        track.innerHTML = state.slides.map(function (slide, i) {
            return buildSlideMarkup(slide, i === 0, { locale: locale });
        }).join('');

        dots.innerHTML = '';
        state.slides.forEach(function (slide, i) {
            var dot = document.createElement('button');
            dot.className = 's-dot' + (i === 0 ? ' active' : '');
            dot.type = 'button';
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.addEventListener('click', function () { slideJump(i); });
            dots.appendChild(dot);
        });

        controls.style.display = state.slides.length > 1 ? 'flex' : 'none';
        showSlide(0);
        startAutoplay();
        if (typeof window.mmcApplyLang === 'function') window.mmcApplyLang();
    }

    function bindTouch() {
        var container = document.getElementById('slideshow');
        if (!container || state.touchBound) return;
        container.addEventListener('touchstart', function (event) {
            state.touchStartX = event.touches[0].clientX;
        }, { passive: true });
        container.addEventListener('touchend', function (event) {
            var delta = state.touchStartX - event.changedTouches[0].clientX;
            if (Math.abs(delta) > 40) slideMove(delta > 0 ? 1 : -1);
        }, { passive: true });
        // Pause while a mouse is over the slide so it can be read.
        container.addEventListener('pointerenter', function (event) {
            if (event.pointerType === 'mouse') stopTimers();
        });
        container.addEventListener('pointerleave', function (event) {
            if (event.pointerType === 'mouse') startAutoplay();
        });
        state.touchBound = true;
    }

    function bindStorage() {
        var store = window.MMCSlideshowStore;
        if (!store || state.storageBound) return;
        window.addEventListener('storage', function (event) {
            if (event.key === store.CACHE_KEY || event.key === null) renderHomepageSlideshow();
        });
        state.storageBound = true;
    }

    function mountHomepageSlideshow() {
        if (!document.getElementById('slideshow')) return;
        renderHomepageSlideshow();
        bindTouch();
        bindStorage();
    }

    window.slideMove = slideMove;
    window.slideJump = slideJump;
    window.MMCSlideshow = Object.freeze({
        buildSlideMarkup: buildSlideMarkup,
        buildPreviewMarkup: buildPreviewMarkup,
        mountHomepageSlideshow: mountHomepageSlideshow,
        renderHomepageSlideshow: renderHomepageSlideshow
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountHomepageSlideshow, { once: true });
    } else {
        mountHomepageSlideshow();
    }
})();
