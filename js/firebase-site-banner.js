import {
    fetchEmergencyBanner,
    fetchScheduledBanners,
    getActiveScheduledBanner,
    getFriendlyFirebaseError,
    subscribeToEmergencyBanner,
    subscribeToScheduledBanners
} from './firebase-client.js?v=2026041201';

function cleanText(value) {
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
    const primary = cleanText(source[locale]);
    const fallback = cleanText(source[locale === 'en' ? 'es' : 'en']);
    return primary || fallback;
}

function sanitizeUrl(value) {
    const url = cleanText(value);

    if (!url) {
        return '';
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

    return '';
}

function sanitizeBannerHtml(raw) {
    if (typeof raw !== 'string') return '';
    var temp = document.createElement('div');
    temp.innerHTML = raw;
    var ALLOWED = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, SPAN: 1, BR: 1 };
    function walk(parent) {
        var nodes = Array.from(parent.childNodes);
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n.nodeType === 3) continue;
            if (n.nodeType !== 1 || !ALLOWED[n.tagName]) {
                while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
                n.parentNode.removeChild(n);
                continue;
            }
            if (n.tagName === 'SPAN') {
                var color = n.style.color;
                var attrs = Array.from(n.attributes);
                for (var a = 0; a < attrs.length; a++) n.removeAttribute(attrs[a].name);
                if (color) n.style.color = color;
            } else {
                var attrs2 = Array.from(n.attributes);
                for (var a2 = 0; a2 < attrs2.length; a2++) n.removeAttribute(attrs2[a2].name);
            }
            walk(n);
        }
    }
    walk(temp);
    return temp.innerHTML.trim();
}

function syncStickyHeaderMetrics() {
    window.requestAnimationFrame(function () {
        document.dispatchEvent(new CustomEvent('mmc:sticky-header-metrics'));
    });
}

function renderBanner(banner) {
    const root = document.getElementById('siteEmergencyBanner');
    const pill = document.getElementById('siteEmergencyBannerPill');
    const message = document.getElementById('siteEmergencyBannerMessage');
    const link = document.getElementById('siteEmergencyBannerLink');

    if (!root || !pill || !message || !link) {
        return;
    }

    const locale = getCurrentLanguage();
    const pillEn = localizedText(banner.pill, 'en');
    const pillEs = localizedText(banner.pill, 'es');
    const messageEn = localizedText(banner.message, 'en');
    const messageEs = localizedText(banner.message, 'es');
    const linkEn = localizedText(banner.ctaLabel, 'en');
    const linkEs = localizedText(banner.ctaLabel, 'es');
    const href = sanitizeUrl(banner.ctaUrl);
    const activeMessage = locale === 'es' ? messageEs || messageEn : messageEn || messageEs;
    const activePill = locale === 'es' ? pillEs || pillEn : pillEn || pillEs;
    const activeLink = locale === 'es' ? linkEs || linkEn : linkEn || linkEs;
    var showPill = banner.showPill !== false;
    var showButton = banner.showButton !== false;

    /* Check if message has actual visible text (strip tags for the check) */
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = activeMessage;
    var plainMessage = (tempDiv.textContent || tempDiv.innerText || '').trim();

    if (!banner.enabled || !plainMessage) {
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        pill.hidden = true;
        link.hidden = true;
        syncStickyHeaderMetrics();
        return;
    }

    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    root.dataset.color = banner.color || 'red';

    if (showPill && activePill) {
        pill.dataset.en = pillEn;
        pill.dataset.es = pillEs;
        pill.textContent = activePill;
        pill.hidden = false;
        pill.style.display = '';
    } else {
        pill.removeAttribute('data-en');
        pill.removeAttribute('data-es');
        pill.textContent = '';
        pill.hidden = true;
        pill.style.display = 'none';
    }

    message.dataset.en = sanitizeBannerHtml(messageEn);
    message.dataset.es = sanitizeBannerHtml(messageEs);
    message.innerHTML = sanitizeBannerHtml(activeMessage);

    if (showButton && activeLink && href) {
        link.dataset.en = linkEn;
        link.dataset.es = linkEs;
        link.textContent = activeLink;
        link.href = href;
        link.target = banner.ctaNewTab ? '_blank' : '';
        link.rel = banner.ctaNewTab ? 'noopener noreferrer' : '';
        link.hidden = false;
        link.style.display = '';
    } else {
        link.removeAttribute('data-en');
        link.removeAttribute('data-es');
        link.textContent = '';
        link.hidden = true;
        link.style.display = 'none';
        link.removeAttribute('href');
        link.removeAttribute('target');
        link.removeAttribute('rel');
    }

    syncStickyHeaderMetrics();
}

var currentMainBanner = null;
var currentScheduledBanners = [];

function resolveAndRender() {
    var banner = currentMainBanner;

    if (banner && banner.enabled) {
        renderBanner(banner);
        return;
    }

    var activeSched = getActiveScheduledBanner(currentScheduledBanners);
    if (activeSched && activeSched.banner) {
        renderBanner(activeSched.banner);
        return;
    }

    renderBanner(banner || {
        enabled: false,
        pill: { en: '', es: '' },
        message: { en: '', es: '' },
        ctaLabel: { en: '', es: '' },
        ctaUrl: '',
        ctaNewTab: false
    });
}

function initSiteBanner() {
    const root = document.getElementById('siteEmergencyBanner');

    if (!root) {
        return;
    }

    fetchEmergencyBanner()
        .then(function (banner) {
            currentMainBanner = banner;
            return fetchScheduledBanners().catch(function () { return []; });
        })
        .then(function (scheduled) {
            currentScheduledBanners = scheduled || [];
            resolveAndRender();
        })
        .catch(function (error) {
            console.warn('MMC emergency banner fallback:', getFriendlyFirebaseError(error));
            resolveAndRender();
        });

    subscribeToEmergencyBanner(
        function (banner) {
            currentMainBanner = banner;
            resolveAndRender();
        },
        function (error) {
            console.warn('MMC emergency banner live sync error:', getFriendlyFirebaseError(error));
        }
    );

    subscribeToScheduledBanners(
        function (scheduled) {
            currentScheduledBanners = scheduled;
            resolveAndRender();
        },
        function (error) {
            console.warn('MMC scheduled banners sync error:', getFriendlyFirebaseError(error));
        }
    );
}

initSiteBanner();
