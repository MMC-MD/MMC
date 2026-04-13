(function () {
    const CACHE_KEY = 'mmc-homepage-slides-cache-v1';
    const LEGACY_STORAGE_KEY = 'mmc-homepage-slides-v1';
    const DEFAULT_ACCENT = '#0d47a1';
    let remoteSlides = null;

    const defaultSlides = [
        {
            id: 'flu-shots',
            enabled: true,
            accent: '#e67e22',
            pill: { en: 'Available Today', es: 'Disponible Hoy' },
            title: { en: 'Seasonal Flu Shots Are Here', es: 'Las Vacunas contra la Gripe Están Aquí' },
            titleAccent: { en: 'Flu Shots', es: 'Vacunas contra la Gripe' },
            kicker: { en: 'Protect yourself this season', es: 'Protéjase esta temporada' },
            subtext: { en: '', es: '' },
            ctaLabel: { en: 'Walk-Ins Welcome', es: 'Sin Cita Previa' },
            ctaUrl: 'https://nextpatient.co/p/montgomerymedclinic/schedule',
            ctaNewTab: true,
            credentials: []
        },
        {
            id: 'physicals',
            enabled: true,
            accent: '#0d47a1',
            pill: { en: 'Specialized Services', es: 'Servicios Especializados' },
            title: { en: 'FAA & Immigration Physicals', es: 'Exámenes Físicos de FAA e Inmigración' },
            titleAccent: { en: 'Physicals', es: 'FAA e Inmigración' },
            kicker: { en: '', es: '' },
            subtext: { en: '', es: '' },
            ctaLabel: { en: '', es: '' },
            ctaUrl: '',
            ctaNewTab: false,
            credentials: [
                {
                    en: 'Authorized Aviation Medical Examiner',
                    es: 'Examinador Médico de Aviación Autorizado'
                },
                {
                    en: 'USCIS-Authorized Civil Surgeon',
                    es: 'Cirujano Civil Autorizado por USCIS'
                }
            ]
        },
        {
            id: 'urgent-care',
            enabled: true,
            accent: '#1976d2',
            pill: { en: 'Available Today', es: 'Disponible Hoy' },
            title: { en: 'Same Day Urgent Care', es: 'Atención Urgente el Mismo Día' },
            titleAccent: { en: 'Urgent Care', es: 'Atención Urgente' },
            kicker: { en: '', es: '' },
            subtext: {
                en: 'No appointment needed • Walk-in basis at our medical center',
                es: 'Sin cita previa • Atención sin reserva en nuestro centro médico'
            },
            ctaLabel: { en: 'Schedule Appointment', es: 'Programar Cita' },
            ctaUrl: 'https://nextpatient.co/p/montgomerymedclinic/schedule',
            ctaNewTab: true,
            credentials: []
        },
        {
            id: 'one-stop',
            enabled: true,
            accent: '#0d47a1',
            pill: { en: '', es: '' },
            title: {
                en: 'One Stop For All Your Medical Needs',
                es: 'Todo en Un Solo Lugar Para Sus Necesidades Medicas'
            },
            titleAccent: { en: 'One Stop', es: 'Todo en Un Solo Lugar' },
            kicker: { en: '', es: '' },
            subtext: {
                en: 'Comprehensive multi-specialty care with expert doctors under one roof.',
                es: 'Atención integral multiespecialidad con médicos expertos bajo un mismo techo.'
            },
            ctaLabel: { en: 'Explore Our Services', es: 'Explorar Nuestros Servicios' },
            ctaUrl: '#services',
            ctaNewTab: false,
            credentials: []
        }
    ];

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function makeSlideId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        return 'slide-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    function cleanText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function normalizeCopy(value) {
        const source = value && typeof value === 'object' ? value : {};

        return {
            en: cleanText(source.en),
            es: cleanText(source.es)
        };
    }

    function normalizeColor(value) {
        return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT;
    }

    function normalizeCredentials(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map(normalizeCopy)
            .filter(function (item) {
                return item.en || item.es;
            });
    }

    function normalizeSlide(slide) {
        const source = slide && typeof slide === 'object' ? slide : {};

        return {
            id: cleanText(source.id) || makeSlideId(),
            enabled: source.enabled !== false,
            accent: normalizeColor(source.accent),
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
            const testKey = '__mmc_slideshow_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    function parseSlides(rawValue) {
        if (!rawValue) {
            return null;
        }

        try {
            const parsed = JSON.parse(rawValue);

            if (Array.isArray(parsed)) {
                return parsed;
            }

            if (parsed && Array.isArray(parsed.slides)) {
                return parsed.slides;
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    function getCachedSlides() {
        if (!isStorageAvailable()) {
            return null;
        }

        const parsedSlides = parseSlides(window.localStorage.getItem(CACHE_KEY))
            || parseSlides(window.localStorage.getItem(LEGACY_STORAGE_KEY));

        if (!parsedSlides || !parsedSlides.length) {
            return null;
        }

        return parsedSlides.map(normalizeSlide);
    }

    function saveSlidesCache(slides) {
        if (!isStorageAvailable()) {
            return clone(slides);
        }

        const normalizedSlides = Array.isArray(slides) ? slides.map(normalizeSlide) : [];

        if (normalizedSlides.length) {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify(normalizedSlides));
        }

        try {
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (error) {
            return clone(normalizedSlides);
        }

        return clone(normalizedSlides);
    }

    function clearSlidesCache() {
        if (!isStorageAvailable()) {
            return;
        }

        window.localStorage.removeItem(CACHE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    function getSlides() {
        if (Array.isArray(remoteSlides) && remoteSlides.length) {
            return clone(remoteSlides);
        }

        const cachedSlides = getCachedSlides();

        if (cachedSlides && cachedSlides.length) {
            return cachedSlides;
        }

        return clone(defaultSlides);
    }

    function getSlidesForRender() {
        const slides = getSlides().filter(function (slide) {
            return slide.enabled && (slide.title.en || slide.title.es);
        });

        return slides.length ? slides : clone(defaultSlides);
    }

    function setRemoteSlides(slides) {
        const normalizedSlides = Array.isArray(slides) ? slides.map(normalizeSlide) : [];

        if (!normalizedSlides.length) {
            remoteSlides = clone(defaultSlides);
            saveSlidesCache(remoteSlides);
            return clone(remoteSlides);
        }

        remoteSlides = clone(normalizedSlides);
        saveSlidesCache(remoteSlides);
        return clone(remoteSlides);
    }

    function clearRemoteSlides() {
        remoteSlides = null;
        return clone(defaultSlides);
    }

    function createSlideTemplate() {
        return normalizeSlide({
            accent: DEFAULT_ACCENT,
            pill: { en: 'New Update', es: 'Nueva Actualización' },
            title: { en: 'Add your new slide title', es: 'Agregue el título de la diapositiva' },
            titleAccent: { en: 'new slide', es: 'diapositiva' },
            kicker: { en: '', es: '' },
            subtext: {
                en: 'Describe the update you want visitors to notice on the homepage.',
                es: 'Describa la actualización que quiere mostrar en la página principal.'
            },
            ctaLabel: { en: 'Learn More', es: 'Más Información' },
            ctaUrl: '#services',
            ctaNewTab: false,
            credentials: []
        });
    }

    window.MMCSlideshowStore = Object.freeze({
        CACHE_KEY: CACHE_KEY,
        LEGACY_STORAGE_KEY: LEGACY_STORAGE_KEY,
        defaultSlides: clone(defaultSlides),
        clearRemoteSlides: clearRemoteSlides,
        clearSlidesCache: clearSlidesCache,
        createSlideTemplate: createSlideTemplate,
        getCachedSlides: getCachedSlides,
        getSlides: getSlides,
        getSlidesForRender: getSlidesForRender,
        isStorageAvailable: isStorageAvailable,
        normalizeSlide: normalizeSlide,
        saveSlidesCache: saveSlidesCache,
        setRemoteSlides: setRemoteSlides
    });
})();
