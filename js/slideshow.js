(function () {
    const DEFAULT_ACCENT = '#0d47a1';
    const DEFAULT_ACCENT_BG = 'rgba(13,71,161,0.06)';
    const state = {
        currentIndex: 0,
        intervalId: null,
        resumeTimer: null,
        touchStartX: 0,
        touchBound: false,
        storageBound: false,
        slides: []
    };

    function safeText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function getCurrentLanguage() {
        try {
            return window.localStorage.getItem('mmc-lang') === 'es' ? 'es' : 'en';
        } catch (error) {
            return 'en';
        }
    }

    function localizedText(copy, locale) {
        const source = copy && typeof copy === 'object' ? copy : {};
        const primary = safeText(source[locale]);
        const fallback = safeText(source[locale === 'en' ? 'es' : 'en']);
        return primary || fallback;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/\n/g, '&#10;');
    }

    function formatTextHtml(value) {
        return escapeHtml(value).replace(/\n/g, '<br>');
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function normalizeAccentColor(value) {
        return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT;
    }

    function buildAccentBackground(color) {
        const hex = normalizeAccentColor(color).slice(1);
        const red = parseInt(hex.slice(0, 2), 16);
        const green = parseInt(hex.slice(2, 4), 16);
        const blue = parseInt(hex.slice(4, 6), 16);

        if ([red, green, blue].some(Number.isNaN)) {
            return DEFAULT_ACCENT_BG;
        }

        return 'rgba(' + red + ',' + green + ',' + blue + ',0.08)';
    }

    function sanitizeUrl(value) {
        const url = safeText(value);

        if (!url) {
            return '#';
        }

        if (
            url.startsWith('#') ||
            url.startsWith('/') ||
            url.startsWith('./') ||
            url.startsWith('../')
        ) {
            return url;
        }

        if (/^(https?:|mailto:|tel:|sms:)/i.test(url)) {
            return url;
        }

        if (/^[a-z0-9][a-z0-9/_\-.]*([?#].*)?$/i.test(url)) {
            return url;
        }

        return '#';
    }

    function buildTitleHtml(title, accentText) {
        const cleanTitle = safeText(title);
        const cleanAccent = safeText(accentText);

        if (!cleanTitle) {
            return '';
        }

        if (!cleanAccent) {
            return escapeHtml(cleanTitle);
        }

        const match = cleanTitle.match(new RegExp(escapeRegExp(cleanAccent), 'i'));

        if (!match || typeof match.index !== 'number') {
            return escapeHtml(cleanTitle);
        }

        const start = match.index;
        const end = start + match[0].length;

        return [
            escapeHtml(cleanTitle.slice(0, start)),
            '<span class="accent">',
            escapeHtml(cleanTitle.slice(start, end)),
            '</span>',
            escapeHtml(cleanTitle.slice(end))
        ].join('');
    }

    function buildCredentialHtml(text) {
        return [
            '<span class="slide-cred-icon">&#10003;</span>',
            formatTextHtml(text)
        ].join('');
    }

    function buildSlideMarkup(slide, isActive, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const locale = settings.locale === 'es' ? 'es' : 'en';
        const disableLink = !!settings.disableLink;
        const accent = normalizeAccentColor(slide && slide.accent);
        const accentBg = buildAccentBackground(accent);
        const pillEn = formatTextHtml(localizedText(slide.pill, 'en'));
        const pillEs = formatTextHtml(localizedText(slide.pill, 'es'));
        const titleEn = buildTitleHtml(localizedText(slide.title, 'en'), localizedText(slide.titleAccent, 'en'));
        const titleEs = buildTitleHtml(localizedText(slide.title, 'es'), localizedText(slide.titleAccent, 'es'));
        const kickerEn = formatTextHtml(localizedText(slide.kicker, 'en'));
        const kickerEs = formatTextHtml(localizedText(slide.kicker, 'es'));
        const subtextEn = formatTextHtml(localizedText(slide.subtext, 'en'));
        const subtextEs = formatTextHtml(localizedText(slide.subtext, 'es'));
        const ctaLabelEn = formatTextHtml(localizedText(slide.ctaLabel, 'en'));
        const ctaLabelEs = formatTextHtml(localizedText(slide.ctaLabel, 'es'));
        const activeTitle = locale === 'es' ? titleEs || titleEn : titleEn || titleEs;
        const activePill = locale === 'es' ? pillEs || pillEn : pillEn || pillEs;
        const activeKicker = locale === 'es' ? kickerEs || kickerEn : kickerEn || kickerEs;
        const activeSubtext = locale === 'es' ? subtextEs || subtextEn : subtextEn || subtextEs;
        const activeCtaLabel = locale === 'es' ? ctaLabelEs || ctaLabelEn : ctaLabelEn || ctaLabelEs;
        const credentials = Array.isArray(slide.credentials) ? slide.credentials : [];
        const href = sanitizeUrl(slide.ctaUrl);
        const ctaTarget = slide.ctaNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
        const previewOnly = disableLink ? ' data-preview-link="true" tabindex="-1"' : '';

        let markup = [
            '<div class="slide-card',
            isActive ? ' active' : '',
            '" style="--accent: ',
            escapeAttribute(accent),
            '; --accent-bg: ',
            escapeAttribute(accentBg),
            ';">'
        ].join('');

        if (activePill) {
            markup += [
                '<span class="slide-pill" data-en="',
                escapeAttribute(pillEn),
                '" data-es="',
                escapeAttribute(pillEs),
                '">',
                activePill,
                '</span>'
            ].join('');
        }

        markup += [
            '<h2 class="slide-title" data-en="',
            escapeAttribute(titleEn),
            '" data-es="',
            escapeAttribute(titleEs),
            '">',
            activeTitle,
            '</h2>'
        ].join('');

        if (activeKicker) {
            markup += [
                '<p class="slide-kicker" data-en="',
                escapeAttribute(kickerEn),
                '" data-es="',
                escapeAttribute(kickerEs),
                '">',
                activeKicker,
                '</p>'
            ].join('');
        }

        if (activeSubtext) {
            markup += [
                '<p class="slide-sub" data-en="',
                escapeAttribute(subtextEn),
                '" data-es="',
                escapeAttribute(subtextEs),
                '">',
                activeSubtext,
                '</p>'
            ].join('');
        }

        if (credentials.length) {
            markup += '<div class="slide-creds">';
            credentials.forEach(function (credential) {
                const credentialEn = buildCredentialHtml(localizedText(credential, 'en'));
                const credentialEs = buildCredentialHtml(localizedText(credential, 'es'));
                const activeCredential = locale === 'es' ? credentialEs || credentialEn : credentialEn || credentialEs;

                markup += [
                    '<div class="slide-cred" data-en="',
                    escapeAttribute(credentialEn),
                    '" data-es="',
                    escapeAttribute(credentialEs),
                    '">',
                    activeCredential,
                    '</div>'
                ].join('');
            });
            markup += '</div>';
        }

        if (activeCtaLabel) {
            markup += [
                '<a href="',
                escapeAttribute(href),
                '" class="slide-btn"',
                ctaTarget,
                previewOnly,
                ' data-en="',
                escapeAttribute(ctaLabelEn),
                '" data-es="',
                escapeAttribute(ctaLabelEs),
                '">',
                activeCtaLabel,
                '</a>'
            ].join('');
        }

        markup += '</div>';
        return markup;
    }

    function buildPreviewMarkup(slide, locale) {
        return [
            '<div class="admin-slide-preview-frame">',
            '<div class="slide-container">',
            '<div class="slide-track">',
            buildSlideMarkup(slide, true, {
                locale: locale === 'es' ? 'es' : 'en',
                disableLink: true
            }),
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    }

    function clearTimers() {
        window.clearInterval(state.intervalId);
        window.clearTimeout(state.resumeTimer);
        state.intervalId = null;
        state.resumeTimer = null;
    }

    function showSlide(index) {
        const cards = document.querySelectorAll('#slideTrack .slide-card');
        const dots = document.querySelectorAll('#slideDots .s-dot');

        if (!cards.length) {
            return;
        }

        state.currentIndex = (index + cards.length) % cards.length;

        cards.forEach(function (card, cardIndex) {
            card.classList.toggle('active', cardIndex === state.currentIndex);
        });

        dots.forEach(function (dot, dotIndex) {
            dot.classList.toggle('active', dotIndex === state.currentIndex);
        });
    }

    function startAutoRotation() {
        clearTimers();

        if (state.slides.length <= 1) {
            return;
        }

        state.intervalId = window.setInterval(function () {
            showSlide(state.currentIndex + 1);
        }, 6000);
    }

    function moveSlide(step) {
        clearTimers();
        showSlide(state.currentIndex + step);
        state.resumeTimer = window.setTimeout(startAutoRotation, 6000);
    }

    function jumpToSlide(index) {
        clearTimers();
        showSlide(index);
        state.resumeTimer = window.setTimeout(startAutoRotation, 6000);
    }

    function renderHomepageSlideshow() {
        const root = document.getElementById('slideshow');
        const track = document.getElementById('slideTrack');
        const dotsWrap = document.getElementById('slideDots');
        const controls = document.getElementById('slideControls');
        const store = window.MMCSlideshowStore;

        if (!root || !track || !dotsWrap || !controls || !store) {
            return;
        }

        state.slides = store.getSlidesForRender();
        state.currentIndex = 0;

        track.innerHTML = state.slides.map(function (slide, index) {
            return buildSlideMarkup(slide, index === 0, { locale: getCurrentLanguage() });
        }).join('');

        dotsWrap.innerHTML = '';

        state.slides.forEach(function (_, index) {
            const dot = document.createElement('button');
            dot.className = 's-dot' + (index === 0 ? ' active' : '');
            dot.type = 'button';
            dot.setAttribute('aria-label', 'Go to slide ' + (index + 1));
            dot.addEventListener('click', function () {
                jumpToSlide(index);
            });
            dotsWrap.appendChild(dot);
        });

        controls.style.display = state.slides.length > 1 ? 'flex' : 'none';
        showSlide(0);
        startAutoRotation();

        if (typeof window.mmcApplyLang === 'function') {
            window.mmcApplyLang();
        }
    }

    function bindTouchNavigation() {
        const root = document.getElementById('slideshow');

        if (!root || state.touchBound) {
            return;
        }

        root.addEventListener('touchstart', function (event) {
            state.touchStartX = event.touches[0].clientX;
        }, { passive: true });

        root.addEventListener('touchend', function (event) {
            const difference = state.touchStartX - event.changedTouches[0].clientX;

            if (Math.abs(difference) > 40) {
                moveSlide(difference > 0 ? 1 : -1);
            }
        }, { passive: true });

        state.touchBound = true;
    }

    function bindStorageRefresh() {
        const store = window.MMCSlideshowStore;

        if (!store || state.storageBound) {
            return;
        }

        window.addEventListener('storage', function (event) {
            if (event.key === store.STORAGE_KEY || event.key === null) {
                renderHomepageSlideshow();
            }
        });

        state.storageBound = true;
    }

    function mountHomepageSlideshow() {
        if (!document.getElementById('slideshow')) {
            return;
        }

        renderHomepageSlideshow();
        bindTouchNavigation();
        bindStorageRefresh();
    }

    window.slideMove = moveSlide;
    window.slideJump = jumpToSlide;
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
