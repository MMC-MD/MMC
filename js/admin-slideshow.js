import {
    auth,
    createDefaultEmergencyBanner,
    deleteScheduledBanner,
    fetchEmergencyBanner,
    fetchHomepageSlides,
    fetchScheduledBanners,
    getFriendlyFirebaseError,
    normalizeEmergencyBanner,
    observeAuthState,
    saveEmergencyBanner,
    saveHomepageSlides,
    saveScheduledBanner,
    sendAdminPasswordReset,
    signInAdmin,
    signOutAdmin,
    subscribeToEmergencyBanner,
    subscribeToHomepageSlides,
    subscribeToScheduledBanners
} from './firebase-client.js?v=2026041202';

const store = window.MMCSlideshowStore;
const slideshow = window.MMCSlideshow;

if (!store || !slideshow) {
    throw new Error('MMC slideshow editor failed to initialize.');
}

const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=';
const COLOR_PRESETS = [
    { label: 'Clinic Blue', value: '#0d47a1' },
    { label: 'Warm Orange', value: '#e67e22' },
    { label: 'Light Blue', value: '#1976d2' },
    { label: 'Fresh Green', value: '#2e7d32' },
    { label: 'Berry Red', value: '#c62828' }
];

const SLIDE_TEMPLATES = [
    {
        id: 'appointment',
        name: 'Appointment Push',
        tag: 'Most useful',
        description: 'Best for booking visits, flu shots, physicals, and same-day care.',
        accent: '#e67e22',
        buildSlide: function () {
            return {
                accent: '#e67e22',
                pill: { en: 'Now Booking', es: '' },
                title: { en: 'Book Your Same-Week Visit', es: '' },
                titleAccent: { en: 'Same-Week Visit', es: '' },
                kicker: { en: 'Quick access to care', es: '' },
                subtext: {
                    en: 'Use this slide to send patients to booking right away.',
                    es: ''
                },
                ctaLabel: { en: 'Schedule Appointment', es: '' },
                ctaUrl: 'https://nextpatient.co/p/montgomerymedclinic/schedule',
                ctaNewTab: true,
                credentials: []
            };
        }
    },
    {
        id: 'service',
        name: 'Service Spotlight',
        tag: 'Departments',
        description: 'Highlight one department or service with a strong call to action.',
        accent: '#0d47a1',
        buildSlide: function () {
            return {
                accent: '#0d47a1',
                pill: { en: 'Service Spotlight', es: '' },
                title: { en: 'Dermatology Appointments Available', es: '' },
                titleAccent: { en: 'Dermatology', es: '' },
                kicker: { en: 'Featured this week', es: '' },
                subtext: {
                    en: 'Use this for dermatology, physical therapy, occupational health, or any featured department.',
                    es: ''
                },
                ctaLabel: { en: 'Learn More', es: '' },
                ctaUrl: 'dermatology/',
                ctaNewTab: false,
                credentials: []
            };
        }
    },
    {
        id: 'announcement',
        name: 'Simple Announcement',
        tag: 'Easy update',
        description: 'Good for office updates, reminders, and quick clinic messages.',
        accent: '#1976d2',
        buildSlide: function () {
            return {
                accent: '#1976d2',
                pill: { en: 'Clinic Update', es: '' },
                title: { en: 'New Hours This Month', es: '' },
                titleAccent: { en: 'New Hours', es: '' },
                kicker: { en: 'Important reminder', es: '' },
                subtext: {
                    en: 'Use the supporting text area to explain the update in simple words.',
                    es: ''
                },
                ctaLabel: { en: '', es: '' },
                ctaUrl: '',
                ctaNewTab: false,
                credentials: []
            };
        }
    },
    {
        id: 'credentials',
        name: 'Credentials / Highlights',
        tag: 'Trust builder',
        description: 'Best for FAA, immigration, certifications, and special qualifications.',
        accent: '#0d47a1',
        buildSlide: function () {
            return {
                accent: '#0d47a1',
                pill: { en: 'Specialized Services', es: '' },
                title: { en: 'FAA & Immigration Physicals', es: '' },
                titleAccent: { en: 'Physicals', es: '' },
                kicker: { en: '', es: '' },
                subtext: { en: '', es: '' },
                ctaLabel: { en: '', es: '' },
                ctaUrl: '',
                ctaNewTab: false,
                credentials: [
                    { en: 'Authorized Aviation Medical Examiner', es: '' },
                    { en: 'USCIS-Authorized Civil Surgeon', es: '' }
                ]
            };
        }
    },
    {
        id: 'seasonal',
        name: 'Seasonal Promotion',
        tag: 'Popular',
        description: 'Great for flu shots, wellness campaigns, and time-sensitive promos.',
        accent: '#e67e22',
        buildSlide: function () {
            return {
                accent: '#e67e22',
                pill: { en: 'Available Today', es: '' },
                title: { en: 'Flu Shots Available This Week', es: '' },
                titleAccent: { en: 'Flu Shots', es: '' },
                kicker: { en: 'Protect your family this season', es: '' },
                subtext: {
                    en: 'Update this message whenever you want to promote a seasonal service or event.',
                    es: ''
                },
                ctaLabel: { en: 'Book Now', es: '' },
                ctaUrl: 'https://nextpatient.co/p/montgomerymedclinic/schedule',
                ctaNewTab: true,
                credentials: []
            };
        }
    },
    {
        id: 'blank',
        name: 'Blank Slide',
        tag: 'From scratch',
        description: 'Start with an empty slide and fill in the details yourself.',
        accent: '#0d47a1',
        buildSlide: function () {
            return store.createSlideTemplate();
        }
    }
];

const BANNER_PRESETS = [
    {
        id: 'weather-closed',
        label: 'Weather Closure',
        banner: {
            enabled: true,
            pill: { en: 'Weather Alert', es: '' },
            message: {
                en: 'Due to inclement weather, Montgomery Medical Clinic is closed today.',
                es: ''
            },
            ctaLabel: { en: 'Call the Office', es: '' },
            ctaUrl: 'tel:3012082273',
            ctaNewTab: false
        }
    },
    {
        id: 'delayed-opening',
        label: 'Delayed Opening',
        banner: {
            enabled: true,
            pill: { en: 'Office Update', es: '' },
            message: {
                en: 'Due to weather conditions, we will open later than usual today. Please check back for the updated opening time.',
                es: ''
            },
            ctaLabel: { en: 'Call for Updates', es: '' },
            ctaUrl: 'tel:3012082273',
            ctaNewTab: false
        }
    },
    {
        id: 'service-delay',
        label: 'Service Delay',
        banner: {
            enabled: true,
            pill: { en: 'Important Notice', es: '' },
            message: {
                en: 'We are experiencing delays today. Thank you for your patience while our team assists scheduled and walk-in patients.',
                es: ''
            },
            ctaLabel: { en: '', es: '' },
            ctaUrl: '',
            ctaNewTab: false
        }
    },
    {
        id: 'power-outage',
        label: 'Office Disruption',
        banner: {
            enabled: true,
            pill: { en: 'Urgent Office Update', es: '' },
            message: {
                en: 'Due to an unexpected office disruption, appointments may be delayed. Please call before arriving if you have questions.',
                es: ''
            },
            ctaLabel: { en: 'Call Now', es: '' },
            ctaUrl: 'tel:3012082273',
            ctaNewTab: false
        }
    }
];

const elements = {
    lockForm: document.getElementById('adminUnlockForm'),
    lockMessage: document.getElementById('adminLockMessage'),
    emailInput: document.getElementById('adminEmail'),
    passwordInput: document.getElementById('adminPassword'),
    resetPasswordButton: document.getElementById('adminResetPasswordButton'),
    userEmail: document.getElementById('adminUserEmail'),
    status: document.getElementById('adminStatus'),
    slideCount: document.getElementById('adminSlideCount'),
    liveCount: document.getElementById('adminLiveCount'),
    editorList: document.getElementById('slideEditorList'),
    saveButton: document.getElementById('adminSaveButton'),
    addButton: document.getElementById('adminAddButton'),
    reloadButton: document.getElementById('adminReloadButton'),
    resetButton: document.getElementById('adminResetButton'),
    exportButton: document.getElementById('adminExportButton'),
    importInput: document.getElementById('adminImportInput'),
    logoutButton: document.getElementById('adminLogoutButton'),
    translateAllButton: document.getElementById('adminTranslateAllButton'),
    autoTranslateToggle: document.getElementById('adminAutoTranslateToggle'),
    templateGrid: document.getElementById('adminTemplateGrid'),
    bannerStatus: document.getElementById('adminBannerStatus'),
    bannerEnabled: document.getElementById('adminBannerEnabled'),
    bannerNewTab: document.getElementById('adminBannerNewTab'),
    bannerShowPill: document.getElementById('adminBannerShowPill'),
    bannerShowButton: document.getElementById('adminBannerShowButton'),
    bannerPillEn: document.getElementById('adminBannerPillEn'),
    bannerPillEs: document.getElementById('adminBannerPillEs'),
    bannerMessageEn: document.getElementById('adminBannerMessageEn'),
    bannerMessageEs: document.getElementById('adminBannerMessageEs'),
    bannerCtaLabelEn: document.getElementById('adminBannerCtaLabelEn'),
    bannerCtaLabelEs: document.getElementById('adminBannerCtaLabelEs'),
    bannerCtaUrl: document.getElementById('adminBannerCtaUrl'),
    bannerPreview: document.getElementById('adminBannerPreview'),
    bannerSaveButton: document.getElementById('adminBannerSaveButton'),
    bannerReloadButton: document.getElementById('adminBannerReloadButton'),
    bannerResetButton: document.getElementById('adminBannerResetButton'),
    bannerTranslateButton: document.getElementById('adminBannerTranslateButton'),
    bannerCopyButton: document.getElementById('adminBannerCopyButton'),
    bannerAutoTranslateToggle: document.getElementById('adminBannerAutoTranslateToggle'),
    bannerPresetGrid: document.getElementById('adminBannerPresetGrid'),
    bannerColorPicker: document.getElementById('adminBannerColorPicker'),
    scheduleStatus: document.getElementById('adminScheduleStatus'),
    scheduleAddButton: document.getElementById('adminScheduleAddButton'),
    scheduleReloadButton: document.getElementById('adminScheduleReloadButton'),
    scheduledBannerList: document.getElementById('scheduledBannerList'),
    scheduledBannerEmpty: document.getElementById('scheduledBannerEmpty'),
    tabButtons: Array.from(document.querySelectorAll('[data-admin-tab]')),
    tabPanels: Array.from(document.querySelectorAll('[data-admin-panel]'))
};

let slides = [];
let remoteSlides = store.getSlides();
let hasUnsavedChanges = false;
let unsubscribeSlides = null;
let emergencyBanner = createDefaultEmergencyBanner();
let remoteEmergencyBanner = createDefaultEmergencyBanner();
let hasUnsavedBannerChanges = false;
let unsubscribeBanner = null;
let bannerTranslateTimer = null;
let bannerTranslateRun = 0;
let scheduledBanners = [];
let unsubscribeScheduled = null;
let expandedSlideId = null;
let activeAdminTab = 'banner';

const SCHED_TEMPLATES = {
    'weekend-hours': {
        label: 'Weekend Hours',
        recurrence: { mode: 'weekly', days: [6, 0] },
        banner: {
            enabled: true, color: 'green', showPill: true, showButton: true,
            pill: { en: 'Weekend Hours', es: 'Horario de Fin de Semana' },
            message: { en: 'We are open today from 8:00 AM - 1:00 PM.', es: 'Estamos abiertos hoy de 8:00 AM a 1:00 PM.' },
            ctaLabel: { en: 'Call the Office', es: 'Llamar a la Oficina' },
            ctaUrl: 'tel:3012082273', ctaNewTab: false
        }
    },
    'closed-weekend': {
        label: 'Closed Weekend',
        recurrence: { mode: 'weekly', days: [6, 0] },
        banner: {
            enabled: true, color: 'green', showPill: true, showButton: false,
            pill: { en: 'Weekend Notice', es: 'Aviso de Fin de Semana' },
            message: { en: 'We are closed today. Enjoy your weekend!', es: 'Estamos cerrados hoy. \u00A1Disfrute su fin de semana!' },
            ctaLabel: { en: '', es: '' },
            ctaUrl: '', ctaNewTab: false
        }
    },
    'holiday-closed': {
        label: 'Holiday Closure',
        recurrence: { mode: 'dates' },
        banner: {
            enabled: true, color: 'orange', showPill: true, showButton: true,
            pill: { en: 'Holiday Notice', es: 'Aviso de Feriado' },
            message: { en: 'Our office is closed today in observance of the holiday. We will reopen on the next business day.', es: 'Nuestra oficina est\u00E1 cerrada hoy por el feriado. Reabriremos el pr\u00F3ximo d\u00EDa h\u00E1bil.' },
            ctaLabel: { en: 'Call for Emergencies', es: 'Llamar por Emergencias' },
            ctaUrl: 'tel:3012082273', ctaNewTab: false
        }
    },
    'early-close': {
        label: 'Early Close',
        recurrence: { mode: 'dates' },
        banner: {
            enabled: true, color: 'yellow', showPill: true, showButton: true,
            pill: { en: 'Office Update', es: 'Actualizaci\u00F3n de la Oficina' },
            message: { en: 'We will be closing early today at 3:00 PM. Please plan your visit accordingly.', es: 'Cerraremos temprano hoy a las 3:00 PM. Por favor planifique su visita.' },
            ctaLabel: { en: 'Call the Office', es: 'Llamar a la Oficina' },
            ctaUrl: 'tel:3012082273', ctaNewTab: false
        }
    },
    'alternating-open-sat': {
        label: 'Alternating Sat Open',
        isGroup: true,
        entries: [
            {
                label: 'Week A \u2013 Saturday Open',
                recurrence: { mode: 'biweekly', days: [6], weekParity: 0, anchorDate: '' },
                banner: {
                    enabled: true, color: 'green', showPill: true, showButton: true,
                    pill: { en: 'Weekend Hours', es: 'Horario de Fin de Semana' },
                    message: { en: 'The clinic is open today from 8:00 AM \u2013 1:00 PM.', es: 'La cl\u00EDnica est\u00E1 abierta hoy de 8:00 AM a 1:00 PM.' },
                    ctaLabel: { en: 'Call the Office', es: 'Llamar a la Oficina' },
                    ctaUrl: 'tel:3012082273', ctaNewTab: false
                }
            },
            {
                label: 'Week A \u2013 Sunday Closed',
                recurrence: { mode: 'biweekly', days: [0], weekParity: 0, anchorDate: '' },
                banner: {
                    enabled: true, color: 'red', showPill: true, showButton: false,
                    pill: { en: 'Closed Today', es: 'Cerrado Hoy' },
                    message: { en: 'The clinic is closed today. Enjoy your weekend!', es: '\u00A1La cl\u00EDnica est\u00E1 cerrada hoy. Disfrute su fin de semana!' },
                    ctaLabel: { en: '', es: '' },
                    ctaUrl: '', ctaNewTab: false
                }
            },
            {
                label: 'Week B \u2013 Saturday Closed',
                recurrence: { mode: 'biweekly', days: [6], weekParity: 1, anchorDate: '' },
                banner: {
                    enabled: true, color: 'red', showPill: true, showButton: false,
                    pill: { en: 'Closed Today', es: 'Cerrado Hoy' },
                    message: { en: 'Our clinic is closed today, but will be open tomorrow.', es: 'Nuestra cl\u00EDnica est\u00E1 cerrada hoy, pero abrir\u00E1 ma\u00F1ana.' },
                    ctaLabel: { en: '', es: '' },
                    ctaUrl: '', ctaNewTab: false
                }
            },
            {
                label: 'Week B \u2013 Sunday Open',
                recurrence: { mode: 'biweekly', days: [0], weekParity: 1, anchorDate: '' },
                banner: {
                    enabled: true, color: 'green', showPill: true, showButton: true,
                    pill: { en: 'Weekend Hours', es: 'Horario de Fin de Semana' },
                    message: { en: 'The clinic is open today from 8:00 AM \u2013 1:00 PM.', es: 'La cl\u00EDnica est\u00E1 abierta hoy de 8:00 AM a 1:00 PM.' },
                    ctaLabel: { en: 'Call the Office', es: 'Llamar a la Oficina' },
                    ctaUrl: 'tel:3012082273', ctaNewTab: false
                }
            }
        ]
    }
};

const translationTimers = new Map();
const translationRuns = new Map();
const translationCache = new Map();
const slideAutoTranslateState = new Map();

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function cloneSlides(value) {
    return Array.isArray(value) ? value.map(store.normalizeSlide) : [];
}

function isSameSlides(left, right) {
    return JSON.stringify(cloneSlides(left)) === JSON.stringify(cloneSlides(right));
}

function getSlideName(slide, index) {
    const title = slide && slide.title ? (slide.title.en || slide.title.es) : '';
    return title || 'Untitled Slide ' + (index + 1);
}

function setStatus(message, tone) {
    if (!elements.status) {
        return;
    }

    elements.status.textContent = message;
    elements.status.dataset.tone = tone || 'info';
}

function setLockMessage(message, tone) {
    if (!elements.lockMessage) {
        return;
    }

    elements.lockMessage.textContent = message;
    elements.lockMessage.dataset.tone = tone || 'info';
}

function setAuthenticated(isAuthenticated) {
    document.body.classList.toggle('admin-authenticated', isAuthenticated);
}

function setUserEmail(user) {
    if (!elements.userEmail) {
        return;
    }

    elements.userEmail.textContent = user && user.email ? user.email : 'Not signed in';
}

function refreshMetrics() {
    const liveSlides = slides.filter(function (slide) {
        return slide.enabled;
    }).length;

    if (elements.slideCount) {
        elements.slideCount.textContent = String(slides.length);
    }

    if (elements.liveCount) {
        elements.liveCount.textContent = String(liveSlides);
    }
}

function markDirty(message) {
    hasUnsavedChanges = true;
    setStatus(message || 'You have unpublished slide changes.', 'warning');
    refreshMetrics();
}

function clearDirty(message) {
    hasUnsavedChanges = false;
    setStatus(message || 'Homepage slides are up to date.', 'success');
    refreshMetrics();
}

function hasPendingChanges() {
    return hasUnsavedChanges || hasUnsavedBannerChanges;
}

function setActiveAdminTab(tabId) {
    var validTabs = ['banner', 'slides', 'schedule', 'weekend'];
    activeAdminTab = validTabs.indexOf(tabId) >= 0 ? tabId : 'banner';

    elements.tabButtons.forEach(function (button) {
        const isActive = button.dataset.adminTab === activeAdminTab;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    elements.tabPanels.forEach(function (panel) {
        const isActive = panel.dataset.adminPanel === activeAdminTab;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
    });
}

function setBannerStatus(message, tone) {
    if (!elements.bannerStatus) {
        return;
    }

    elements.bannerStatus.textContent = message;
    elements.bannerStatus.dataset.tone = tone || 'info';
}

function markBannerDirty(message) {
    hasUnsavedBannerChanges = true;
    setBannerStatus(message || 'You have unpublished banner changes.', 'warning');
}

function clearBannerDirty(message) {
    hasUnsavedBannerChanges = false;
    setBannerStatus(message || 'Urgent banner is up to date.', 'success');
}

function buildBannerPresetGrid() {
    if (!elements.bannerPresetGrid) {
        return;
    }

    elements.bannerPresetGrid.innerHTML = BANNER_PRESETS.map(function (preset) {
        return [
            '<button class="admin-preset-button" type="button" data-banner-preset="',
            escapeHtml(preset.id),
            '">',
            escapeHtml(preset.label),
            '</button>'
        ].join('');
    }).join('');
}

function sanitizeBannerUrl(value) {
    const url = typeof value === 'string' ? value.trim() : '';

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

function stripHtmlTags(html) {
    if (typeof html !== 'string') return '';
    var temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || '').trim();
}

function updateRichToolbarState(toolbar) {
    toolbar.querySelectorAll('[data-rt-cmd]').forEach(function (btn) {
        if (btn.tagName === 'INPUT') return;
        var cmd = btn.dataset.rtCmd;
        if (cmd === 'foreColor') return;
        try {
            btn.classList.toggle('is-active', document.queryCommandState(cmd));
        } catch (e) { /* ignore */ }
    });
}

function getLocalizedBannerText(copy, locale) {
    const source = copy && typeof copy === 'object' ? copy : {};
    const primary = typeof source[locale] === 'string' ? source[locale].trim() : '';
    const fallback = typeof source[locale === 'en' ? 'es' : 'en'] === 'string'
        ? source[locale === 'en' ? 'es' : 'en'].trim()
        : '';
    return primary || fallback;
}

function buildBannerPreviewMarkup(banner) {
    const previewBanner = normalizeEmergencyBanner(banner);
    const pillText = getLocalizedBannerText(previewBanner.pill, 'en');
    const messageHtml = sanitizeBannerHtml(getLocalizedBannerText(previewBanner.message, 'en'));
    const messagePlain = stripHtmlTags(messageHtml);
    const linkText = getLocalizedBannerText(previewBanner.ctaLabel, 'en');
    const linkUrl = sanitizeBannerUrl(previewBanner.ctaUrl);

    if (!previewBanner.enabled || !messagePlain) {
        return [
            '<div class="admin-empty-state">',
            '<p>Turn the banner on and add a message to preview it here.</p>',
            '</div>'
        ].join('');
    }

    var showPill = previewBanner.showPill !== false && !!pillText;
    var showButton = previewBanner.showButton !== false && !!linkText && !!linkUrl;

    return [
        '<div class="site-emergency-banner" data-color="' + escapeHtml(previewBanner.color || 'red') + '">',
        '<div class="site-emergency-banner-inner">',
        '<div class="site-emergency-banner-copy">',
        showPill ? '<span class="site-emergency-banner-pill">' + escapeHtml(pillText) + '</span>' : '',
        '<span class="site-emergency-banner-message">',
        messageHtml,
        '</span>',
        '</div>',
        showButton
            ? '<a class="site-emergency-banner-link" href="' + escapeHtml(linkUrl) + '">' + escapeHtml(linkText) + '</a>'
            : '',
        '</div>',
        '</div>'
    ].join('');
}

function isBannerAutoTranslateEnabled() {
    return !elements.bannerAutoTranslateToggle || !!elements.bannerAutoTranslateToggle.checked;
}

function setBannerAutoTranslateEnabled(enabled) {
    if (!elements.bannerAutoTranslateToggle) {
        return;
    }

    elements.bannerAutoTranslateToggle.checked = !!enabled;
}

function isSlideExpanded(slideId) {
    return !!slideId && expandedSlideId === slideId;
}

function ensureExpandedSlide() {
    const hasExpanded = slides.some(function (slide) {
        return slide.id === expandedSlideId;
    });

    if (!hasExpanded) {
        expandedSlideId = slides.length ? slides[0].id : null;
    }
}

function toggleSlideExpanded(slideId) {
    expandedSlideId = expandedSlideId === slideId ? null : slideId;
    renderEditors();
}

function clearTranslationTimer(slideId) {
    const existingTimer = translationTimers.get(slideId);

    if (existingTimer) {
        window.clearTimeout(existingTimer);
        translationTimers.delete(slideId);
    }
}

function cancelPendingTranslation(slideId) {
    if (!slideId) {
        return;
    }

    clearTranslationTimer(slideId);
    translationRuns.set(slideId, getTranslationRun(slideId) + 1);
}

function cancelAllPendingTranslations() {
    Array.from(translationTimers.keys()).forEach(clearTranslationTimer);
}

function findSlideIndexById(slideId) {
    return slides.findIndex(function (slide) {
        return slide.id === slideId;
    });
}

function getSlideCardById(slideId) {
    if (!elements.editorList || !slideId) {
        return null;
    }

    return Array.from(elements.editorList.querySelectorAll('.admin-slide-card')).find(function (card) {
        return card.dataset.slideId === slideId;
    }) || null;
}

function reconcileSlideStateMaps() {
    const validSlideIds = new Set(slides.map(function (slide) {
        return slide.id;
    }));

    Array.from(slideAutoTranslateState.keys()).forEach(function (slideId) {
        if (!validSlideIds.has(slideId)) {
            slideAutoTranslateState.delete(slideId);
        }
    });

    Array.from(translationRuns.keys()).forEach(function (slideId) {
        if (!validSlideIds.has(slideId)) {
            translationRuns.delete(slideId);
        }
    });

    Array.from(translationTimers.keys()).forEach(function (slideId) {
        if (!validSlideIds.has(slideId)) {
            clearTranslationTimer(slideId);
        }
    });

    slides.forEach(function (slide) {
        if (!slideAutoTranslateState.has(slide.id)) {
            slideAutoTranslateState.set(slide.id, true);
        }
    });
}

function isGlobalAutoTranslateEnabled() {
    return !elements.autoTranslateToggle || !!elements.autoTranslateToggle.checked;
}

function isSlideAutoTranslateEnabled(slideId) {
    if (!slideId) {
        return isGlobalAutoTranslateEnabled();
    }

    if (!slideAutoTranslateState.has(slideId)) {
        slideAutoTranslateState.set(slideId, true);
    }

    return slideAutoTranslateState.get(slideId) && isGlobalAutoTranslateEnabled();
}

function setSlideAutoTranslateEnabled(slideId, enabled) {
    if (!slideId) {
        return;
    }

    slideAutoTranslateState.set(slideId, !!enabled);
}

function renderTemplateGrid() {
    if (!elements.templateGrid) {
        return;
    }

    elements.templateGrid.innerHTML = SLIDE_TEMPLATES.map(function (template) {
        var icon = '';
        switch (template.id) {
            case 'appointment': icon = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 5h11M4.5 1.5v2M9.5 1.5v2M4.5 8h2M4.5 10h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'; break;
            case 'service': icon = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 4v3l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; break;
            case 'announcement': icon = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 2L5 5H2.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5H5l6 3V2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'; break;
            case 'credentials': icon = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 7l1.5 1.5L9.5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.2"/></svg>'; break;
            case 'seasonal': icon = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.1 3.1l.7.7M10.2 10.2l.7.7M10.2 3.1l-.7.7M3.1 10.2l.7.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.2"/></svg>'; break;
            case 'blank': icon = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 4v6M4 7h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'; break;
        }
        return [
            '<button class="studio-template-pill" type="button" data-action="use-template" data-template-id="',
            escapeHtml(template.id),
            '" title="',
            escapeHtml(template.description),
            '">',
            icon,
            '<span>',
            escapeHtml(template.name),
            '</span>',
            '</button>'
        ].join('');
    }).join('');

    // Attach hover preview listeners after rendering pills
    attachTemplatePreviewListeners();
}

/* ── Template hover preview ── */

var templatePreviewTooltip = null;
var templatePreviewTimer = null;

function getOrCreatePreviewTooltip() {
    if (!templatePreviewTooltip) {
        templatePreviewTooltip = document.createElement('div');
        templatePreviewTooltip.className = 'template-preview-tooltip';
        document.body.appendChild(templatePreviewTooltip);
    }
    return templatePreviewTooltip;
}

function showTemplatePreview(pill, template) {
    var tooltip = getOrCreatePreviewTooltip();
    var previewSlide = template.buildSlide();
    var previewHtml = slideshow.buildPreviewMarkup(previewSlide, 'en');

    tooltip.innerHTML = [
        '<div class="template-preview-header">',
        '<p class="template-preview-name">', escapeHtml(template.name), '</p>',
        '<p class="template-preview-desc">', escapeHtml(template.description), '</p>',
        '</div>',
        '<div class="template-preview-body">',
        previewHtml,
        '</div>',
        '<div class="template-preview-footer">',
        '<span>Click to add this slide</span>',
        '</div>'
    ].join('');

    // Position below the pill button
    var rect = pill.getBoundingClientRect();
    var tooltipWidth = 340;
    var left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    // Keep within viewport
    if (left < 12) left = 12;
    if (left + tooltipWidth > window.innerWidth - 12) {
        left = window.innerWidth - tooltipWidth - 12;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = (rect.bottom + 8) + 'px';

    // Force reflow then show
    void tooltip.offsetWidth;
    tooltip.classList.add('is-visible');
}

function hideTemplatePreview() {
    clearTimeout(templatePreviewTimer);
    templatePreviewTimer = null;
    if (templatePreviewTooltip) {
        templatePreviewTooltip.classList.remove('is-visible');
    }
}

function attachTemplatePreviewListeners() {
    if (!elements.templateGrid) return;

    var pills = elements.templateGrid.querySelectorAll('.studio-template-pill');
    pills.forEach(function (pill) {
        pill.addEventListener('mouseenter', function () {
            var templateId = pill.dataset.templateId;
            var template = SLIDE_TEMPLATES.find(function (t) { return t.id === templateId; });
            if (!template) return;

            clearTimeout(templatePreviewTimer);
            templatePreviewTimer = setTimeout(function () {
                showTemplatePreview(pill, template);
            }, 250);
        });

        pill.addEventListener('mouseleave', function () {
            hideTemplatePreview();
        });
    });
}

function buildColorPresetButtons() {
    return COLOR_PRESETS.map(function (preset) {
        return [
            '<button class="admin-color-preset" type="button" data-action="set-color" data-color="',
            escapeHtml(preset.value),
            '" title="',
            escapeHtml(preset.label),
            '">',
            '<span class="admin-color-swatch" style="background:',
            escapeHtml(preset.value),
            ';"></span>',
            '<span>',
            escapeHtml(preset.label),
            '</span>',
            '</button>'
        ].join('');
    }).join('');
}

function buildCredentialRows(slide) {
    if (!slide.credentials.length) {
        return [
            '<div class="admin-empty-state">',
            '<p>Add trust points only if this slide needs credentials, certifications, or other highlights.</p>',
            '</div>'
        ].join('');
    }

    return slide.credentials.map(function (credential, credentialIndex) {
        return [
            '<div class="admin-credential-row" data-credential-index="',
            credentialIndex,
            '">',
            '<label class="admin-field">',
            '<span class="admin-field-label">Trust Point (EN)</span>',
            '<input type="text" data-role="credential-en" value="',
            escapeHtml(credential.en || ''),
            '" placeholder="Authorized Aviation Medical Examiner">',
            '</label>',
            '<label class="admin-field">',
            '<span class="admin-field-label">Trust Point (ES)</span>',
            '<input type="text" data-role="credential-es" value="',
            escapeHtml(credential.es || ''),
            '" placeholder="Examinador autorizado">',
            '</label>',
            '<button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="remove-credential">Delete</button>',
            '</div>'
        ].join('');
    }).join('');
}

function buildSlideCard(slide, index) {
    const autoTranslateChecked = isSlideAutoTranslateEnabled(slide.id) ? ' checked' : '';
    const expanded = isSlideExpanded(slide.id);
    const statusLabel = slide.enabled ? 'Live' : 'Hidden';
    const toggleLabel = expanded ? 'Close' : 'Edit';

    return [
        '<article class="admin-slide-card" data-slide-index="',
        index,
        '" data-slide-id="',
        escapeHtml(slide.id),
        '">',
        '<div class="admin-slide-header admin-slide-header-clean">',
        '<div class="admin-slide-header-left">',
        '<span class="admin-slide-number">',
        index + 1,
        '</span>',
        '<div>',
        '<h2 class="admin-slide-name" data-role="slide-name">',
        escapeHtml(getSlideName(slide, index)),
        '</h2>',
        '<div class="admin-slide-header-meta">',
        '<span class="admin-pill" data-role="slide-live-pill" data-state="',
        slide.enabled ? 'live' : 'disabled',
        '">',
        statusLabel,
        '</span>',
        '<span class="admin-pill" data-role="slide-accent-pill" style="border-left:3px solid ',
        escapeHtml(slide.accent),
        '">',
        escapeHtml(slide.accent),
        '</span>',
        '</div>',
        '</div>',
        '</div>',
        '<div class="admin-slide-actions">',
        '<button class="admin-btn admin-btn-primary admin-btn-small" type="button" data-action="toggle-slide" aria-expanded="',
        expanded ? 'true' : 'false',
        '">',
        toggleLabel,
        '</button>',
        '<button class="admin-btn admin-btn-secondary admin-btn-small admin-btn-icon" type="button" data-action="move-up" title="Move Earlier">\u2191</button>',
        '<button class="admin-btn admin-btn-secondary admin-btn-small admin-btn-icon" type="button" data-action="move-down" title="Move Later">\u2193</button>',
        '<button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="duplicate-slide">Copy</button>',
        '<button class="admin-btn admin-btn-danger admin-btn-small" type="button" data-action="remove-slide">Delete</button>',
        '</div>',
        '</div>',
        '<div class="admin-slide-body"',
        expanded ? '' : ' hidden',
        '>',
        '<div class="admin-slide-settings-bar">',
        '<label class="admin-toggle admin-toggle-prominent">',
        '<input type="checkbox" data-field="enabled"',
        slide.enabled ? ' checked' : '',
        '>',
        '<span>Show on homepage</span>',
        '</label>',
        '<label class="admin-checkbox admin-checkbox-inline">',
        '<input type="checkbox" data-field="ctaNewTab"',
        slide.ctaNewTab ? ' checked' : '',
        '>',
        '<span>Open link in new tab</span>',
        '</label>',
        '<div class="admin-color-picker-inline">',
        '<input type="color" data-field="accent" value="',
        escapeHtml(slide.accent),
        '">',
        '<span class="admin-color-value" data-role="accent-value">',
        escapeHtml(slide.accent),
        '</span>',
        '<div class="admin-color-presets">',
        buildColorPresetButtons(),
        '</div>',
        '</div>',
        '</div>',
        '<div class="admin-slide-layout">',
        '<section class="admin-form-panel">',
        '<div class="admin-copy-columns admin-copy-columns-clean">',
        '<section class="admin-copy-panel">',
        '<div class="admin-copy-header">',
        '<div>',
        '<span class="admin-copy-badge">English</span>',
        '</div>',
        '</div>',
        '<div class="admin-field-grid admin-field-grid-single">',
        '<label class="admin-field">',
        '<span class="admin-field-label">Top Label <span class="admin-field-optional">(optional)</span></span>',
        '<input type="text" data-field="pill-en" value="',
        escapeHtml(slide.pill.en),
        '" placeholder="Available Today">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Main Title</span>',
        '<input type="text" data-field="title-en" value="',
        escapeHtml(slide.title.en),
        '" placeholder="Seasonal Flu Shots Are Here">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Highlight Words <span class="admin-field-optional">(optional)</span></span>',
        '<input type="text" data-field="titleAccent-en" value="',
        escapeHtml(slide.titleAccent.en),
        '" placeholder="Flu Shots">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Small Line</span>',
        '<input type="text" data-field="kicker-en" value="',
        escapeHtml(slide.kicker.en),
        '" placeholder="Protect yourself this season">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Supporting Text</span>',
        '<textarea data-field="subtext-en" placeholder="Tell visitors what this slide is about.">',
        escapeHtml(slide.subtext.en),
        '</textarea>',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Button Text <span class="admin-field-optional">(optional)</span></span>',
        '<input type="text" data-field="ctaLabel-en" value="',
        escapeHtml(slide.ctaLabel.en),
        '" placeholder="Schedule Appointment">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Button Link</span>',
        '<input type="text" data-field="ctaUrl" value="',
        escapeHtml(slide.ctaUrl),
        '" placeholder="https://example.com or #services">',
        '</label>',
        '</div>',
        '</section>',
        '<section class="admin-copy-panel">',
        '<div class="admin-copy-header">',
        '<div>',
        '<span class="admin-copy-badge">Spanish</span>',
        '</div>',
        '<div class="admin-copy-actions">',
        '<button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="translate-slide">Translate</button>',
        '<button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="copy-english">Copy English</button>',
        '</div>',
        '</div>',
        '<label class="admin-toggle admin-toggle-block admin-copy-toggle">',
        '<input type="checkbox" data-role="slide-auto-translate"',
        autoTranslateChecked,
        '>',
        '<span>Auto-translate while typing</span>',
        '</label>',
        '<div class="admin-field-grid admin-field-grid-single">',
        '<label class="admin-field">',
        '<span class="admin-field-label">Etiqueta (ES)</span>',
        '<input type="text" data-field="pill-es" value="',
        escapeHtml(slide.pill.es),
        '" placeholder="Disponible Hoy">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Titulo (ES)</span>',
        '<input type="text" data-field="title-es" value="',
        escapeHtml(slide.title.es),
        '" placeholder="Las Vacunas contra la Gripe Estan Aqui">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Palabras en Color (ES)</span>',
        '<input type="text" data-field="titleAccent-es" value="',
        escapeHtml(slide.titleAccent.es),
        '" placeholder="Vacunas contra la Gripe">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Linea Pequena (ES)</span>',
        '<input type="text" data-field="kicker-es" value="',
        escapeHtml(slide.kicker.es),
        '" placeholder="Protejase esta temporada">',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Texto de Apoyo (ES)</span>',
        '<textarea data-field="subtext-es" placeholder="Revise o ajuste la traduccion al espanol aqui.">',
        escapeHtml(slide.subtext.es),
        '</textarea>',
        '</label>',
        '<label class="admin-field">',
        '<span class="admin-field-label">Texto del Boton (ES)</span>',
        '<input type="text" data-field="ctaLabel-es" value="',
        escapeHtml(slide.ctaLabel.es),
        '" placeholder="Programar Cita">',
        '</label>',
        '</div>',
        '</section>',
        '</div>',
        '</section>',
        '<div class="admin-side-column">',
        '<section class="admin-side-panel">',
        '<h3 class="admin-panel-title">Preview</h3>',
        '<div class="admin-preview" data-role="slide-preview">',
        slideshow.buildPreviewMarkup(slide, 'en'),
        '</div>',
        '</section>',
        '<section class="admin-side-panel">',
        '<div class="admin-credentials-head">',
        '<div>',
        '<h3 class="admin-panel-title">Trust Points</h3>',
        '</div>',
        '<button class="admin-btn admin-btn-ghost admin-btn-small" type="button" data-action="add-credential">Add</button>',
        '</div>',
        '<div class="admin-credential-list">',
        buildCredentialRows(slide),
        '</div>',
        '</section>',
        '</div>',
        '</div>',
        '</div>',
        '</article>'
    ].join('');
}

function renderEditors() {
    if (!elements.editorList) {
        return;
    }

    reconcileSlideStateMaps();
    elements.editorList.innerHTML = slides.map(buildSlideCard).join('');
    refreshMetrics();
}

function getSelectedBannerColor() {
    if (!elements.bannerColorPicker) {
        return 'red';
    }

    var active = elements.bannerColorPicker.querySelector('.banner-color-btn.is-active');
    return active ? (active.dataset.bannerColor || 'red') : 'red';
}

function setSelectedBannerColor(color) {
    if (!elements.bannerColorPicker) {
        return;
    }

    var buttons = elements.bannerColorPicker.querySelectorAll('.banner-color-btn');
    buttons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.dataset.bannerColor === color);
    });
}

function readBannerFromForm() {
    return normalizeEmergencyBanner({
        enabled: !!(elements.bannerEnabled && elements.bannerEnabled.checked),
        color: getSelectedBannerColor(),
        showPill: !elements.bannerShowPill || elements.bannerShowPill.checked,
        showButton: !elements.bannerShowButton || elements.bannerShowButton.checked,
        pill: {
            en: elements.bannerPillEn ? elements.bannerPillEn.value : '',
            es: elements.bannerPillEs ? elements.bannerPillEs.value : ''
        },
        message: {
            en: elements.bannerMessageEn ? sanitizeBannerHtml(elements.bannerMessageEn.innerHTML) : '',
            es: elements.bannerMessageEs ? sanitizeBannerHtml(elements.bannerMessageEs.innerHTML) : ''
        },
        ctaLabel: {
            en: elements.bannerCtaLabelEn ? elements.bannerCtaLabelEn.value : '',
            es: elements.bannerCtaLabelEs ? elements.bannerCtaLabelEs.value : ''
        },
        ctaUrl: elements.bannerCtaUrl ? elements.bannerCtaUrl.value : '',
        ctaNewTab: !!(elements.bannerNewTab && elements.bannerNewTab.checked)
    });
}

function renderBannerPreview() {
    if (!elements.bannerPreview) {
        return;
    }

    elements.bannerPreview.innerHTML = buildBannerPreviewMarkup(emergencyBanner);
}

function applyBannerToForm(banner) {
    const nextBanner = normalizeEmergencyBanner(banner);

    emergencyBanner = nextBanner;

    if (elements.bannerEnabled) {
        elements.bannerEnabled.checked = nextBanner.enabled;
    }
    if (elements.bannerNewTab) {
        elements.bannerNewTab.checked = nextBanner.ctaNewTab;
    }
    if (elements.bannerShowPill) {
        elements.bannerShowPill.checked = nextBanner.showPill !== false;
    }
    if (elements.bannerShowButton) {
        elements.bannerShowButton.checked = nextBanner.showButton !== false;
    }
    setSelectedBannerColor(nextBanner.color);
    if (elements.bannerPillEn) {
        elements.bannerPillEn.value = nextBanner.pill.en;
    }
    if (elements.bannerPillEs) {
        elements.bannerPillEs.value = nextBanner.pill.es;
    }
    if (elements.bannerMessageEn) {
        elements.bannerMessageEn.innerHTML = sanitizeBannerHtml(nextBanner.message.en);
    }
    if (elements.bannerMessageEs) {
        elements.bannerMessageEs.innerHTML = sanitizeBannerHtml(nextBanner.message.es);
    }
    if (elements.bannerCtaLabelEn) {
        elements.bannerCtaLabelEn.value = nextBanner.ctaLabel.en;
    }
    if (elements.bannerCtaLabelEs) {
        elements.bannerCtaLabelEs.value = nextBanner.ctaLabel.es;
    }
    if (elements.bannerCtaUrl) {
        elements.bannerCtaUrl.value = nextBanner.ctaUrl;
    }

    renderBannerPreview();
}

function getFieldValue(card, fieldName) {
    const field = card.querySelector('[data-field="' + fieldName + '"]');
    return field ? field.value.trim() : '';
}

function getCheckboxValue(card, fieldName) {
    const field = card.querySelector('[data-field="' + fieldName + '"]');
    return !!(field && field.checked);
}

function readSlideFromCard(card) {
    const credentials = Array.from(card.querySelectorAll('.admin-credential-row')).map(function (row) {
        const englishInput = row.querySelector('[data-role="credential-en"]');
        const spanishInput = row.querySelector('[data-role="credential-es"]');

        return {
            en: englishInput ? englishInput.value.trim() : '',
            es: spanishInput ? spanishInput.value.trim() : ''
        };
    }).filter(function (credential) {
        return credential.en || credential.es;
    });

    return store.normalizeSlide({
        id: card.dataset.slideId || '',
        enabled: getCheckboxValue(card, 'enabled'),
        accent: getFieldValue(card, 'accent'),
        pill: {
            en: getFieldValue(card, 'pill-en'),
            es: getFieldValue(card, 'pill-es')
        },
        title: {
            en: getFieldValue(card, 'title-en'),
            es: getFieldValue(card, 'title-es')
        },
        titleAccent: {
            en: getFieldValue(card, 'titleAccent-en'),
            es: getFieldValue(card, 'titleAccent-es')
        },
        kicker: {
            en: getFieldValue(card, 'kicker-en'),
            es: getFieldValue(card, 'kicker-es')
        },
        subtext: {
            en: getFieldValue(card, 'subtext-en'),
            es: getFieldValue(card, 'subtext-es')
        },
        ctaLabel: {
            en: getFieldValue(card, 'ctaLabel-en'),
            es: getFieldValue(card, 'ctaLabel-es')
        },
        ctaUrl: getFieldValue(card, 'ctaUrl'),
        ctaNewTab: getCheckboxValue(card, 'ctaNewTab'),
        credentials: credentials
    });
}

function syncSlidesFromDom() {
    const cards = elements.editorList
        ? Array.from(elements.editorList.querySelectorAll('.admin-slide-card'))
        : [];

    if (!cards.length) {
        return slides;
    }

    slides = cards.map(readSlideFromCard);
    cards.forEach(function (card) {
        const toggle = card.querySelector('[data-role="slide-auto-translate"]');
        const slideId = card.dataset.slideId;
        if (toggle && slideId) {
            setSlideAutoTranslateEnabled(slideId, toggle.checked);
        }
    });
    refreshMetrics();
    return slides;
}

function setCardFieldValue(card, fieldName, value) {
    const field = card.querySelector('[data-field="' + fieldName + '"]');
    if (field) {
        field.value = value || '';
    }
}

function setCredentialValue(row, role, value) {
    const field = row.querySelector('[data-role="' + role + '"]');
    if (field) {
        field.value = value || '';
    }
}

function refreshSlideCard(card, slide, index) {
    const name = card.querySelector('[data-role="slide-name"]');
    const livePill = card.querySelector('[data-role="slide-live-pill"]');
    const accentPill = card.querySelector('[data-role="slide-accent-pill"]');
    const preview = card.querySelector('[data-role="slide-preview"]');
    const accentValue = card.querySelector('[data-role="accent-value"]');
    const slideNumber = card.querySelector('.admin-slide-number');

    if (name) {
        name.textContent = getSlideName(slide, index);
    }

    if (slideNumber) {
        slideNumber.textContent = index + 1;
    }

    if (livePill) {
        livePill.textContent = slide.enabled ? 'Live' : 'Hidden';
        livePill.dataset.state = slide.enabled ? 'live' : 'disabled';
    }

    if (preview) {
        preview.innerHTML = slideshow.buildPreviewMarkup(slide, 'en');
    }

    if (accentValue) {
        accentValue.textContent = slide.accent;
    }

    if (accentPill) {
        accentPill.textContent = slide.accent;
        accentPill.style.borderLeft = '3px solid ' + slide.accent;
    }
}

function applySlideToCard(card, slide, index, options) {
    const settings = options || {};
    const englishOnly = !!settings.englishOnly;
    const spanishOnly = !!settings.spanishOnly;

    if (!spanishOnly) {
        setCardFieldValue(card, 'pill-en', slide.pill.en);
        setCardFieldValue(card, 'title-en', slide.title.en);
        setCardFieldValue(card, 'titleAccent-en', slide.titleAccent.en);
        setCardFieldValue(card, 'kicker-en', slide.kicker.en);
        setCardFieldValue(card, 'subtext-en', slide.subtext.en);
        setCardFieldValue(card, 'ctaLabel-en', slide.ctaLabel.en);
        setCardFieldValue(card, 'ctaUrl', slide.ctaUrl);
    }

    if (!englishOnly) {
        setCardFieldValue(card, 'pill-es', slide.pill.es);
        setCardFieldValue(card, 'title-es', slide.title.es);
        setCardFieldValue(card, 'titleAccent-es', slide.titleAccent.es);
        setCardFieldValue(card, 'kicker-es', slide.kicker.es);
        setCardFieldValue(card, 'subtext-es', slide.subtext.es);
        setCardFieldValue(card, 'ctaLabel-es', slide.ctaLabel.es);

        const rows = Array.from(card.querySelectorAll('.admin-credential-row'));
        rows.forEach(function (row, credentialIndex) {
            const credential = slide.credentials[credentialIndex] || { en: '', es: '' };
            setCredentialValue(row, 'credential-es', credential.es);
            if (!spanishOnly) {
                setCredentialValue(row, 'credential-en', credential.en);
            }
        });
    }

    refreshSlideCard(card, slide, index);
}

function validateSlides(candidateSlides) {
    if (!candidateSlides.length) {
        return 'Create at least one slide before saving.';
    }

    const liveSlides = candidateSlides.filter(function (slide) {
        return slide.enabled;
    });

    if (!liveSlides.length) {
        return 'Leave at least one slide enabled for the homepage.';
    }

    const invalidTitle = candidateSlides.find(function (slide) {
        return !(slide.title.en || slide.title.es);
    });

    if (invalidTitle) {
        return 'Every slide needs a title in at least one language.';
    }

    return '';
}

function clearEditorState() {
    cancelAllPendingTranslations();
    slides = [];
    remoteSlides = store.getSlides();
    hasUnsavedChanges = false;
    expandedSlideId = null;
    slideAutoTranslateState.clear();
    translationRuns.clear();
    renderEditors();
}

function clearBannerEditorState() {
    cancelPendingBannerTranslation();
    remoteEmergencyBanner = createDefaultEmergencyBanner();
    hasUnsavedBannerChanges = false;
    setBannerAutoTranslateEnabled(true);
    applyBannerToForm(createDefaultEmergencyBanner());
    translationCache.clear();
}

function applyRemoteSlides(nextSlides, message, force) {
    cancelAllPendingTranslations();
    remoteSlides = cloneSlides(nextSlides);
    store.setRemoteSlides(remoteSlides);

    if (!expandedSlideId || !remoteSlides.some(function (slide) {
        return slide.id === expandedSlideId;
    })) {
        expandedSlideId = remoteSlides.length ? remoteSlides[0].id : null;
    }

    if (!slides.length || force || !hasUnsavedChanges) {
        slides = cloneSlides(remoteSlides);
        renderEditors();
        clearDirty(message || 'Homepage slides are up to date.');
        return;
    }

    if (!isSameSlides(remoteSlides, slides)) {
        setStatus('A newer saved version of the homepage slides is available. Reload it or publish your current edits first.', 'warning');
    }
}

function applyRemoteBanner(nextBanner, message, force) {
    remoteEmergencyBanner = normalizeEmergencyBanner(nextBanner);

    if (force || !hasUnsavedBannerChanges) {
        applyBannerToForm(remoteEmergencyBanner);
        clearBannerDirty(message || 'Urgent banner is up to date.');
        return;
    }

    if (JSON.stringify(remoteEmergencyBanner) !== JSON.stringify(emergencyBanner)) {
        setBannerStatus('A newer saved version of the urgent banner is available. Reload it or publish your current edits first.', 'warning');
    }
}

async function translateTextToSpanish(text) {
    const cleanText = typeof text === 'string' ? text.trim() : '';

    if (!cleanText) {
        return '';
    }

    if (translationCache.has(cleanText)) {
        return translationCache.get(cleanText);
    }

    const request = fetch(GOOGLE_TRANSLATE_URL + encodeURIComponent(cleanText))
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Automatic Spanish translation is temporarily unavailable.');
            }

            return response.json();
        })
        .then(function (data) {
            const chunks = Array.isArray(data) ? data[0] : null;

            if (!Array.isArray(chunks)) {
                throw new Error('Automatic Spanish translation returned an unexpected response.');
            }

            return chunks.map(function (chunk) {
                return Array.isArray(chunk) ? chunk[0] || '' : '';
            }).join('').trim();
        })
        .catch(function (error) {
            translationCache.delete(cleanText);
            throw error;
        });

    translationCache.set(cleanText, request);
    return request;
}

async function buildTranslatedSlide(slide) {
    const translatedSlide = cloneSlides([slide])[0];

    const translations = await Promise.all([
        translateTextToSpanish(slide.pill.en),
        translateTextToSpanish(slide.title.en),
        translateTextToSpanish(slide.titleAccent.en),
        translateTextToSpanish(slide.kicker.en),
        translateTextToSpanish(slide.subtext.en),
        translateTextToSpanish(slide.ctaLabel.en)
    ]);

    translatedSlide.pill.es = translations[0];
    translatedSlide.title.es = translations[1];
    translatedSlide.titleAccent.es = translations[2];
    translatedSlide.kicker.es = translations[3];
    translatedSlide.subtext.es = translations[4];
    translatedSlide.ctaLabel.es = translations[5];

    translatedSlide.credentials = await Promise.all(slide.credentials.map(async function (credential) {
        return {
            en: credential.en,
            es: await translateTextToSpanish(credential.en)
        };
    }));

    return store.normalizeSlide(translatedSlide);
}

function nextBannerTranslationRun() {
    bannerTranslateRun += 1;
    return bannerTranslateRun;
}

function cancelPendingBannerTranslation() {
    if (bannerTranslateTimer) {
        window.clearTimeout(bannerTranslateTimer);
        bannerTranslateTimer = null;
    }

    nextBannerTranslationRun();
}

async function buildTranslatedBanner(banner) {
    const translatedBanner = normalizeEmergencyBanner(banner);
    const translations = await Promise.all([
        translateTextToSpanish(translatedBanner.pill.en),
        translateTextToSpanish(stripHtmlTags(translatedBanner.message.en)),
        translateTextToSpanish(translatedBanner.ctaLabel.en)
    ]);

    translatedBanner.pill.es = translations[0] || translatedBanner.pill.es;
    translatedBanner.message.es = translations[1];
    translatedBanner.ctaLabel.es = translations[2];
    return normalizeEmergencyBanner(translatedBanner);
}

function copyBannerEnglishToSpanishData(banner) {
    return normalizeEmergencyBanner({
        enabled: banner.enabled,
        color: banner.color,
        showPill: banner.showPill,
        showButton: banner.showButton,
        pill: { en: banner.pill.en, es: banner.pill.en },
        message: { en: banner.message.en, es: banner.message.en },
        ctaLabel: { en: banner.ctaLabel.en, es: banner.ctaLabel.en },
        ctaUrl: banner.ctaUrl,
        ctaNewTab: banner.ctaNewTab
    });
}

async function translateBannerToSpanish(options) {
    const settings = options || {};
    const silent = !!settings.silent;
    const bannerToTranslate = readBannerFromForm();
    const run = nextBannerTranslationRun();

    try {
        if (!silent) {
            setBannerStatus('Translating the urgent banner into Spanish...', 'info');
        }

        const translatedBanner = await buildTranslatedBanner(bannerToTranslate);

        if (bannerTranslateRun !== run) {
            return false;
        }

        const latestBanner = readBannerFromForm();
        emergencyBanner = normalizeEmergencyBanner({
            enabled: latestBanner.enabled,
            color: latestBanner.color,
            showPill: latestBanner.showPill,
            showButton: latestBanner.showButton,
            pill: {
                en: latestBanner.pill.en,
                es: translatedBanner.pill.es
            },
            message: {
                en: latestBanner.message.en,
                es: translatedBanner.message.es
            },
            ctaLabel: {
                en: latestBanner.ctaLabel.en,
                es: translatedBanner.ctaLabel.es
            },
            ctaUrl: latestBanner.ctaUrl,
            ctaNewTab: latestBanner.ctaNewTab
        });
        applyBannerToForm(emergencyBanner);
        bannerTranslateTimer = null;

        if (!silent) {
            markBannerDirty('Spanish banner text updated. Publish when ready.');
        } else {
            renderBannerPreview();
        }

        return true;
    } catch (error) {
        bannerTranslateTimer = null;
        if (!silent) {
            setBannerStatus(error.message || getFriendlyFirebaseError(error), 'danger');
        } else {
            console.warn('MMC banner auto-translate:', error.message || getFriendlyFirebaseError(error));
        }

        return false;
    }
}

function copyBannerEnglishToSpanish() {
    cancelPendingBannerTranslation();
    emergencyBanner = copyBannerEnglishToSpanishData(readBannerFromForm());
    applyBannerToForm(emergencyBanner);
    markBannerDirty('English banner text copied into the Spanish fields. Publish when ready.');
}

function scheduleBannerAutoTranslate() {
    if (!isBannerAutoTranslateEnabled()) {
        return;
    }

    cancelPendingBannerTranslation();
    bannerTranslateTimer = window.setTimeout(function () {
        translateBannerToSpanish({ silent: true });
    }, 900);
}

function copyEnglishToSpanishData(slide) {
    return store.normalizeSlide({
        id: slide.id,
        enabled: slide.enabled,
        accent: slide.accent,
        pill: { en: slide.pill.en, es: slide.pill.en },
        title: { en: slide.title.en, es: slide.title.en },
        titleAccent: { en: slide.titleAccent.en, es: slide.titleAccent.en },
        kicker: { en: slide.kicker.en, es: slide.kicker.en },
        subtext: { en: slide.subtext.en, es: slide.subtext.en },
        ctaLabel: { en: slide.ctaLabel.en, es: slide.ctaLabel.en },
        ctaUrl: slide.ctaUrl,
        ctaNewTab: slide.ctaNewTab,
        credentials: slide.credentials.map(function (credential) {
            return {
                en: credential.en,
                es: credential.en
            };
        })
    });
}

function getTranslationRun(slideId) {
    return translationRuns.get(slideId) || 0;
}

function nextTranslationRun(slideId) {
    const nextRun = getTranslationRun(slideId) + 1;
    translationRuns.set(slideId, nextRun);
    return nextRun;
}

async function translateSlideById(slideId, options) {
    const settings = options || {};
    const silent = !!settings.silent;

    syncSlidesFromDom();

    let index = findSlideIndexById(slideId);
    let card = getSlideCardById(slideId);

    if (index < 0 || !card) {
        return;
    }

    const slide = slides[index];
    const run = nextTranslationRun(slideId);

    try {
        if (!silent) {
            setStatus('Translating slide ' + (index + 1) + ' into Spanish...', 'info');
        }

        const translatedSlide = await buildTranslatedSlide(slide);

        if (getTranslationRun(slideId) !== run) {
            return false;
        }

        syncSlidesFromDom();
        index = findSlideIndexById(slideId);
        card = getSlideCardById(slideId);

        if (index < 0 || !card) {
            return false;
        }

        slides[index] = store.normalizeSlide({
            id: slideId,
            enabled: slides[index].enabled,
            accent: slides[index].accent,
            pill: {
                en: slides[index].pill.en,
                es: translatedSlide.pill.es
            },
            title: {
                en: slides[index].title.en,
                es: translatedSlide.title.es
            },
            titleAccent: {
                en: slides[index].titleAccent.en,
                es: translatedSlide.titleAccent.es
            },
            kicker: {
                en: slides[index].kicker.en,
                es: translatedSlide.kicker.es
            },
            subtext: {
                en: slides[index].subtext.en,
                es: translatedSlide.subtext.es
            },
            ctaLabel: {
                en: slides[index].ctaLabel.en,
                es: translatedSlide.ctaLabel.es
            },
            ctaUrl: slides[index].ctaUrl,
            ctaNewTab: slides[index].ctaNewTab,
            credentials: slides[index].credentials.map(function (credential, credentialIndex) {
                return {
                    en: credential.en,
                    es: translatedSlide.credentials[credentialIndex]
                        ? translatedSlide.credentials[credentialIndex].es
                        : ''
                };
            })
        });
        applySlideToCard(card, slides[index], index, { spanishOnly: true });
        clearTranslationTimer(slideId);

        if (!silent) {
            markDirty('Spanish translation updated. Publish when ready.');
        } else {
            refreshMetrics();
        }

        return true;
    } catch (error) {
        clearTranslationTimer(slideId);
        if (!silent) {
            setStatus(error.message || getFriendlyFirebaseError(error), 'danger');
        } else {
            console.warn('MMC auto-translate:', error.message || getFriendlyFirebaseError(error));
        }

        return false;
    }
}

async function translateSlide(index, options) {
    syncSlidesFromDom();

    if (index < 0 || index >= slides.length) {
        return false;
    }

    return translateSlideById(slides[index].id, options);
}

async function translateAllSlides() {
    const currentSlides = syncSlidesFromDom();

    if (!currentSlides.length) {
        setStatus('Add a slide first, then run automatic Spanish translation.', 'warning');
        return;
    }

    setStatus('Translating all slides into Spanish...', 'info');

    let successCount = 0;
    let failureCount = 0;

    for (const slide of currentSlides) {
        const translated = await translateSlideById(slide.id, { silent: true });
        if (translated) {
            successCount += 1;
        } else {
            failureCount += 1;
        }
    }

    if (!successCount) {
        setStatus('Automatic Spanish translation is temporarily unavailable. You can still edit the Spanish fields manually.', 'danger');
        return;
    }

    hasUnsavedChanges = true;
    setStatus(
        failureCount
            ? 'Translated ' + successCount + ' slides. ' + failureCount + ' slide(s) still need manual Spanish review.'
            : 'Spanish translation updated for all slides. Publish when ready.',
        failureCount ? 'warning' : 'success'
    );
    refreshMetrics();
}

function copyEnglishToSpanish(index) {
    const slideCards = elements.editorList
        ? Array.from(elements.editorList.querySelectorAll('.admin-slide-card'))
        : [];
    const card = slideCards[index];

    syncSlidesFromDom();

    if (index < 0 || index >= slides.length || !card) {
        return;
    }

    cancelPendingTranslation(slides[index].id);
    slides[index] = copyEnglishToSpanishData(slides[index]);
    applySlideToCard(card, slides[index], index, { spanishOnly: true });
    markDirty('English text copied into the Spanish fields. Publish when ready.');
}

function scheduleAutoTranslate(slideId) {
    const slideIndex = findSlideIndexById(slideId);
    const slide = slideIndex >= 0 ? slides[slideIndex] : null;

    if (!slide || !isSlideAutoTranslateEnabled(slide.id)) {
        return;
    }

    clearTranslationTimer(slide.id);

    translationTimers.set(slide.id, window.setTimeout(function () {
        translateSlideById(slide.id, { silent: true });
    }, 900));
}

function shouldAutoTranslateTarget(target) {
    if (!target) {
        return false;
    }

    const fieldName = target.dataset.field || '';
    return fieldName.endsWith('-en') || target.dataset.role === 'credential-en';
}

function shouldProtectManualSpanishEdit(target) {
    if (!target) {
        return false;
    }

    const fieldName = target.dataset.field || '';
    return fieldName.endsWith('-es') || target.dataset.role === 'credential-es';
}

function turnOffSlideAutoTranslate(card) {
    if (!card) {
        return;
    }

    const slideId = card.dataset.slideId;
    const toggle = card.querySelector('[data-role="slide-auto-translate"]');

    if (!slideId || !isSlideAutoTranslateEnabled(slideId)) {
        return;
    }

    cancelPendingTranslation(slideId);
    setSlideAutoTranslateEnabled(slideId, false);

    if (toggle) {
        toggle.checked = false;
    }

    setStatus('Automatic Spanish fill was turned off for this slide so your manual Spanish edits stay in place.', 'info');
}

function addSlide(slideData, message) {
    syncSlidesFromDom();
    const nextSlide = store.normalizeSlide(slideData || store.createSlideTemplate());

    if (!slideAutoTranslateState.has(nextSlide.id)) {
        slideAutoTranslateState.set(nextSlide.id, true);
    }

    slides.push(nextSlide);
    expandedSlideId = nextSlide.id;
    setActiveAdminTab('slides');
    renderEditors();
    markDirty(message || 'New slide added. Publish when ready.');

    const cards = elements.editorList
        ? elements.editorList.querySelectorAll('.admin-slide-card')
        : [];
    const lastCard = cards[cards.length - 1];

    if (lastCard) {
        lastCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (isGlobalAutoTranslateEnabled()) {
        window.setTimeout(function () {
            translateSlideById(nextSlide.id, { silent: true });
        }, 120);
    }
}

function useTemplate(templateId) {
    const template = SLIDE_TEMPLATES.find(function (item) {
        return item.id === templateId;
    });

    if (!template) {
        return;
    }

    addSlide(template.buildSlide(), template.name + ' added. Publish when ready.');
}

async function reloadFromFirebase() {
    if (hasUnsavedChanges && !window.confirm('Discard your current slide edits and reload the latest saved version?')) {
        return;
    }

    try {
        const latestSlides = await fetchHomepageSlides();
        applyRemoteSlides(latestSlides, 'Latest saved homepage slides loaded.', true);
    } catch (error) {
        setStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

async function saveSlides() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        setStatus('Sign in before publishing homepage slide changes.', 'danger');
        return;
    }

    const candidateSlides = syncSlidesFromDom();
    const validationError = validateSlides(candidateSlides);

    if (validationError) {
        setStatus(validationError, 'danger');
        return;
    }

    try {
        const savedSlides = await saveHomepageSlides(candidateSlides, currentUser);
        applyRemoteSlides(savedSlides, 'Homepage slides published.', true);
    } catch (error) {
        setStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

function resetSlidesToDefault() {
    if (!window.confirm('Load the starter slides into the editor? You can review them, then publish when ready.')) {
        return;
    }

    cancelAllPendingTranslations();
    slides = cloneSlides(store.defaultSlides);
    expandedSlideId = slides.length ? slides[0].id : null;
    setActiveAdminTab('slides');
    renderEditors();
    markDirty('Starter slides loaded. Publish when ready.');
}

function exportSlides() {
    const payload = {
        version: 3,
        exportedAt: new Date().toISOString(),
        slides: syncSlidesFromDom()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'mmc-homepage-slides.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    setStatus('Backup downloaded.', 'success');
}

function importSlides(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function (loadEvent) {
        try {
            const parsed = JSON.parse(String(loadEvent.target.result || ''));
            const incomingSlides = Array.isArray(parsed) ? parsed : parsed.slides;

            if (!Array.isArray(incomingSlides) || !incomingSlides.length) {
                throw new Error('That backup file does not contain any slides.');
            }

            cancelAllPendingTranslations();
            slides = cloneSlides(incomingSlides);
            expandedSlideId = slides.length ? slides[0].id : null;
            setActiveAdminTab('slides');
            renderEditors();
            markDirty('Backup loaded. Publish when ready.');
        } catch (error) {
            setStatus(error.message || 'That backup file could not be opened.', 'danger');
        } finally {
            event.target.value = '';
        }
    };

    reader.onerror = function () {
        setStatus('That backup file could not be read.', 'danger');
        event.target.value = '';
    };

    reader.readAsText(file);
}

function duplicateSlide(index) {
    syncSlidesFromDom();

    if (index < 0 || index >= slides.length) {
        return;
    }

    const copy = JSON.parse(JSON.stringify(slides[index]));
    copy.id = '';
    addSlide(copy, 'Slide copied. Publish when ready.');
}

function moveSlide(index, direction) {
    syncSlidesFromDom();

    if (index < 0 || index >= slides.length) {
        return;
    }

    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= slides.length) {
        return;
    }

    const movingSlide = slides[index];
    slides[index] = slides[targetIndex];
    slides[targetIndex] = movingSlide;
    renderEditors();
    markDirty('Slide order updated. Publish when ready.');
}

function removeSlide(index) {
    syncSlidesFromDom();

    if (index < 0 || index >= slides.length) {
        return;
    }

    if (slides.length === 1) {
        setStatus('Keep at least one slide in the slideshow.', 'danger');
        return;
    }

    if (!window.confirm('Remove this slide from the editor?')) {
        return;
    }

    const removedSlideId = slides[index].id;
    slides.splice(index, 1);
    if (expandedSlideId === removedSlideId) {
        expandedSlideId = slides[index] ? slides[index].id : (slides[index - 1] ? slides[index - 1].id : null);
    }
    renderEditors();
    markDirty('Slide removed. Publish when ready.');
}

function addCredential(index) {
    syncSlidesFromDom();

    if (index < 0 || index >= slides.length) {
        return;
    }

    slides[index].credentials.push({ en: '', es: '' });
    renderEditors();
    markDirty('Trust point added. Publish when ready.');
}

function removeCredential(index, credentialIndex) {
    syncSlidesFromDom();

    if (index < 0 || index >= slides.length) {
        return;
    }

    if (credentialIndex < 0 || credentialIndex >= slides[index].credentials.length) {
        return;
    }

    slides[index].credentials.splice(credentialIndex, 1);
    renderEditors();
    markDirty('Trust point removed. Publish when ready.');
}

function handleEditorInput(event) {
    const card = event.target.closest('.admin-slide-card');

    if (!card) {
        return;
    }

    const slideIndex = Number(card.dataset.slideIndex);

    if (Number.isNaN(slideIndex) || !slides[slideIndex]) {
        return;
    }

    if (event.target.dataset.role === 'slide-auto-translate') {
        setSlideAutoTranslateEnabled(card.dataset.slideId, event.target.checked);
        if (!event.target.checked) {
            cancelPendingTranslation(card.dataset.slideId);
        }
        setStatus(event.target.checked
            ? 'Automatic Spanish fill turned on for this slide.'
            : 'Automatic Spanish fill turned off for this slide. Manual Spanish text will stay as written.', 'info');
        refreshMetrics();
        return;
    }

    if (shouldProtectManualSpanishEdit(event.target)) {
        turnOffSlideAutoTranslate(card);
    }

    slides[slideIndex] = readSlideFromCard(card);
    refreshSlideCard(card, slides[slideIndex], slideIndex);
    markDirty('You have unpublished slide changes.');

    if (shouldAutoTranslateTarget(event.target)) {
        scheduleAutoTranslate(card.dataset.slideId);
    }
}

function handleEditorClick(event) {
    const actionTrigger = event.target.closest('[data-action]');

    if (!actionTrigger) {
        return;
    }

    const action = actionTrigger.dataset.action;

    if (action === 'use-template') {
        useTemplate(actionTrigger.dataset.templateId);
        return;
    }

    const card = actionTrigger.closest('.admin-slide-card');
    const slideIndex = card ? Number(card.dataset.slideIndex) : -1;

    if (action === 'toggle-slide') {
        if (card && card.dataset.slideId) {
            toggleSlideExpanded(card.dataset.slideId);
        }
    } else if (action === 'move-up') {
        moveSlide(slideIndex, -1);
    } else if (action === 'move-down') {
        moveSlide(slideIndex, 1);
    } else if (action === 'duplicate-slide') {
        duplicateSlide(slideIndex);
    } else if (action === 'remove-slide') {
        removeSlide(slideIndex);
    } else if (action === 'add-credential') {
        addCredential(slideIndex);
    } else if (action === 'remove-credential') {
        const row = actionTrigger.closest('.admin-credential-row');
        const credentialIndex = row ? Number(row.dataset.credentialIndex) : -1;

        if (!Number.isNaN(credentialIndex) && credentialIndex >= 0) {
            removeCredential(slideIndex, credentialIndex);
        }
    } else if (action === 'translate-slide') {
        translateSlide(slideIndex);
    } else if (action === 'copy-english') {
        copyEnglishToSpanish(slideIndex);
    } else if (action === 'set-color') {
        if (card && actionTrigger.dataset.color) {
            setCardFieldValue(card, 'accent', actionTrigger.dataset.color);
            slides[slideIndex] = readSlideFromCard(card);
            refreshSlideCard(card, slides[slideIndex], slideIndex);
            markDirty('Highlight color updated.');
        }
    }
}

function useBannerPreset(presetId) {
    const preset = BANNER_PRESETS.find(function (item) {
        return item.id === presetId;
    });

    if (!preset) {
        return;
    }

    applyBannerToForm(preset.banner);
    setActiveAdminTab('banner');
    markBannerDirty(preset.label + ' example loaded. Publish when ready.');

    if (isBannerAutoTranslateEnabled()) {
        window.setTimeout(function () {
            translateBannerToSpanish({ silent: true });
        }, 120);
    }
}

async function reloadBannerFromFirebase() {
    if (hasUnsavedBannerChanges && !window.confirm('Discard your current banner edits and reload the latest saved version?')) {
        return;
    }

    try {
        const latestBanner = await fetchEmergencyBanner();
        applyRemoteBanner(latestBanner, 'Latest saved urgent banner loaded.', true);
    } catch (error) {
        setBannerStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

async function saveBanner() {
    const currentUser = auth.currentUser;
    const candidateBanner = readBannerFromForm();

    if (!currentUser) {
        setBannerStatus('Sign in before publishing urgent banner changes.', 'danger');
        return;
    }

    if (candidateBanner.enabled && !getLocalizedBannerText(candidateBanner.message, 'en')) {
        setBannerStatus('Add a banner message before turning the sitewide alert on.', 'danger');
        return;
    }

    try {
        const savedBanner = await saveEmergencyBanner(candidateBanner, currentUser);
        applyRemoteBanner(savedBanner, 'Urgent banner published.', true);
    } catch (error) {
        setBannerStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

function resetBanner() {
    if (!window.confirm('Turn off the sitewide emergency banner and clear the current message?')) {
        return;
    }

    cancelPendingBannerTranslation();
    setBannerAutoTranslateEnabled(true);
    applyBannerToForm(createDefaultEmergencyBanner());
    markBannerDirty('Urgent banner cleared. Publish when ready.');
}

function turnOffBannerAutoTranslate() {
    if (!isBannerAutoTranslateEnabled()) {
        return;
    }

    cancelPendingBannerTranslation();
    setBannerAutoTranslateEnabled(false);
    setBannerStatus('Automatic Spanish fill was turned off for the banner so your manual Spanish edits stay in place.', 'info');
}

/* ═══════════════════════════════════════════════════
   Scheduled Banners
   ═══════════════════════════════════════════════════ */

function setScheduleStatus(message, tone) {
    if (!elements.scheduleStatus) return;
    elements.scheduleStatus.textContent = message;
    elements.scheduleStatus.dataset.tone = tone || 'info';
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    var y = parts[0];
    return months[m - 1] + ' ' + d + ', ' + y;
}

function getScheduledBannerStatus(entry) {
    var recurrence = entry.recurrence || { mode: 'dates', days: [] };
    var now = new Date();

    if (recurrence.mode === 'weekly') {
        if (!Array.isArray(recurrence.days) || recurrence.days.length === 0) {
            return { label: 'Incomplete', tone: 'muted' };
        }
        if (recurrence.days.indexOf(now.getDay()) !== -1) {
            return { label: 'Active Now', tone: 'success' };
        }
        return { label: 'Recurring', tone: 'info' };
    }

    if (recurrence.mode === 'biweekly') {
        if (!Array.isArray(recurrence.days) || recurrence.days.length === 0 || !recurrence.anchorDate) {
            return { label: 'Incomplete', tone: 'muted' };
        }
        var todayDow = now.getDay();
        if (recurrence.days.indexOf(todayDow) !== -1) {
            // Check if this is the correct parity week
            var anchorParts = recurrence.anchorDate.split('-');
            var anchorMs = new Date(parseInt(anchorParts[0], 10), parseInt(anchorParts[1], 10) - 1, parseInt(anchorParts[2], 10)).getTime();
            var todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            var diffDays = Math.floor((todayMs - anchorMs) / 86400000);
            var currentWeekIndex = Math.floor(diffDays / 7);
            var currentParity = ((currentWeekIndex % 2) + 2) % 2;
            if (currentParity === (recurrence.weekParity || 0)) {
                return { label: 'Active Now', tone: 'success' };
            }
        }
        var parityLabel = recurrence.weekParity === 1 ? 'Week B' : 'Week A';
        return { label: 'Alternating \u00B7 ' + parityLabel, tone: 'info' };
    }

    if (!entry.startDate || !entry.endDate) return { label: 'Incomplete', tone: 'muted' };
    var todayStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

    if (todayStr > entry.endDate) return { label: 'Expired', tone: 'muted' };
    if (todayStr >= entry.startDate && todayStr <= entry.endDate) return { label: 'Active Now', tone: 'success' };
    return { label: 'Upcoming', tone: 'info' };
}

function renderScheduledBannerCard(entry) {
    var status = getScheduledBannerStatus(entry);
    var messageText = stripHtmlTags(getLocalizedBannerText(entry.banner.message, 'en'));
    var pillText = getLocalizedBannerText(entry.banner.pill, 'en');
    var color = entry.banner.color || 'green';
    var showPill = entry.banner.showPill !== false;
    var truncatedMessage = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
    var recurrence = entry.recurrence || { mode: 'dates', days: [] };
    var isWeekly = recurrence.mode === 'weekly';
    var isBiweekly = recurrence.mode === 'biweekly';
    var activeDays = Array.isArray(recurrence.days) ? recurrence.days : [];
    var dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    var recurrenceLabel = '';
    if ((isWeekly || isBiweekly) && activeDays.length > 0) {
        recurrenceLabel = activeDays.map(function(d) { return dayNames[d]; }).join(', ');
    }

    var dateDisplay = '';
    if (isBiweekly) {
        var weekLabel = (recurrence.weekParity === 1) ? 'Week B' : 'Week A';
        dateDisplay = '<span class="sched-recurrence-tag sched-recurrence-biweekly"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="vertical-align:-1px"><path d="M1 6a5 5 0 019.33-2.5M11 6a5 5 0 01-9.33 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M10 1v2.5H7.5M2 11V8.5h2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + weekLabel + ' &middot; ' + recurrenceLabel + '</span>';
    } else if (isWeekly) {
        dateDisplay = '<span class="sched-recurrence-tag"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="vertical-align:-1px"><path d="M1 6a5 5 0 019.33-2.5M11 6a5 5 0 01-9.33 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M10 1v2.5H7.5M2 11V8.5h2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Every ' + recurrenceLabel + '</span>';
    } else {
        dateDisplay = '<span class="sched-date-range"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="vertical-align:-1px;margin-right:3px;"><rect x="1.5" y="1.5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1"/><path d="M1.5 4.5h9M4 1.5v2M8 1.5v2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>' + formatDateDisplay(entry.startDate) + ' &mdash; ' + formatDateDisplay(entry.endDate) + '</span>';
    }

    var dayPickerHtml = dayLabels.map(function(lbl, idx) {
        var active = activeDays.indexOf(idx) !== -1 ? ' is-active' : '';
        return '<button type="button" class="sched-day-btn' + active + '" data-sched-day="' + idx + '">' + lbl + '</button>';
    }).join('');

    return [
        '<div class="sched-card" data-sched-id="' + escapeHtml(entry.id) + '">',
        '  <div class="sched-card-header">',
        '    <div class="sched-card-header-left">',
        '      <span class="sched-status sched-status-' + status.tone + '">' + status.label + '</span>',
        '      <span class="sched-label">' + escapeHtml(entry.label) + '</span>',
        '    </div>',
        '    <div class="sched-card-header-right">',
        '      <button type="button" class="sched-action sched-action-delete" data-sched-delete="' + escapeHtml(entry.id) + '" title="Delete">',
        '        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        '      </button>',
        '    </div>',
        '  </div>',
        '  <div class="sched-card-body">',
        '    <div class="sched-dates">' + dateDisplay + '</div>',
        '    <div class="sched-banner-preview-mini">',
        '      <span class="sched-color-dot" style="background:' + (color === 'red' ? '#ff3b30' : color === 'orange' ? '#ff9500' : color === 'yellow' ? '#ffcc00' : '#34c759') + '"></span>',
        (pillText ? '<span class="sched-pill-text">' + escapeHtml(pillText) + '</span>' : ''),
        '      <span class="sched-message-text">' + escapeHtml(truncatedMessage) + '</span>',
        '    </div>',
        '  </div>',
        '  <details class="sched-card-edit">',
        '    <summary class="sched-edit-trigger"></summary>',
        '    <div class="sched-edit-body">',

        '      <div class="sched-section">',
        '        <p class="sched-section-title">General</p>',
        '        <div class="sched-grid">',
        '          <label class="sched-field sched-field-full">',
        '            <span class="sched-label-text">Label</span>',
        '            <input type="text" class="sched-input" data-sched-field="label" value="' + escapeHtml(entry.label) + '">',
        '          </label>',
        '          <div class="sched-field sched-field-full">',
        '            <span class="sched-label-text">Color</span>',
        '            <div class="sched-color-picker">',
        '              <button type="button" class="banner-color-btn' + (color === 'red' ? ' is-active' : '') + '" data-sched-color="red"><span class="banner-color-swatch" style="background:#ff3b30;"></span>Red</button>',
        '              <button type="button" class="banner-color-btn' + (color === 'orange' ? ' is-active' : '') + '" data-sched-color="orange"><span class="banner-color-swatch" style="background:#ff9500;"></span>Orange</button>',
        '              <button type="button" class="banner-color-btn' + (color === 'yellow' ? ' is-active' : '') + '" data-sched-color="yellow"><span class="banner-color-swatch" style="background:#ffcc00;"></span>Yellow</button>',
        '              <button type="button" class="banner-color-btn' + (color === 'green' ? ' is-active' : '') + '" data-sched-color="green"><span class="banner-color-swatch" style="background:#34c759;"></span>Green</button>',
        '            </div>',
        '          </div>',
        '        </div>',
        '      </div>',

        '      <div class="sched-section">',
        '        <p class="sched-section-title">Schedule</p>',
        '        <div class="sched-mode-toggle">',
        '          <button type="button" class="sched-mode-btn' + (!isWeekly && !isBiweekly ? ' is-active' : '') + '" data-sched-mode="dates">Date Range</button>',
        '          <button type="button" class="sched-mode-btn' + (isWeekly ? ' is-active' : '') + '" data-sched-mode="weekly">Every Week</button>',
        '          <button type="button" class="sched-mode-btn' + (isBiweekly ? ' is-active' : '') + '" data-sched-mode="biweekly">Alternating Weeks</button>',
        '        </div>',
        '        <div class="sched-dates-row" ' + (isWeekly || isBiweekly ? 'style="display:none;"' : '') + '>',
        '          <div class="sched-grid">',
        '            <label class="sched-field">',
        '              <span class="sched-label-text">Start Date</span>',
        '              <input type="date" class="sched-input" data-sched-field="startDate" value="' + escapeHtml(entry.startDate) + '">',
        '            </label>',
        '            <label class="sched-field">',
        '              <span class="sched-label-text">End Date</span>',
        '              <input type="date" class="sched-input" data-sched-field="endDate" value="' + escapeHtml(entry.endDate) + '">',
        '            </label>',
        '          </div>',
        '        </div>',
        '        <div class="sched-weekly-row" ' + (!isWeekly && !isBiweekly ? 'style="display:none;"' : '') + '>',
        '          <span class="sched-label-text" style="margin-bottom:6px;display:block;">Active Days</span>',
        '          <div class="sched-day-picker">' + dayPickerHtml + '</div>',
        '        </div>',
        '        <div class="sched-biweekly-row" ' + (!isBiweekly ? 'style="display:none;"' : '') + '>',
        '          <div class="sched-grid" style="margin-top:10px;">',
        '            <div class="sched-field">',
        '              <span class="sched-label-text">Which week?</span>',
        '              <div class="sched-parity-toggle">',
        '                <button type="button" class="sched-parity-btn' + ((recurrence.weekParity || 0) === 0 ? ' is-active' : '') + '" data-sched-parity="0">Week A</button>',
        '                <button type="button" class="sched-parity-btn' + (recurrence.weekParity === 1 ? ' is-active' : '') + '" data-sched-parity="1">Week B</button>',
        '              </div>',
        '            </div>',
        '            <label class="sched-field">',
        '              <span class="sched-label-text">Anchor Monday <span class="sched-section-optional">defines week A/B</span></span>',
        '              <input type="date" class="sched-input" data-sched-field="anchorDate" value="' + escapeHtml(recurrence.anchorDate || '') + '">',
        '            </label>',
        '          </div>',
        '          <p class="sched-biweekly-hint">Pick any Monday as "Week A start." All entries that share the same anchor date will alternate together.</p>',
        '        </div>',
        '      </div>',

        '      <div class="sched-section">',
        '        <p class="sched-section-title">Content</p>',
        '        <div class="sched-grid">',
        '          <div class="sched-field sched-field-full">',
        '            <div class="sched-toggle-row">',
        '              <span class="sched-label-text">Show Alert Label (Pill)</span>',
        '              <label class="sched-switch">',
        '                <input type="checkbox" data-sched-field="showPill"' + (showPill ? ' checked' : '') + '>',
        '                <span class="sched-switch-track"></span>',
        '              </label>',
        '            </div>',
        '          </div>',
        '          <label class="sched-field' + (showPill ? '' : ' sched-field-hidden') + ' sched-pill-en-field">',
        '            <span class="sched-label-text">Alert Label <span class="sched-lang-badge">EN</span></span>',
        '            <input type="text" class="sched-input" data-sched-field="pillEn" data-sched-translate="pillEs" value="' + escapeHtml(getLocalizedBannerText(entry.banner.pill, 'en')) + '">',
        '          </label>',
        '          <label class="sched-field' + (showPill ? '' : ' sched-field-hidden') + ' sched-pill-es-field">',
        '            <span class="sched-label-text">Alert Label <span class="sched-lang-badge sched-lang-badge-es">ES</span> <span class="sched-auto-badge">Auto</span></span>',
        '            <input type="text" class="sched-input" data-sched-field="pillEs" value="' + escapeHtml(getLocalizedBannerText(entry.banner.pill, 'es')) + '">',
        '          </label>',
        '          <label class="sched-field sched-field-full">',
        '            <span class="sched-label-text">Message <span class="sched-lang-badge">EN</span></span>',
        '            <input type="text" class="sched-input" data-sched-field="messageEn" data-sched-translate="messageEs" value="' + escapeHtml(getLocalizedBannerText(entry.banner.message, 'en')) + '">',
        '          </label>',
        '          <label class="sched-field sched-field-full">',
        '            <span class="sched-label-text">Message <span class="sched-lang-badge sched-lang-badge-es">ES</span> <span class="sched-auto-badge">Auto</span></span>',
        '            <input type="text" class="sched-input" data-sched-field="messageEs" value="' + escapeHtml(getLocalizedBannerText(entry.banner.message, 'es')) + '">',
        '          </label>',
        '        </div>',
        '      </div>',

        '      <div class="sched-section">',
        '        <p class="sched-section-title">Button <span class="sched-section-optional">Optional</span></p>',
        '        <div class="sched-grid">',
        '          <label class="sched-field">',
        '            <span class="sched-label-text">Button Text</span>',
        '            <input type="text" class="sched-input" data-sched-field="ctaLabelEn" value="' + escapeHtml(getLocalizedBannerText(entry.banner.ctaLabel, 'en')) + '">',
        '          </label>',
        '          <label class="sched-field">',
        '            <span class="sched-label-text">Button Link</span>',
        '            <input type="text" class="sched-input" data-sched-field="ctaUrl" value="' + escapeHtml(entry.banner.ctaUrl || '') + '">',
        '          </label>',
        '        </div>',
        '      </div>',

        '      <div class="sched-save-row">',
        '        <button type="button" class="studio-btn studio-btn-publish sched-save-btn" data-sched-save="' + escapeHtml(entry.id) + '">Save Changes</button>',
        '      </div>',
        '    </div>',
        '  </details>',
        '</div>'
    ].join('\n');
}

function renderScheduledBanners() {
    if (!elements.scheduledBannerList) return;

    if (!scheduledBanners.length) {
        elements.scheduledBannerList.innerHTML = '';
        if (elements.scheduledBannerEmpty) elements.scheduledBannerEmpty.hidden = false;
        return;
    }

    if (elements.scheduledBannerEmpty) elements.scheduledBannerEmpty.hidden = true;
    elements.scheduledBannerList.innerHTML = scheduledBanners.map(renderScheduledBannerCard).join('');
}

function readScheduledBannerFromCard(card) {
    var id = card.dataset.schedId || '';
    var label = (card.querySelector('[data-sched-field="label"]') || {}).value || '';
    var startDate = (card.querySelector('[data-sched-field="startDate"]') || {}).value || '';
    var endDate = (card.querySelector('[data-sched-field="endDate"]') || {}).value || '';
    var pillEn = (card.querySelector('[data-sched-field="pillEn"]') || {}).value || '';
    var pillEs = (card.querySelector('[data-sched-field="pillEs"]') || {}).value || '';
    var messageEn = (card.querySelector('[data-sched-field="messageEn"]') || {}).value || '';
    var messageEs = (card.querySelector('[data-sched-field="messageEs"]') || {}).value || '';
    var ctaLabelEn = (card.querySelector('[data-sched-field="ctaLabelEn"]') || {}).value || '';
    var ctaUrl = (card.querySelector('[data-sched-field="ctaUrl"]') || {}).value || '';
    var activeColorBtn = card.querySelector('.sched-color-picker .banner-color-btn.is-active');
    var color = activeColorBtn ? activeColorBtn.dataset.schedColor : 'green';
    var showPillCheckbox = card.querySelector('[data-sched-field="showPill"]');
    var showPill = showPillCheckbox ? showPillCheckbox.checked : true;

    var activeModeBtn = card.querySelector('.sched-mode-btn.is-active');
    var mode = activeModeBtn ? activeModeBtn.dataset.schedMode : 'dates';
    var activeDayBtns = card.querySelectorAll('.sched-day-btn.is-active');
    var days = Array.from(activeDayBtns).map(function(btn) { return parseInt(btn.dataset.schedDay, 10); }).filter(function(d) { return !isNaN(d); });

    var recurrenceObj = { mode: mode, days: days };
    if (mode === 'biweekly') {
        var anchorInput = card.querySelector('[data-sched-field="anchorDate"]');
        recurrenceObj.anchorDate = anchorInput ? anchorInput.value : '';
        var activeParityBtn = card.querySelector('.sched-parity-btn.is-active');
        recurrenceObj.weekParity = activeParityBtn ? parseInt(activeParityBtn.dataset.schedParity, 10) : 0;
    }

    return {
        id: id,
        label: label,
        startDate: startDate,
        endDate: endDate,
        recurrence: recurrenceObj,
        banner: {
            enabled: true,
            color: color,
            showPill: showPill,
            showButton: !!(ctaLabelEn && ctaUrl),
            pill: { en: pillEn, es: pillEs },
            message: { en: messageEn, es: messageEs },
            ctaLabel: { en: ctaLabelEn, es: '' },
            ctaUrl: ctaUrl,
            ctaNewTab: false
        }
    };
}

function computeAnchorDate() {
    // Find the Monday of the current week as the default anchor
    var now = new Date();
    var day = now.getDay(); // 0=Sun
    var diff = (day === 0 ? -6 : 1 - day); // shift to Monday
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    return monday.getFullYear() + '-' +
        String(monday.getMonth() + 1).padStart(2, '0') + '-' +
        String(monday.getDate()).padStart(2, '0');
}

async function addScheduledBanner(templateId) {
    var currentUser = auth.currentUser;
    if (!currentUser) {
        setScheduleStatus('Sign in before adding a scheduled banner.', 'danger');
        return;
    }

    var now = new Date();
    var todayStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

    var template = templateId && SCHED_TEMPLATES[templateId];

    // Group templates create multiple entries at once (e.g. alternating weeks)
    if (template && template.isGroup && Array.isArray(template.entries)) {
        var anchor = computeAnchorDate();
        try {
            for (var g = 0; g < template.entries.length; g++) {
                var tpl = template.entries[g];
                var groupEntry = {
                    label: tpl.label,
                    startDate: todayStr,
                    endDate: todayStr,
                    recurrence: {
                        mode: tpl.recurrence.mode,
                        days: Array.isArray(tpl.recurrence.days) ? tpl.recurrence.days.slice() : [],
                        anchorDate: tpl.recurrence.anchorDate || anchor,
                        weekParity: tpl.recurrence.weekParity || 0
                    },
                    banner: JSON.parse(JSON.stringify(tpl.banner))
                };
                await saveScheduledBanner(groupEntry, currentUser);
            }
            setScheduleStatus('Alternating-week banners created (' + template.entries.length + ' entries). Edit each one below.', 'success');
        } catch (error) {
            setScheduleStatus(getFriendlyFirebaseError(error), 'danger');
        }
        return;
    }

    var newEntry;

    if (template) {
        newEntry = {
            label: template.label,
            startDate: todayStr,
            endDate: todayStr,
            recurrence: {
                mode: template.recurrence.mode,
                days: Array.isArray(template.recurrence.days) ? template.recurrence.days.slice() : []
            },
            banner: JSON.parse(JSON.stringify(template.banner))
        };
    } else {
        newEntry = {
            label: 'New Banner',
            startDate: todayStr,
            endDate: todayStr,
            recurrence: { mode: 'dates', days: [] },
            banner: {
                enabled: true,
                color: 'green',
                showPill: true,
                showButton: true,
                pill: { en: 'Notice', es: 'Aviso' },
                message: { en: 'Enter your message here.', es: 'Ingrese su mensaje aqu\u00ED.' },
                ctaLabel: { en: 'Call the Office', es: 'Llamar a la Oficina' },
                ctaUrl: 'tel:3012082273',
                ctaNewTab: false
            }
        };
    }

    try {
        await saveScheduledBanner(newEntry, currentUser);
        setScheduleStatus(template ? ('"' + template.label + '" template added. Customize below.') : 'New scheduled banner added. Edit the details below.', 'success');
    } catch (error) {
        setScheduleStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

async function handleScheduleSave(schedId) {
    var currentUser = auth.currentUser;
    if (!currentUser) {
        setScheduleStatus('Sign in before saving.', 'danger');
        return;
    }

    var card = elements.scheduledBannerList.querySelector('[data-sched-id="' + schedId + '"]');
    if (!card) return;

    var entry = readScheduledBannerFromCard(card);

    if (entry.recurrence && (entry.recurrence.mode === 'weekly' || entry.recurrence.mode === 'biweekly')) {
        if (!Array.isArray(entry.recurrence.days) || entry.recurrence.days.length === 0) {
            setScheduleStatus('Please select at least one day of the week.', 'danger');
            return;
        }
        if (entry.recurrence.mode === 'biweekly' && !entry.recurrence.anchorDate) {
            setScheduleStatus('Please set an anchor Monday so the system knows which week is A and which is B.', 'danger');
            return;
        }
    } else {
        if (!entry.startDate || !entry.endDate) {
            setScheduleStatus('Please set both a start date and end date.', 'danger');
            return;
        }

        if (entry.startDate > entry.endDate) {
            setScheduleStatus('Start date must be on or before the end date.', 'danger');
            return;
        }
    }

    var messageText = (entry.banner.message.en || '').trim();
    if (!messageText) {
        setScheduleStatus('Please add a banner message.', 'danger');
        return;
    }

    try {
        await saveScheduledBanner(entry, currentUser);
        setScheduleStatus('Scheduled banner saved.', 'success');
    } catch (error) {
        setScheduleStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

async function handleScheduleDelete(schedId) {
    if (!window.confirm('Delete this scheduled banner? This cannot be undone.')) return;

    try {
        await deleteScheduledBanner(schedId);
        setScheduleStatus('Scheduled banner deleted.', 'success');
    } catch (error) {
        setScheduleStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

async function reloadScheduledBanners() {
    try {
        setScheduleStatus('Reloading scheduled banners...', 'info');
        scheduledBanners = await fetchScheduledBanners();
        renderScheduledBanners();
        setScheduleStatus('Scheduled banners reloaded.', 'success');
    } catch (error) {
        setScheduleStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

function handleScheduleListClick(event) {
    var deleteBtn = event.target.closest('[data-sched-delete]');
    if (deleteBtn) {
        handleScheduleDelete(deleteBtn.dataset.schedDelete);
        return;
    }

    var saveBtn = event.target.closest('[data-sched-save]');
    if (saveBtn) {
        handleScheduleSave(saveBtn.dataset.schedSave);
        return;
    }

    var colorBtn = event.target.closest('[data-sched-color]');
    if (colorBtn) {
        var picker = colorBtn.closest('.sched-color-picker');
        if (picker) {
            picker.querySelectorAll('.banner-color-btn').forEach(function (btn) {
                btn.classList.remove('is-active');
            });
            colorBtn.classList.add('is-active');
        }
        return;
    }

    var modeBtn = event.target.closest('[data-sched-mode]');
    if (modeBtn) {
        var toggle = modeBtn.closest('.sched-mode-toggle');
        if (toggle) {
            toggle.querySelectorAll('.sched-mode-btn').forEach(function (btn) {
                btn.classList.remove('is-active');
            });
            modeBtn.classList.add('is-active');
        }
        var card = modeBtn.closest('.sched-card');
        if (card) {
            var selectedMode = modeBtn.dataset.schedMode;
            var datesRow = card.querySelector('.sched-dates-row');
            var weeklyRow = card.querySelector('.sched-weekly-row');
            var biweeklyRow = card.querySelector('.sched-biweekly-row');
            if (datesRow) datesRow.style.display = selectedMode === 'dates' ? '' : 'none';
            if (weeklyRow) weeklyRow.style.display = (selectedMode === 'weekly' || selectedMode === 'biweekly') ? '' : 'none';
            if (biweeklyRow) biweeklyRow.style.display = selectedMode === 'biweekly' ? '' : 'none';
        }
        return;
    }

    var parityBtn = event.target.closest('[data-sched-parity]');
    if (parityBtn) {
        var parityToggle = parityBtn.closest('.sched-parity-toggle');
        if (parityToggle) {
            parityToggle.querySelectorAll('.sched-parity-btn').forEach(function (btn) {
                btn.classList.remove('is-active');
            });
            parityBtn.classList.add('is-active');
        }
        return;
    }

    var dayBtn = event.target.closest('[data-sched-day]');
    if (dayBtn) {
        dayBtn.classList.toggle('is-active');
        return;
    }
}

function handleScheduleListChange(event) {
    var toggle = event.target.closest('[data-sched-field="showPill"]');
    if (toggle) {
        var card = toggle.closest('.sched-card');
        if (!card) return;
        var pillEnField = card.querySelector('.sched-pill-en-field');
        var pillEsField = card.querySelector('.sched-pill-es-field');
        if (pillEnField) pillEnField.classList.toggle('sched-field-hidden', !toggle.checked);
        if (pillEsField) pillEsField.classList.toggle('sched-field-hidden', !toggle.checked);
    }
}

var schedTranslateTimers = {};

function handleScheduleListInput(event) {
    var input = event.target;
    var targetField = input.dataset.schedTranslate;
    if (!targetField) return;

    var card = input.closest('.sched-card');
    if (!card) return;
    var schedId = card.dataset.schedId || '';
    var timerKey = schedId + ':' + targetField;

    if (schedTranslateTimers[timerKey]) {
        window.clearTimeout(schedTranslateTimers[timerKey]);
    }

    schedTranslateTimers[timerKey] = window.setTimeout(function () {
        delete schedTranslateTimers[timerKey];
        var enText = input.value.trim();
        var esInput = card.querySelector('[data-sched-field="' + targetField + '"]');
        if (!esInput || !enText) return;

        translateTextToSpanish(enText)
            .then(function (translated) {
                if (card.dataset.schedId === schedId) {
                    esInput.value = translated;
                }
            })
            .catch(function () {
                /* translation failed silently */
            });
    }, 600);
}

function handleSchedTemplateClick(event) {
    var btn = event.target.closest('[data-sched-template]');
    if (!btn) return;
    addScheduledBanner(btn.dataset.schedTemplate);
}

function disconnectScheduledListener() {
    if (typeof unsubscribeScheduled === 'function') {
        unsubscribeScheduled();
    }
    unsubscribeScheduled = null;
}

async function connectScheduledListener() {
    disconnectScheduledListener();
    setScheduleStatus('Loading scheduled banners...', 'info');

    try {
        scheduledBanners = await fetchScheduledBanners();
        renderScheduledBanners();
        setScheduleStatus('Scheduled banners loaded.', 'success');
    } catch (error) {
        setScheduleStatus(getFriendlyFirebaseError(error), 'danger');
    }

    unsubscribeScheduled = subscribeToScheduledBanners(
        function (liveBanners) {
            scheduledBanners = liveBanners;
            renderScheduledBanners();
        },
        function (error) {
            setScheduleStatus(getFriendlyFirebaseError(error), 'danger');
        }
    );
}

function handleBannerInput(event) {
    const target = event.target;

    if (!target || !target.id) {
        return;
    }

    const bannerFieldIds = new Set([
        'adminBannerEnabled',
        'adminBannerNewTab',
        'adminBannerShowPill',
        'adminBannerPillEn',
        'adminBannerPillEs',
        'adminBannerCtaLabelEn',
        'adminBannerCtaLabelEs',
        'adminBannerCtaUrl',
        'adminBannerAutoTranslateToggle'
    ]);

    if (!bannerFieldIds.has(target.id)) {
        return;
    }

    if (target.id === 'adminBannerAutoTranslateToggle') {
        if (!target.checked) {
            cancelPendingBannerTranslation();
        }
        setBannerStatus(target.checked
            ? 'Automatic Spanish fill is on for the banner.'
            : 'Automatic Spanish fill is off for the banner. Use the Translate button when needed.', 'info');
        return;
    }

    if (
        target.id === 'adminBannerPillEs'
        || target.id === 'adminBannerCtaLabelEs'
    ) {
        turnOffBannerAutoTranslate();
    }

    emergencyBanner = readBannerFromForm();
    renderBannerPreview();
    markBannerDirty('You have unpublished banner changes.');

    if (
        target.id === 'adminBannerPillEn'
        || target.id === 'adminBannerCtaLabelEn'
    ) {
        scheduleBannerAutoTranslate();
    }
}

function handleBannerClick(event) {
    const presetTrigger = event.target.closest('[data-banner-preset]');

    if (presetTrigger) {
        useBannerPreset(presetTrigger.dataset.bannerPreset);
    }
}

function disconnectSlidesListener() {
    if (typeof unsubscribeSlides === 'function') {
        unsubscribeSlides();
    }

    unsubscribeSlides = null;
}

function disconnectBannerListener() {
    if (typeof unsubscribeBanner === 'function') {
        unsubscribeBanner();
    }

    unsubscribeBanner = null;
}

async function connectSlidesListener() {
    disconnectSlidesListener();
    setStatus('Loading homepage slides...', 'info');

    try {
        const initialSlides = await fetchHomepageSlides();
        applyRemoteSlides(initialSlides, 'Homepage slides loaded.', true);
    } catch (error) {
        setStatus(getFriendlyFirebaseError(error), 'danger');
        slides = cloneSlides(store.getSlides());
        renderEditors();
    }

    unsubscribeSlides = subscribeToHomepageSlides(
        function (liveSlides) {
            applyRemoteSlides(liveSlides, 'Homepage slides updated.');
        },
        function (error) {
            setStatus(getFriendlyFirebaseError(error), 'danger');
        }
    );
}

async function connectBannerListener() {
    disconnectBannerListener();
    setBannerStatus('Loading urgent banner...', 'info');

    try {
        const initialBanner = await fetchEmergencyBanner();
        applyRemoteBanner(initialBanner, 'Urgent banner loaded.', true);
    } catch (error) {
        setBannerStatus(getFriendlyFirebaseError(error), 'danger');
        applyBannerToForm(createDefaultEmergencyBanner());
    }

    unsubscribeBanner = subscribeToEmergencyBanner(
        function (liveBanner) {
            applyRemoteBanner(liveBanner, 'Urgent banner updated.');
        },
        function (error) {
            setBannerStatus(getFriendlyFirebaseError(error), 'danger');
        }
    );
}

async function handlePasswordReset() {
    const email = elements.emailInput ? elements.emailInput.value.trim() : '';

    if (!email) {
        setLockMessage('Enter the admin email first, then request a reset link.', 'warning');
        if (elements.emailInput) {
            elements.emailInput.focus();
        }
        return;
    }

    try {
        await sendAdminPasswordReset(email);
        setLockMessage('Password reset email sent.', 'success');
    } catch (error) {
        setLockMessage(getFriendlyFirebaseError(error), 'danger');
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = elements.emailInput ? elements.emailInput.value.trim() : '';
    const password = elements.passwordInput ? elements.passwordInput.value : '';

    if (!email || !password) {
        setLockMessage('Enter the admin email and password.', 'warning');
        return;
    }

    setLockMessage('Signing in...', 'info');

    try {
        await signInAdmin(email, password);
        if (elements.passwordInput) {
            elements.passwordInput.value = '';
        }
        setLockMessage('Signed in.', 'success');
    } catch (error) {
        setLockMessage(getFriendlyFirebaseError(error), 'danger');
    }
}

async function handleLogout() {
    if (hasPendingChanges() && !window.confirm('You have unsaved website changes. Sign out anyway?')) {
        return;
    }

    try {
        await signOutAdmin();
    } catch (error) {
        setStatus(getFriendlyFirebaseError(error), 'danger');
    }
}

function safeListen(el, event, handler) {
    if (el) {
        el.addEventListener(event, handler);
    }
}

/* ── Weekend Hours Calendar (3-month, rolling) ── */

// Tracks each weekend date: 'open', 'closed', or undefined (unselected)
var weekendDateState = {};

// Current cursor mode: 'open' or 'closed'
var weekendCursorMode = 'open';

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
var DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function dateKey(year, month, day) {
    return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function parseDateKey(key) {
    var parts = key.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function isWeekendDay(dayOfWeek) {
    return dayOfWeek === 0 || dayOfWeek === 6;
}

function getWeekendCalendarMonths() {
    // Always show current month + next 2 months (rolling window)
    var now = new Date();
    var months = [];
    for (var m = 0; m < 3; m++) {
        var target = new Date(now.getFullYear(), now.getMonth() + m, 1);
        months.push({ year: target.getFullYear(), month: target.getMonth() });
    }
    return months;
}

function renderWeekendCalendar() {
    var container = document.getElementById('weekendCalendarGrid');
    if (!container) return;

    var now = new Date();
    var todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
    var months = getWeekendCalendarMonths();
    var html = '';

    for (var mi = 0; mi < months.length; mi++) {
        var year = months[mi].year;
        var month = months[mi].month;
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var firstDow = new Date(year, month, 1).getDay();

        html += '<div class="wkcal-month">';
        html += '<h3 class="wkcal-month-title">' + MONTH_NAMES[month] + ' ' + year + '</h3>';

        html += '<div class="wkcal-dow-row">';
        for (var d = 0; d < 7; d++) {
            html += '<span class="wkcal-dow">' + DOW_LABELS[d] + '</span>';
        }
        html += '</div>';

        html += '<div class="wkcal-days">';

        for (var e = 0; e < firstDow; e++) {
            html += '<span class="wkcal-day wkcal-empty"></span>';
        }

        for (var day = 1; day <= daysInMonth; day++) {
            var dow = new Date(year, month, day).getDay();
            var key = dateKey(year, month, day);
            var isToday = key === todayKey;
            var isWknd = isWeekendDay(dow);
            var state = weekendDateState[key]; // 'open', 'closed', or undefined

            var classes = 'wkcal-day';
            if (isWknd) {
                classes += ' wkcal-weekend';
                if (state === 'open') classes += ' wkcal-open';
                else if (state === 'closed') classes += ' wkcal-closed';
                // else: neutral — no open/closed class
            } else {
                classes += ' wkcal-weekday';
            }
            if (isToday) classes += ' wkcal-today';

            if (isWknd) {
                html += '<button type="button" class="' + classes + '" data-wkcal-date="' + key + '">' + day + '</button>';
            } else {
                html += '<span class="' + classes + '">' + day + '</span>';
            }
        }

        html += '</div></div>';
    }

    container.innerHTML = html;
    renderWeekendSummary();
}

function renderWeekendSummary() {
    var container = document.getElementById('weekendSummary');
    if (!container) return;

    var months = getWeekendCalendarMonths();
    var closedKeys = [];
    var openKeys = [];

    for (var mi = 0; mi < months.length; mi++) {
        var year = months[mi].year;
        var month = months[mi].month;
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        for (var day = 1; day <= daysInMonth; day++) {
            var dow = new Date(year, month, day).getDay();
            if (isWeekendDay(dow)) {
                var key = dateKey(year, month, day);
                var state = weekendDateState[key];
                if (state === 'closed') closedKeys.push(key);
                else if (state === 'open') openKeys.push(key);
            }
        }
    }

    if (closedKeys.length === 0 && openKeys.length === 0) {
        container.innerHTML = [
            '<div class="wkcal-summary">',
            '<p class="wkcal-summary-empty">No days selected yet. Pick a cursor above, then click weekend days on the calendar.</p>',
            '</div>'
        ].join('');
        return;
    }

    var dayAbbrs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function formatChip(key) {
        var d = parseDateKey(key);
        return dayAbbrs[d.getDay()] + ', ' + monthAbbrs[d.getMonth()] + ' ' + d.getDate();
    }

    var html = '<div class="wkcal-summary">';

    if (closedKeys.length > 0) {
        html += '<p class="wkcal-summary-title">Closed (' + closedKeys.length + ')</p>';
        html += '<div class="wkcal-summary-list" style="margin-bottom:' + (openKeys.length > 0 ? '12px' : '0') + ';">';
        html += closedKeys.map(function (key) {
            return '<span class="wkcal-summary-chip wkcal-chip-closed">' + formatChip(key) + '</span>';
        }).join('');
        html += '</div>';
    }

    if (openKeys.length > 0) {
        html += '<p class="wkcal-summary-title">Open (' + openKeys.length + ')</p>';
        html += '<div class="wkcal-summary-list">';
        html += openKeys.map(function (key) {
            return '<span class="wkcal-summary-chip wkcal-chip-open">' + formatChip(key) + '</span>';
        }).join('');
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

function handleWeekendDayClick(dateStr) {
    var currentState = weekendDateState[dateStr];

    // If clicking with the same cursor as current state, deselect (back to neutral)
    if (currentState === weekendCursorMode) {
        delete weekendDateState[dateStr];
    } else {
        weekendDateState[dateStr] = weekendCursorMode;
    }

    // Update just the clicked button
    var btn = document.querySelector('[data-wkcal-date="' + dateStr + '"]');
    if (btn) {
        var newState = weekendDateState[dateStr];
        btn.classList.remove('wkcal-open', 'wkcal-closed');
        if (newState === 'open') btn.classList.add('wkcal-open');
        else if (newState === 'closed') btn.classList.add('wkcal-closed');
    }

    renderWeekendSummary();
}

function setWeekendCursor(mode) {
    weekendCursorMode = mode;
    var buttons = document.querySelectorAll('.wkcal-cursor-btn');
    buttons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.dataset.wkcalCursor === mode);
    });
}

function getClosedMessage(dateStr) {
    // Saturday closed: check if Sunday (next day) is open → "open tomorrow"
    // Sunday closed: always "enjoy your weekend"
    var d = parseDateKey(dateStr);
    var dow = d.getDay();

    if (dow === 6) {
        // Saturday — check Sunday
        var sun = new Date(d);
        sun.setDate(sun.getDate() + 1);
        var sunKey = dateKey(sun.getFullYear(), sun.getMonth(), sun.getDate());
        if (weekendDateState[sunKey] === 'open') {
            return {
                en: 'We are closed today but will be open tomorrow.',
                es: 'Estamos cerrados hoy, pero abriremos ma\u00F1ana.'
            };
        }
    }

    // Sunday, or Saturday where Sunday is also closed/unset
    return {
        en: 'The clinic is closed today. Enjoy your weekend!',
        es: '\u00A1La cl\u00EDnica est\u00E1 cerrada hoy. Disfrute su fin de semana!'
    };
}

function isWeekendBannerLabel(label) {
    // Match labels created by the weekend calendar: "Saturday Open – 2026-04-18", "Sunday Closed – 2026-05-03", etc.
    return /^(Saturday|Sunday)\s+(Open|Closed)\s+\u2013\s+\d{4}-\d{2}-\d{2}$/.test(label);
}

async function applyWeekendSchedule() {
    var currentUser = auth.currentUser;
    var statusEl = document.getElementById('weekendStatus');

    if (!currentUser) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff3b30;">Sign in first.</span>';
        return;
    }

    // Collect only explicitly selected weekend dates
    var months = getWeekendCalendarMonths();
    var allSelectedDates = {};
    var closedDates = [];
    var openDates = [];

    for (var mi = 0; mi < months.length; mi++) {
        var year = months[mi].year;
        var month = months[mi].month;
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        for (var day = 1; day <= daysInMonth; day++) {
            var dow = new Date(year, month, day).getDay();
            if (isWeekendDay(dow)) {
                var key = dateKey(year, month, day);
                var state = weekendDateState[key];
                if (state === 'closed') {
                    closedDates.push({ date: key, dow: dow });
                    allSelectedDates[key] = true;
                } else if (state === 'open') {
                    openDates.push({ date: key, dow: dow });
                    allSelectedDates[key] = true;
                }
            }
        }
    }

    if (closedDates.length === 0 && openDates.length === 0) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff3b30;">Select some weekend days first.</span>';
        return;
    }

    if (statusEl) statusEl.innerHTML = '<span style="color:#86868b;">Removing old weekend banners...</span>';

    try {
        // Step 1: Delete any existing weekend-calendar banners for dates we're about to create
        var toDelete = scheduledBanners.filter(function (entry) {
            return isWeekendBannerLabel(entry.label) && allSelectedDates[entry.startDate];
        });

        for (var d = 0; d < toDelete.length; d++) {
            await deleteScheduledBanner(toDelete[d].id);
        }

        if (statusEl) statusEl.innerHTML = '<span style="color:#86868b;">Creating ' + (closedDates.length + openDates.length) + ' banners...</span>';

        // Step 2: Create fresh banners
        var count = 0;

        for (var i = 0; i < closedDates.length; i++) {
            var cd = closedDates[i];
            var dayLabel = cd.dow === 0 ? 'Sunday' : 'Saturday';
            var closedMsg = getClosedMessage(cd.date);

            await saveScheduledBanner({
                label: dayLabel + ' Closed \u2013 ' + cd.date,
                startDate: cd.date,
                endDate: cd.date,
                recurrence: { mode: 'dates', days: [] },
                banner: {
                    enabled: true, color: 'red', showPill: true, showButton: false,
                    pill: { en: 'Closed Today', es: 'Cerrado Hoy' },
                    message: closedMsg,
                    ctaLabel: { en: '', es: '' },
                    ctaUrl: '', ctaNewTab: false
                }
            }, currentUser);
            count++;
        }

        for (var j = 0; j < openDates.length; j++) {
            var od = openDates[j];
            var odLabel = od.dow === 0 ? 'Sunday' : 'Saturday';
            await saveScheduledBanner({
                label: odLabel + ' Open \u2013 ' + od.date,
                startDate: od.date,
                endDate: od.date,
                recurrence: { mode: 'dates', days: [] },
                banner: {
                    enabled: true, color: 'green', showPill: true, showButton: true,
                    pill: { en: 'Weekend Hours', es: 'Horario de Fin de Semana' },
                    message: { en: 'The clinic is open today from 8:00 AM \u2013 1:00 PM.', es: 'La cl\u00EDnica est\u00E1 abierta hoy de 8:00 AM a 1:00 PM.' },
                    ctaLabel: { en: 'Call the Office', es: 'Llamar a la Oficina' },
                    ctaUrl: 'tel:3012082273', ctaNewTab: false
                }
            }, currentUser);
            count++;
        }

        var deletedNote = toDelete.length > 0 ? ' (' + toDelete.length + ' old replaced)' : '';
        if (statusEl) statusEl.innerHTML = '<span style="color:#34c759;">Done! ' + count + ' weekend banners created.' + deletedNote + '</span>';
        setTimeout(function () {
            if (statusEl) statusEl.innerHTML = '';
        }, 5000);
    } catch (error) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff3b30;">' + escapeHtml(getFriendlyFirebaseError(error)) + '</span>';
    }
}

function initWeekendCalendar() {
    var grid = document.getElementById('weekendCalendarGrid');
    if (!grid) return;

    // Click handler for calendar day buttons
    grid.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-wkcal-date]');
        if (!btn) return;
        handleWeekendDayClick(btn.dataset.wkcalDate);
    });

    // Cursor mode toggle
    var cursorBar = document.querySelector('.wkcal-cursor-bar');
    if (cursorBar) {
        cursorBar.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-wkcal-cursor]');
            if (!btn) return;
            setWeekendCursor(btn.dataset.wkcalCursor);
        });
    }

    var applyBtn = document.getElementById('weekendApplyButton');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyWeekendSchedule);
    }

    renderWeekendCalendar();
}

function initEvents() {
    safeListen(elements.lockForm, 'submit', handleLogin);
    safeListen(elements.resetPasswordButton, 'click', handlePasswordReset);
    safeListen(elements.editorList, 'input', handleEditorInput);
    safeListen(elements.editorList, 'change', handleEditorInput);
    safeListen(elements.editorList, 'click', handleEditorClick);
    document.addEventListener('input', handleBannerInput);
    document.addEventListener('change', handleBannerInput);
    safeListen(elements.templateGrid, 'click', handleEditorClick);
    safeListen(elements.bannerPresetGrid, 'click', handleBannerClick);
    if (elements.bannerColorPicker) {
        elements.bannerColorPicker.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-banner-color]');
            if (!btn) {
                return;
            }
            setSelectedBannerColor(btn.dataset.bannerColor);
            emergencyBanner = readBannerFromForm();
            renderBannerPreview();
            markBannerDirty('Banner color updated. Publish when ready.');
        });
    }
    elements.tabButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            setActiveAdminTab(button.dataset.adminTab);
        });
    });
    safeListen(elements.saveButton, 'click', saveSlides);
    safeListen(elements.addButton, 'click', function () {
        addSlide(store.createSlideTemplate(), 'Blank slide added. Publish when ready.');
    });
    safeListen(elements.reloadButton, 'click', reloadFromFirebase);
    safeListen(elements.resetButton, 'click', resetSlidesToDefault);
    safeListen(elements.exportButton, 'click', exportSlides);
    safeListen(elements.importInput, 'change', importSlides);
    safeListen(elements.logoutButton, 'click', handleLogout);
    if (elements.bannerSaveButton) {
        elements.bannerSaveButton.addEventListener('click', saveBanner);
    }
    if (elements.bannerReloadButton) {
        elements.bannerReloadButton.addEventListener('click', reloadBannerFromFirebase);
    }
    if (elements.bannerResetButton) {
        elements.bannerResetButton.addEventListener('click', resetBanner);
    }
    if (elements.bannerTranslateButton) {
        elements.bannerTranslateButton.addEventListener('click', function () {
            translateBannerToSpanish();
        });
    }
    if (elements.bannerCopyButton) {
        elements.bannerCopyButton.addEventListener('click', copyBannerEnglishToSpanish);
    }

    /* Scheduled banner events */
    safeListen(elements.scheduleAddButton, 'click', function () { addScheduledBanner(); });
    safeListen(elements.scheduleReloadButton, 'click', reloadScheduledBanners);
    safeListen(elements.scheduledBannerList, 'click', handleScheduleListClick);
    safeListen(elements.scheduledBannerList, 'change', handleScheduleListChange);
    safeListen(elements.scheduledBannerList, 'input', handleScheduleListInput);

    /* Scheduled banner template bar */
    var schedTemplateBar = document.getElementById('schedTemplateBar');
    if (schedTemplateBar) {
        schedTemplateBar.addEventListener('click', handleSchedTemplateClick);
    }

    /* Rich text toolbar buttons */
    document.querySelectorAll('.studio-richtext-toolbar').forEach(function (toolbar) {
        toolbar.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-rt-cmd]');
            if (!btn || btn.tagName === 'INPUT') return;
            event.preventDefault();
            var cmd = btn.dataset.rtCmd;
            document.execCommand(cmd, false, null);
            updateRichToolbarState(toolbar);
            emergencyBanner = readBannerFromForm();
            renderBannerPreview();
            markBannerDirty('You have unpublished banner changes.');
        });
    });

    /* Rich text color pickers */
    document.querySelectorAll('.studio-rt-color input[type="color"]').forEach(function (picker) {
        picker.addEventListener('input', function () {
            document.execCommand('foreColor', false, picker.value);
            var icon = picker.parentElement.querySelector('.studio-rt-color-icon');
            if (icon) icon.style.borderBottomColor = picker.value;
            emergencyBanner = readBannerFromForm();
            renderBannerPreview();
            markBannerDirty('You have unpublished banner changes.');
        });
    });

    /* Contenteditable input tracking */
    document.querySelectorAll('.studio-richtext').forEach(function (el) {
        el.addEventListener('input', function () {
            emergencyBanner = readBannerFromForm();
            renderBannerPreview();
            markBannerDirty('You have unpublished banner changes.');
            if (el.id === 'adminBannerMessageEn') {
                scheduleBannerAutoTranslate();
            }
            if (el.id === 'adminBannerMessageEs') {
                turnOffBannerAutoTranslate();
            }
        });
        el.addEventListener('keyup', function () {
            var toolbar = el.previousElementSibling;
            if (toolbar && toolbar.classList.contains('studio-richtext-toolbar')) {
                updateRichToolbarState(toolbar);
            }
        });
        el.addEventListener('mouseup', function () {
            var toolbar = el.previousElementSibling;
            if (toolbar && toolbar.classList.contains('studio-richtext-toolbar')) {
                updateRichToolbarState(toolbar);
            }
        });
    });

    /* Show Pill toggle */
    safeListen(elements.bannerShowPill, 'change', function () {
        emergencyBanner = readBannerFromForm();
        renderBannerPreview();
        markBannerDirty('You have unpublished banner changes.');
    });

    /* Show Button toggle */
    safeListen(elements.bannerShowButton, 'change', function () {
        emergencyBanner = readBannerFromForm();
        renderBannerPreview();
        markBannerDirty('You have unpublished banner changes.');
    });

    if (elements.translateAllButton) {
        elements.translateAllButton.addEventListener('click', translateAllSlides);
    }

    if (elements.autoTranslateToggle) {
        elements.autoTranslateToggle.addEventListener('change', function () {
            if (!this.checked) {
                cancelAllPendingTranslations();
            }
            setStatus(this.checked
                ? 'Automatic Spanish fill is on. Type English and the Spanish side will update.'
                : 'Automatic Spanish fill is off. Use the Translate buttons when needed.', 'info');
        });
    }

    window.addEventListener('beforeunload', function (event) {
        if (!hasPendingChanges()) {
            return;
        }

        event.preventDefault();
        event.returnValue = '';
    });
}

function initAuthObserver() {
    observeAuthState(async function (user) {
        setAuthenticated(!!user);
        setUserEmail(user);

        if (!user) {
            disconnectSlidesListener();
            disconnectBannerListener();
            disconnectScheduledListener();
            clearEditorState();
            clearBannerEditorState();
            setStatus('Sign in to edit the homepage slides.', 'info');
            setBannerStatus('Sign in to edit the urgent banner.', 'info');
            setScheduleStatus('Sign in to manage scheduled banners.', 'info');
            setLockMessage('Sign in with the office admin email and password.', 'info');
            if (elements.emailInput) {
                elements.emailInput.focus();
            }
            return;
        }

        setLockMessage('Signed in as ' + (user.email || 'admin user') + '.', 'success');
        await Promise.all([
            connectSlidesListener(),
            connectBannerListener(),
            connectScheduledListener()
        ]);
    });
}

function init() {
    if (!elements.lockForm || !elements.editorList) {
        return;
    }

    renderTemplateGrid();
    buildBannerPresetGrid();
    applyBannerToForm(createDefaultEmergencyBanner());
    setActiveAdminTab(activeAdminTab);
    initEvents();
    initWeekendCalendar();
    initAuthObserver();
}

init();
