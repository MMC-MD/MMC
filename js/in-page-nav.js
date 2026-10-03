/*
 * In-page section bar.
 * Builds a slim bar of links to every [data-page-nav] section, placed right
 * after the page's title banner. It sticks below the site header while you
 * scroll, highlights the section in view, and scrolls sideways on phones.
 * Styles: css/in-page-nav.css.
 */
(function () {
    'use strict';

    // Spanish labels for section titles (the site's language toggle sets <html lang>).
    var ES = {
        'Overview': 'Resumen', 'Services': 'Servicios', 'FAQ': 'Preguntas', 'Providers': 'Proveedores',
        'Provider': 'Proveedora', 'Preparation': 'Preparación', 'Pilot Resources': 'Recursos para Pilotos',
        'Insurance': 'Seguros', 'Why Join': 'Por Qué Unirse', 'Weight Management': 'Control de Peso',
        'Updates': 'Novedades', 'Team': 'Equipo', 'Our Team': 'Nuestro Equipo', 'Renewal': 'Renovación',
        'Plans': 'Planes', 'Partnership': 'Alianzas', 'Openings': 'Vacantes', 'Mission': 'Misión',
        'MVA Physicals': 'Exámenes MVA', 'Integration': 'Integración', 'Immigration': 'Inmigración',
        'Facility': 'Instalaciones', 'FAA Physicals': 'Exámenes FAA', 'Divisions': 'Divisiones', 'Check Coverage': 'Verificar Cobertura', 'Accepted Plans': 'Planes Aceptados', 'Nutrition': 'Nutrición', 'Personal Training': 'Entrenamiento Personal',
        'Corporate': 'Corporativo', 'Contact': 'Contacto', 'Conditions': 'Condiciones',
        'Care Journey': 'Su Atención', 'About Us': 'Nosotros', 'What to Bring': 'Qué Traer',
        'Exam Process': 'Proceso del Examen', 'Vaccinations': 'Vacunas', 'After the Exam': 'Después del Examen',
        'Resources': 'Recursos', 'Programs': 'Programas', 'Pre-Employment': 'Pre-Empleo', 'Testing': 'Pruebas',
        'Drug Panels': 'Paneles de Drogas', 'Workers’ Comp': 'Compensación Laboral', 'Wellness': 'Bienestar',
        'Vaccines': 'Vacunas', 'Medical Classes': 'Clases Médicas', 'New vs. Returning': 'Nuevos vs. Recurrentes',
        'Checklist': 'Lista', 'Medications': 'Medicamentos', 'Official Resources': 'Recursos Oficiales'
    };

    function lang() {
        return document.documentElement.lang === 'es' ? 'es' : 'en';
    }

    function titleOf(section) {
        return section.getAttribute('data-page-nav-title')
            || section.getAttribute('aria-label')
            || (section.querySelector('h2, h3') ? section.querySelector('h2, h3').textContent.trim() : section.id);
    }

    function headerHeight() {
        var header = document.querySelector('.site-sticky-header');
        return header ? Math.round(header.getBoundingClientRect().height) : 0;
    }

    function init() {
        var sections = Array.prototype.slice.call(document.querySelectorAll('[data-page-nav][id]'))
            .filter(function (s) { return s.id !== 'footer-placeholder'; });
        if (sections.length < 2 || document.querySelector('.mmc-subnav')) return;

        var bar = document.createElement('nav');
        bar.className = 'mmc-subnav';
        bar.setAttribute('aria-label', 'On this page');
        var inner = document.createElement('div');
        inner.className = 'mmc-subnav-inner';
        var list = document.createElement('div');
        list.className = 'mmc-subnav-links';
        inner.appendChild(list);
        bar.appendChild(inner);

        var links = sections.map(function (section) {
            var en = titleOf(section);
            var a = document.createElement('a');
            a.href = '#' + section.id;
            a.className = 'mmc-subnav-link';
            a.setAttribute('data-en', en);
            a.setAttribute('data-es', ES[en] || en);
            a.textContent = lang() === 'es' ? (ES[en] || en) : en;
            list.appendChild(a);
            return a;
        });

        // Place the bar right after the title banner (or before the first section on the homepage).
        var anchor = document.querySelector('.page-header');
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(bar, anchor.nextSibling);
        } else {
            sections[0].parentNode.insertBefore(bar, sections[0]);
        }

        function offset() {
            return headerHeight() + bar.offsetHeight + 12;
        }

        function syncTop() {
            var h = headerHeight();
            bar.style.top = h + 'px';
            document.documentElement.style.setProperty('--mmc-subnav-offset', (h + bar.offsetHeight + 12) + 'px');
        }

        var activeId = null;
        function setActive(id) {
            if (id === activeId) return;
            activeId = id;
            links.forEach(function (a) {
                var on = a.getAttribute('href') === '#' + id;
                a.classList.toggle('is-active', on);
                if (on) {
                    a.setAttribute('aria-current', 'true');
                    // Keep the active link visible inside the horizontally scrolling bar.
                    var left = a.offsetLeft - 24;
                    var right = a.offsetLeft + a.offsetWidth + 24;
                    if (left < list.scrollLeft) list.scrollTo({ left: left, behavior: 'smooth' });
                    else if (right > list.scrollLeft + list.clientWidth) list.scrollTo({ left: right - list.clientWidth, behavior: 'smooth' });
                } else {
                    a.removeAttribute('aria-current');
                }
            });
        }

        var ticking = false;
        function update() {
            ticking = false;
            var line = offset() + window.innerHeight * 0.15;
            var current = null;
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].getBoundingClientRect().top <= line) current = sections[i].id;
            }
            // At the very bottom, the last section is the one being read.
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
                current = sections[sections.length - 1].id;
            }
            setActive(current);
            bar.classList.toggle('is-stuck', bar.getBoundingClientRect().top <= headerHeight() + 1);
        }
        function requestUpdate() {
            if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
        }

        links.forEach(function (a) {
            // Capture phase + stopImmediatePropagation: the site's generic smooth-scroll
            // handler (js/main.js) would otherwise scroll again with a different offset.
            a.addEventListener('click', function (event) {
                var target = document.getElementById(a.getAttribute('href').slice(1));
                if (!target) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                // Use the section's resting position (ignore an in-progress fade-in slide).
                var shift = 0;
                var m = /matrix.*\((.+)\)/.exec(getComputedStyle(target).transform || '');
                if (m) { var v = m[1].split(',').map(parseFloat); shift = v.length === 6 ? v[5] : (v[13] || 0); }
                var top = target.getBoundingClientRect().top - shift + window.scrollY - offset() + 1;
                var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
                setActive(target.id);
                if (history.replaceState) history.replaceState(null, '', '#' + target.id);
            }, true);
        });

        // Fade the edges when the links overflow (phones / long lists).
        function syncOverflow() {
            var max = list.scrollWidth - list.clientWidth;
            bar.classList.toggle('has-more-left', list.scrollLeft > 4);
            bar.classList.toggle('has-more-right', list.scrollLeft < max - 4);
        }
        list.addEventListener('scroll', syncOverflow, { passive: true });

        // Vertical wheel/trackpad scrolling over the bar scrolls the page,
        // never the bar sideways (only clearly horizontal swipes move the bar).
        list.addEventListener('wheel', function (event) {
            if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            event.preventDefault();
            var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
            window.scrollBy({ top: event.deltaY * unit, left: 0, behavior: 'instant' });
        }, { passive: false });

        // Re-label when the language toggle runs.
        new MutationObserver(function () {
            links.forEach(function (a) { a.textContent = a.getAttribute(lang() === 'es' ? 'data-es' : 'data-en'); });
            syncOverflow();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', function () { syncTop(); syncOverflow(); requestUpdate(); });
        document.addEventListener('mmc:sticky-header-metrics', function () { syncTop(); requestUpdate(); });
        document.addEventListener('mmc:header-ready', function () { syncTop(); requestUpdate(); });
        var header = document.querySelector('.site-sticky-header');
        // Defer to the next frame so measuring never re-triggers the observer in the same frame.
        function onResize() { window.requestAnimationFrame(function () { syncTop(); requestUpdate(); }); }
        if (window.ResizeObserver) {
            new ResizeObserver(onResize).observe(document.body);
            if (header) new ResizeObserver(onResize).observe(header);
        }

        syncTop();
        syncOverflow();
        update();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
