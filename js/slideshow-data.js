/*
 * Homepage slideshow data store (shared by the homepage and MMC Studio).
 * Normalizes slide objects, caches the last published slides in localStorage,
 * and exposes window.MMCSlideshowStore.
 *
 * Slide fields: id, enabled, layout, image, accent, pill, title, titleAccent,
 * kicker, subtext, ctaLabel, ctaUrl, ctaNewTab, credentials[].
 * Bilingual fields are { en, es }.
 */
(function () {
    'use strict';

    var CACHE_KEY = 'mmc-homepage-slides-cache-v1';
    var LEGACY_STORAGE_KEY = 'mmc-homepage-slides-v1';
    var DEFAULT_ACCENT = '#0d47a1';
    var LAYOUTS = ['classic', 'spotlight', 'light', 'photo', 'feature', 'bold'];
    var remoteSlides = null;

    var DEFAULT_SLIDES = [
        {
            id: 'flu-shots', enabled: true, accent: '#e67e22',
            pill: { en: 'Available Today', es: 'Disponible Hoy' },
            title: { en: 'Seasonal Flu Shots Are Here', es: 'Las Vacunas contra la Gripe Están Aquí' },
            titleAccent: { en: 'Flu Shots', es: 'Vacunas contra la Gripe' },
            kicker: { en: 'Protect yourself this season', es: 'Protéjase esta temporada' },
            subtext: { en: '', es: '' },
            ctaLabel: { en: 'Walk-Ins Welcome', es: 'Sin Cita Previa' },
            ctaUrl: 'https://nextpatient.co/p/montgomerymedclinic/schedule', ctaNewTab: true,
            credentials: []
        },
        {
            id: 'physicals', enabled: true, accent: '#0d47a1',
            pill: { en: 'Specialized Services', es: 'Servicios Especializados' },
            title: { en: 'FAA & Immigration Physicals', es: 'Exámenes Físicos de FAA e Inmigración' },
            titleAccent: { en: 'Physicals', es: 'FAA e Inmigración' },
            kicker: { en: '', es: '' },
            subtext: { en: '', es: '' },
            ctaLabel: { en: '', es: '' },
            ctaUrl: '', ctaNewTab: false,
            credentials: [
                { en: 'Authorized Aviation Medical Examiner', es: 'Examinador Médico de Aviación Autorizado' },
                { en: 'USCIS-Authorized Civil Surgeon', es: 'Cirujano Civil Autorizado por USCIS' }
            ]
        },
        {
            id: 'urgent-care', enabled: true, accent: '#1976d2',
            pill: { en: 'Available Today', es: 'Disponible Hoy' },
            title: { en: 'Same Day Urgent Care', es: 'Atención Urgente el Mismo Día' },
            titleAccent: { en: 'Urgent Care', es: 'Atención Urgente' },
            kicker: { en: '', es: '' },
            subtext: { en: 'No appointment needed • Walk-in basis at our medical center', es: 'Sin cita previa • Atención sin reserva en nuestro centro médico' },
            ctaLabel: { en: 'Schedule Appointment', es: 'Programar Cita' },
            ctaUrl: 'https://nextpatient.co/p/montgomerymedclinic/schedule', ctaNewTab: true,
            credentials: []
        },
        {
            id: 'one-stop', enabled: true, accent: '#0d47a1',
            pill: { en: '', es: '' },
            title: { en: 'One Stop For All Your Medical Needs', es: 'Todo en Un Solo Lugar Para Sus Necesidades Medicas' },
            titleAccent: { en: 'One Stop', es: 'Todo en Un Solo Lugar' },
            kicker: { en: '', es: '' },
            subtext: { en: 'Comprehensive multi-specialty care with expert doctors under one roof.', es: 'Atención integral multiespecialidad con médicos expertos bajo un mismo techo.' },
            ctaLabel: { en: 'Explore Our Services', es: 'Explorar Nuestros Servicios' },
            ctaUrl: '#services', ctaNewTab: false,
            credentials: []
        }
    ];

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createId() {
        return window.crypto && typeof window.crypto.randomUUID === 'function'
            ? window.crypto.randomUUID()
            : 'slide-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    function cleanText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function normalizeCopy(value) {
        var source = value && typeof value === 'object' ? value : {};
        return { en: cleanText(source.en), es: cleanText(source.es) };
    }

    function normalizeAccent(value) {
        return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT;
    }

    function normalizeLayout(value) {
        return LAYOUTS.indexOf(value) >= 0 ? value : 'classic';
    }

    // Images are site-hosted (/images/...) or https URLs; anything else is dropped.
    function normalizeImage(value) {
        var text = cleanText(value);
        if (/^\/?images\/[a-z0-9/_\-.]+\.(webp|jpe?g|png|avif)$/i.test(text)) {
            return text.charAt(0) === '/' ? text : '/' + text;
        }
        return /^https:\/\/[^\s"'<>]+$/i.test(text) ? text : '';
    }

    function normalizeCredentials(value) {
        return Array.isArray(value)
            ? value.map(normalizeCopy).filter(function (item) { return item.en || item.es; })
            : [];
    }

    // Slides saved before photo layouts existed (no layout and no image) get a
    // matching library photo, so older content looks as polished as new slides.
    // Once edited and published in MMC Studio, the chosen layout/image is stored.
    var VISUALS = [
        [/flu|vaccin/i, 'spot-flu', 'spotlight'],
        [/faa|pilot|aviation/i, 'spot-aviation', 'spotlight', { en: 'Learn more', es: 'M\u00e1s informaci\u00f3n', url: '/occupational-health/' }],
        [/immigration|i-693|uscis/i, 'spot-aviation', 'spotlight'],
        [/urgent|walk-?in|same[ -]day/i, 'spot-exam-room', 'spotlight'],
        [/dermatolog|skin/i, 'dermatology', 'photo'],
        [/acupunct/i, 'acupuncture', 'photo'],
        [/weight/i, 'weight-management', 'photo'],
        [/nutrition|wellness/i, 'nutrition', 'photo'],
        [/occupational|employer|workplace/i, 'occupational', 'photo'],
        [/sports|physical therapy|rehab/i, 'physical-therapy', 'feature'],
        [/lab|blood/i, 'lab-tests', 'photo'],
        [/screening|blood pressure|heart/i, 'blood-pressure', 'photo'],
        [/one stop|primary|family|all your/i, 'clinic-lobby', 'spotlight']
    ];

    function inferVisual(source) {
        var text = [source.title, source.pill, source.subtext].map(function (c) {
            return c && typeof c === 'object' ? (c.en || '') + ' ' + (c.es || '') : '';
        }).join(' ');
        for (var i = 0; i < VISUALS.length; i++) {
            if (VISUALS[i][0].test(text)) return { image: '/images/slides/' + VISUALS[i][1] + '-1280.webp', layout: VISUALS[i][2], cta: VISUALS[i][3] || null };
        }
        return { image: '/images/slides/clinic-lobby-1280.webp', layout: 'spotlight' };
    }

    function normalizeSlide(value) {
        var source = value && typeof value === 'object' ? value : {};
        if (source.layout === undefined && !source.image) {
            var v = inferVisual(source);
            source = Object.assign({}, source, { image: v.image, layout: v.layout });
        }
        var image = normalizeImage(source.image);
        var layout = normalizeLayout(source.layout);
        // Image layouts need an image; fall back gracefully if it's missing.
        if (!image && (layout === 'photo' || layout === 'feature' || layout === 'light' || layout === 'spotlight')) {
            layout = 'classic';
        }
        return {
            id: cleanText(source.id) || createId(),
            enabled: source.enabled !== false,
            layout: layout,
            image: image,
            accent: normalizeAccent(source.accent),
            pill: normalizeCopy(source.pill),
            title: normalizeCopy(source.title),
            titleAccent: normalizeCopy(source.titleAccent),
            kicker: normalizeCopy(source.kicker),
            subtext: normalizeCopy(source.subtext),
            ctaLabel: normalizeCopy(source.ctaLabel),
            ctaUrl: cleanText(source.ctaUrl),
            ctaNewTab: !!source.ctaNewTab,
            credentials: normalizeCredentials(source.credentials)
        };
    }

    function isStorageAvailable() {
        try {
            var key = '__mmc_slideshow_test__';
            window.localStorage.setItem(key, '1');
            window.localStorage.removeItem(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    function parseStoredSlides(raw) {
        if (!raw) return null;
        try {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && Array.isArray(parsed.slides)) return parsed.slides;
        } catch (error) {
            return null;
        }
        return null;
    }

    function getCachedSlides() {
        if (!isStorageAvailable()) return null;
        var slides = parseStoredSlides(window.localStorage.getItem(CACHE_KEY))
            || parseStoredSlides(window.localStorage.getItem(LEGACY_STORAGE_KEY));
        return slides && slides.length ? slides.map(normalizeSlide) : null;
    }

    function saveSlidesCache(slides) {
        if (!isStorageAvailable()) return clone(slides);
        var normalized = Array.isArray(slides) ? slides.map(normalizeSlide) : [];
        if (normalized.length) {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
        }
        try {
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (error) {
            return clone(normalized);
        }
        return clone(normalized);
    }

    function clearSlidesCache() {
        if (!isStorageAvailable()) return;
        window.localStorage.removeItem(CACHE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    function getSlides() {
        if (Array.isArray(remoteSlides) && remoteSlides.length) return clone(remoteSlides);
        var cached = getCachedSlides();
        return cached && cached.length ? cached : clone(DEFAULT_SLIDES).map(normalizeSlide);
    }

    function getSlidesForRender() {
        var visible = getSlides().filter(function (slide) {
            return slide.enabled && (slide.title.en || slide.title.es);
        });
        return visible.length ? visible : clone(DEFAULT_SLIDES).map(normalizeSlide);
    }

    function setRemoteSlides(slides) {
        var normalized = Array.isArray(slides) ? slides.map(normalizeSlide) : [];
        remoteSlides = normalized.length ? clone(normalized) : clone(DEFAULT_SLIDES).map(normalizeSlide);
        saveSlidesCache(remoteSlides);
        return clone(remoteSlides);
    }

    function clearRemoteSlides() {
        remoteSlides = null;
        return clone(DEFAULT_SLIDES);
    }

    function createSlideTemplate() {
        return normalizeSlide({
            accent: DEFAULT_ACCENT,
            pill: { en: 'New Update', es: 'Nueva Actualización' },
            title: { en: 'Add your new slide title', es: 'Agregue el título de la diapositiva' },
            titleAccent: { en: 'new slide', es: 'diapositiva' },
            subtext: { en: 'Describe the update you want visitors to notice on the homepage.', es: 'Describa la actualización que quiere mostrar en la página principal.' },
            ctaLabel: { en: 'Learn More', es: 'Más Información' },
            ctaUrl: '#services'
        });
    }

    window.MMCSlideshowStore = Object.freeze({
        CACHE_KEY: CACHE_KEY,
        LEGACY_STORAGE_KEY: LEGACY_STORAGE_KEY,
        LAYOUTS: LAYOUTS.slice(),
        defaultSlides: clone(DEFAULT_SLIDES),
        clearRemoteSlides: clearRemoteSlides,
        clearSlidesCache: clearSlidesCache,
        createSlideTemplate: createSlideTemplate,
        getCachedSlides: getCachedSlides,
        getSlides: getSlides,
        getSlidesForRender: getSlidesForRender,
        isStorageAvailable: isStorageAvailable,
        normalizeSlide: normalizeSlide,
        suggestVisual: function (slide) { return inferVisual(slide && typeof slide === 'object' ? slide : {}); },
        saveSlidesCache: saveSlidesCache,
        setRemoteSlides: setRemoteSlides
    });
})();
