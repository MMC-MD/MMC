import {
    fetchEmergencyBanner,
    getFriendlyFirebaseError,
    subscribeToEmergencyBanner
} from './firebase-client.js';

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

    if (!banner.enabled || !activeMessage) {
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        pill.hidden = true;
        link.hidden = true;
        syncStickyHeaderMetrics();
        return;
    }

    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');

    pill.dataset.en = pillEn;
    pill.dataset.es = pillEs;
    pill.innerHTML = activePill;
    pill.hidden = !activePill;

    message.dataset.en = messageEn;
    message.dataset.es = messageEs;
    message.innerHTML = activeMessage;

    if (activeLink && href) {
        link.dataset.en = linkEn;
        link.dataset.es = linkEs;
        link.textContent = activeLink;
        link.href = href;
        link.target = banner.ctaNewTab ? '_blank' : '';
        link.rel = banner.ctaNewTab ? 'noopener noreferrer' : '';
        link.hidden = false;
    } else {
        link.hidden = true;
        link.removeAttribute('href');
        link.removeAttribute('target');
        link.removeAttribute('rel');
    }

    syncStickyHeaderMetrics();
}

function initSiteBanner() {
    const root = document.getElementById('siteEmergencyBanner');

    if (!root) {
        return;
    }

    fetchEmergencyBanner()
        .then(renderBanner)
        .catch(function (error) {
            console.warn('MMC emergency banner fallback:', getFriendlyFirebaseError(error));
            renderBanner({
                enabled: false,
                pill: { en: '', es: '' },
                message: { en: '', es: '' },
                ctaLabel: { en: '', es: '' },
                ctaUrl: '',
                ctaNewTab: false
            });
        });

    subscribeToEmergencyBanner(
        function (banner) {
            renderBanner(banner);
        },
        function (error) {
            console.warn('MMC emergency banner live sync error:', getFriendlyFirebaseError(error));
        }
    );
}

initSiteBanner();
