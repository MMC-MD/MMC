/**
 * Montgomery Medical Clinic - Accessibility Widget
 * WCAG 2.1 Level AA Compliant
 * ADA Title III Compliant
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'mmc-a11y';
    var defaults = {
        fontSize: 100,
        highContrast: false,
        largeCursor: false,
        highlightLinks: false,
        dyslexiaFont: false,
        lineHeight: false,
        letterSpacing: false,
        pauseAnimations: false,
        focusIndicator: false,
        hideImages: false,
        monochrome: false,
        invert: false,
        readingGuide: false
    };

    function loadPrefs() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return null;
    }

    function savePrefs(p) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
    }

    var prefs = loadPrefs() || Object.assign({}, defaults);

    // ── Wrap page content so filters don't affect the widget ───
    // Move every direct child of <body> into a wrapper div,
    // then append the widget elements OUTSIDE the wrapper.
    var wrapper = document.createElement('div');
    wrapper.id = 'a11y-page-wrapper';
    // Move existing body children into wrapper
    while (document.body.firstChild) {
        wrapper.appendChild(document.body.firstChild);
    }
    document.body.appendChild(wrapper);

    // ── Build widget DOM (outside the wrapper) ────────────────

    // Skip-to-content link
    var skipLink = document.createElement('a');
    skipLink.className = 'a11y-skip-link';
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    document.body.appendChild(skipLink);

    // Reading guide bar
    var guideBar = document.createElement('div');
    guideBar.className = 'a11y-reading-guide-bar';
    guideBar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(guideBar);

    // Trigger button
    var trigger = document.createElement('button');
    trigger.className = 'a11y-trigger';
    trigger.setAttribute('aria-label', 'Open accessibility settings');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('title', 'Accessibility');
    trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="2.5"/><path d="M12 7v5m0 0l-4 7m4-7l4 7"/><path d="M5 10.5h14"/></svg>';
    document.body.appendChild(trigger);

    // Overlay
    var overlay = document.createElement('div');
    overlay.className = 'a11y-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    // Panel
    var panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Accessibility settings');

    var toggles = [
        { key: 'highContrast',    label: 'High Contrast',            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 010 20z" fill="currentColor"/></svg>' },
        { key: 'monochrome',      label: 'Monochrome',               icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="12" x2="21" y2="12"/></svg>' },
        { key: 'invert',          label: 'Invert Colors',            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 2a10 10 0 000 20" fill="currentColor"/></svg>' },
        { key: 'highlightLinks',  label: 'Highlight Links',          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>' },
        { key: 'dyslexiaFont',    label: 'Dyslexia-Friendly Font',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>' },
        { key: 'lineHeight',      label: 'Increase Line Height',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' },
        { key: 'letterSpacing',   label: 'Increase Letter Spacing',  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 20l5-16 5 16"/><path d="M9 14h6"/></svg>' },
        { key: 'largeCursor',     label: 'Large Cursor',             icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 10H11l-2 8z"/></svg>' },
        { key: 'focusIndicator',  label: 'Enhanced Focus',           icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="6" width="12" height="12" rx="1" stroke-dasharray="3 2"/></svg>' },
        { key: 'pauseAnimations', label: 'Pause Animations',         icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>' },
        { key: 'readingGuide',    label: 'Reading Guide',            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12" stroke-width="3"/><path d="M4 7h16M4 17h16" opacity="0.3"/></svg>' },
        { key: 'hideImages',      label: 'Hide Images',              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/><line x1="2" y1="2" x2="22" y2="22" stroke-width="2.5"/></svg>' }
    ];

    var html = '<div class="a11y-panel-header">' +
        '<h2><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="2.5"/><path d="M12 7v5m0 0l-4 7m4-7l4 7"/><path d="M5 10.5h14"/></svg> Accessibility</h2>' +
        '<button class="a11y-close" aria-label="Close accessibility settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="a11y-panel-body">';

    // Font size slider
    html += '<div class="a11y-section-label">Text Size</div>' +
        '<div class="a11y-slider-row">' +
        '<label for="a11y-font-slider"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg> Size</label>' +
        '<input type="range" id="a11y-font-slider" min="80" max="200" step="10" value="' + prefs.fontSize + '" aria-label="Font size percentage">' +
        '<span class="a11y-font-value" id="a11y-font-value">' + prefs.fontSize + '%</span></div>';

    // Visual toggles
    html += '<div class="a11y-section-label">Visual Adjustments</div>';
    for (var i = 0; i < toggles.length; i++) {
        var t = toggles[i];
        html += '<button class="a11y-option' + (prefs[t.key] ? ' a11y-active' : '') + '" data-key="' + t.key + '" aria-pressed="' + (prefs[t.key] ? 'true' : 'false') + '">' +
            '<span class="a11y-option-label">' + t.icon + ' ' + t.label + '</span>' +
            '<span class="a11y-option-status">' + (prefs[t.key] ? 'On' : 'Off') + '</span></button>';
    }

    html += '<button class="a11y-reset" aria-label="Reset all accessibility settings">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9"/><polyline points="3 3 3 9 9 9" fill="none"/></svg>' +
        ' Reset All Settings</button></div>' +
        '<div class="a11y-panel-footer"><a href="pages/terms-of-service.html" class="a11y-statement-link">Accessibility Statement</a></div>';

    panel.innerHTML = html;
    document.body.appendChild(panel);

    // Fix the accessibility statement link based on current page location
    var stmtLink = panel.querySelector('.a11y-statement-link');
    if (stmtLink) {
        var isSubpage = window.location.pathname.indexOf('/pages/') !== -1;
        stmtLink.href = isSubpage ? 'terms-of-service.html' : 'pages/terms-of-service.html';
    }

    // ── Dynamic style sheet for font scaling ──────────────────
    var fontScaleStyleEl = document.createElement('style');
    fontScaleStyleEl.id = 'a11y-font-scale';
    document.head.appendChild(fontScaleStyleEl);

    // ── Apply preferences ──────────────────────────────────

    function applyAll() {
        var root = document.documentElement;

        // Font size — use CSS zoom on the wrapper so it scales
        // all fixed-px sizes, and counter-zoom the widget
        if (prefs.fontSize !== 100) {
            var s = prefs.fontSize / 100;
            fontScaleStyleEl.textContent =
                '#a11y-page-wrapper { zoom: ' + s + '; }';
        } else {
            fontScaleStyleEl.textContent = '';
        }

        // Toggle classes on <html> — CSS targets #a11y-page-wrapper
        var classMap = {
            highContrast:    'a11y-high-contrast',
            largeCursor:     'a11y-large-cursor',
            highlightLinks:  'a11y-highlight-links',
            dyslexiaFont:    'a11y-dyslexia-font',
            lineHeight:      'a11y-line-height',
            letterSpacing:   'a11y-letter-spacing',
            pauseAnimations: 'a11y-pause-animations',
            focusIndicator:  'a11y-focus-indicator',
            hideImages:      'a11y-hide-images',
            monochrome:      'a11y-monochrome',
            invert:          'a11y-invert',
            readingGuide:    'a11y-reading-guide'
        };

        for (var key in classMap) {
            if (prefs[key]) {
                root.classList.add(classMap[key]);
            } else {
                root.classList.remove(classMap[key]);
            }
        }

        savePrefs(prefs);
    }

    // Apply on load
    applyAll();

    // ── Event Handlers ─────────────────────────────────────

    function openPanel() {
        panel.classList.add('a11y-open');
        overlay.classList.add('a11y-open');
        trigger.setAttribute('aria-expanded', 'true');
        setTimeout(function () {
            panel.querySelector('.a11y-close').focus();
        }, 50);
    }

    function closePanel() {
        panel.classList.remove('a11y-open');
        overlay.classList.remove('a11y-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
    }

    trigger.addEventListener('click', function () {
        if (panel.classList.contains('a11y-open')) {
            closePanel();
        } else {
            openPanel();
        }
    });

    overlay.addEventListener('click', closePanel);
    panel.querySelector('.a11y-close').addEventListener('click', closePanel);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panel.classList.contains('a11y-open')) {
            closePanel();
        }
    });

    // Toggle buttons
    var buttons = panel.querySelectorAll('.a11y-option');
    for (var b = 0; b < buttons.length; b++) {
        buttons[b].addEventListener('click', function () {
            var key = this.getAttribute('data-key');
            prefs[key] = !prefs[key];
            this.classList.toggle('a11y-active', prefs[key]);
            this.setAttribute('aria-pressed', prefs[key] ? 'true' : 'false');
            this.querySelector('.a11y-option-status').textContent = prefs[key] ? 'On' : 'Off';
            applyAll();
        });
    }

    // Font size slider
    var slider = panel.querySelector('#a11y-font-slider');
    var fontValueEl = panel.querySelector('#a11y-font-value');
    slider.addEventListener('input', function () {
        prefs.fontSize = parseInt(this.value, 10);
        fontValueEl.textContent = prefs.fontSize + '%';
        applyAll();
    });

    // Reset
    panel.querySelector('.a11y-reset').addEventListener('click', function () {
        prefs = Object.assign({}, defaults);
        applyAll();
        var allBtns = panel.querySelectorAll('.a11y-option');
        for (var r = 0; r < allBtns.length; r++) {
            allBtns[r].classList.remove('a11y-active');
            allBtns[r].setAttribute('aria-pressed', 'false');
            allBtns[r].querySelector('.a11y-option-status').textContent = 'Off';
        }
        slider.value = 100;
        fontValueEl.textContent = '100%';
    });

    // Reading guide follows mouse
    document.addEventListener('mousemove', function (e) {
        if (prefs.readingGuide) {
            guideBar.style.top = (e.clientY - 6) + 'px';
        }
    });

    // Trap focus inside panel when open
    panel.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var focusable = panel.querySelectorAll('button, input, a, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

})();
