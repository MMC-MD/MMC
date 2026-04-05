import {
    auth,
    createDefaultEmergencyBanner,
    fetchEmergencyBanner,
    fetchHomepageSlides,
    getFriendlyFirebaseError,
    normalizeEmergencyBanner,
    observeAuthState,
    saveEmergencyBanner,
    saveHomepageSlides,
    sendAdminPasswordReset,
    signInAdmin,
    signOutAdmin,
    subscribeToEmergencyBanner,
    subscribeToHomepageSlides
} from './firebase-client.js';

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
                ctaUrl: 'pages/dermatology.html',
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
let expandedSlideId = null;
let activeAdminTab = 'banner';

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
    activeAdminTab = tabId === 'slides' ? 'slides' : 'banner';

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
    const messageText = getLocalizedBannerText(previewBanner.message, 'en');
    const linkText = getLocalizedBannerText(previewBanner.ctaLabel, 'en');
    const linkUrl = sanitizeBannerUrl(previewBanner.ctaUrl);

    if (!previewBanner.enabled || !messageText) {
        return [
            '<div class="admin-empty-state">',
            '<p>Turn the banner on and add a message to preview it here.</p>',
            '</div>'
        ].join('');
    }

    return [
        '<div class="site-emergency-banner">',
        '<div class="site-emergency-banner-inner">',
        '<div class="site-emergency-banner-copy">',
        pillText ? '<span class="site-emergency-banner-pill">' + escapeHtml(pillText) + '</span>' : '',
        '<span class="site-emergency-banner-message">',
        escapeHtml(messageText),
        '</span>',
        '</div>',
        linkText && linkUrl
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
        return [
            '<article class="admin-template-card" data-template-id="',
            escapeHtml(template.id),
            '" style="--template-accent: ',
            escapeHtml(template.accent),
            ';">',
            '<div class="admin-template-top">',
            '<span class="admin-template-tag">',
            escapeHtml(template.tag),
            '</span>',
            '<span class="admin-template-dot"></span>',
            '</div>',
            '<h3 class="admin-template-name">',
            escapeHtml(template.name),
            '</h3>',
            '<p class="admin-template-text">',
            escapeHtml(template.description),
            '</p>',
            '<button class="admin-btn admin-btn-primary admin-template-button" type="button" data-action="use-template" data-template-id="',
            escapeHtml(template.id),
            '">Use This Template</button>',
            '</article>'
        ].join('');
    }).join('');
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

function readBannerFromForm() {
    return normalizeEmergencyBanner({
        enabled: !!(elements.bannerEnabled && elements.bannerEnabled.checked),
        pill: {
            en: elements.bannerPillEn ? elements.bannerPillEn.value : '',
            es: elements.bannerPillEs ? elements.bannerPillEs.value : ''
        },
        message: {
            en: elements.bannerMessageEn ? elements.bannerMessageEn.value : '',
            es: elements.bannerMessageEs ? elements.bannerMessageEs.value : ''
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
    if (elements.bannerPillEn) {
        elements.bannerPillEn.value = nextBanner.pill.en;
    }
    if (elements.bannerPillEs) {
        elements.bannerPillEs.value = nextBanner.pill.es;
    }
    if (elements.bannerMessageEn) {
        elements.bannerMessageEn.value = nextBanner.message.en;
    }
    if (elements.bannerMessageEs) {
        elements.bannerMessageEs.value = nextBanner.message.es;
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
        translateTextToSpanish(translatedBanner.message.en),
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

function handleBannerInput(event) {
    const target = event.target;

    if (!target || !target.id) {
        return;
    }

    const bannerFieldIds = new Set([
        'adminBannerEnabled',
        'adminBannerNewTab',
        'adminBannerPillEn',
        'adminBannerPillEs',
        'adminBannerMessageEn',
        'adminBannerMessageEs',
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
        || target.id === 'adminBannerMessageEs'
        || target.id === 'adminBannerCtaLabelEs'
    ) {
        turnOffBannerAutoTranslate();
    }

    emergencyBanner = readBannerFromForm();
    renderBannerPreview();
    markBannerDirty('You have unpublished banner changes.');

    if (
        target.id === 'adminBannerPillEn'
        || target.id === 'adminBannerMessageEn'
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

function initEvents() {
    elements.lockForm.addEventListener('submit', handleLogin);
    elements.resetPasswordButton.addEventListener('click', handlePasswordReset);
    elements.editorList.addEventListener('input', handleEditorInput);
    elements.editorList.addEventListener('change', handleEditorInput);
    elements.editorList.addEventListener('click', handleEditorClick);
    document.addEventListener('input', handleBannerInput);
    document.addEventListener('change', handleBannerInput);
    if (elements.templateGrid) {
        elements.templateGrid.addEventListener('click', handleEditorClick);
    }
    if (elements.bannerPresetGrid) {
        elements.bannerPresetGrid.addEventListener('click', handleBannerClick);
    }
    elements.tabButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            setActiveAdminTab(button.dataset.adminTab);
        });
    });
    elements.saveButton.addEventListener('click', saveSlides);
    elements.addButton.addEventListener('click', function () {
        addSlide(store.createSlideTemplate(), 'Blank slide added. Publish when ready.');
    });
    elements.reloadButton.addEventListener('click', reloadFromFirebase);
    elements.resetButton.addEventListener('click', resetSlidesToDefault);
    elements.exportButton.addEventListener('click', exportSlides);
    elements.importInput.addEventListener('change', importSlides);
    elements.logoutButton.addEventListener('click', handleLogout);
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
            clearEditorState();
            clearBannerEditorState();
            setStatus('Sign in to edit the homepage slides.', 'info');
            setBannerStatus('Sign in to edit the urgent banner.', 'info');
            setLockMessage('Sign in with the office admin email and password.', 'info');
            if (elements.emailInput) {
                elements.emailInput.focus();
            }
            return;
        }

        setLockMessage('Signed in as ' + (user.email || 'admin user') + '.', 'success');
        await Promise.all([
            connectSlidesListener(),
            connectBannerListener()
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
    initAuthObserver();
}

init();
