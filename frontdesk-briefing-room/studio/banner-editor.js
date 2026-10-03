/*
 * MMC Studio — banner content editor + website preview.
 * Used by the Site Banner page and the scheduled-banner drawer.
 */
import {
    esc, qs, qsa, icon, clone, debounce, translate, stripHtml, sanitizeRichText,
    linkPickerHtml, readLinkPicker, TONES, toast
} from './core.js';
import { BANNER_TEMPLATES } from './templates.js';

/* ── Preview: a slice of the real website header ── */

export function bannerPreviewHtml(banner, { device = 'desktop', locale = 'en', hidden = false } = {}) {
    const b = banner || {};
    const pick = (copy) => (copy && (copy[locale] || copy[locale === 'en' ? 'es' : 'en'])) || '';
    const message = sanitizeRichText(pick(b.message));
    const pill = b.showPill !== false ? pick(b.pill) : '';
    const cta = b.showButton !== false && b.ctaUrl ? pick(b.ctaLabel) : '';
    const hasMessage = !!stripHtml(message);
    const strip = hasMessage
        ? `<div class="site-emergency-banner" data-color="${esc(b.color || 'red')}">
               <div class="site-emergency-banner-inner">
                   <div class="site-emergency-banner-copy">
                       ${pill ? `<span class="site-emergency-banner-pill">${esc(pill)}</span>` : ''}
                       <span class="site-emergency-banner-message">${message}</span>
                   </div>
                   ${cta ? `<a class="site-emergency-banner-link" tabindex="-1">${esc(cta)}</a>` : ''}
               </div>
           </div>`
        : `<div class="st-preview-empty">${icon('type')}<span>Write a message to see the banner</span></div>`;
    const topbar = device === 'phone'
        ? `<div class="st-mock-topbar st-mock-topbar--phone"><span>${icon('clock')} Office hours</span><span class="st-mock-icons">${icon('phone')}${icon('message-square')}<i>Español</i></span></div>`
        : `<div class="st-mock-topbar"><span>${icon('clock')} Mon–Thu 8am–7pm · Fri 8am–6pm · Open this Sat</span><span class="st-mock-icons">${icon('phone')}${icon('message-square')}<i>Español</i></span></div>`;
    const header = device === 'phone'
        ? `<div class="st-mock-header"><img src="/images/brand/mmc-logo-400.webp" alt=""><span class="st-mock-burger"></span></div>`
        : `<div class="st-mock-header"><img src="/images/brand/mmc-logo-400.webp" alt=""><nav><b>Home</b><span>Services</span><span>About</span><span>Contact</span></nav><span class="st-mock-cta">Book</span></div>`;
    return `<div class="st-site-preview st-site-preview--${device} ${hidden ? 'is-hidden-live' : ''}">
                <div class="st-mock-browser"><span></span><span></span><span></span><em>mmccare.com</em></div>
                <div class="st-mock-page">
                    ${strip}${topbar}${header}
                    <div class="st-mock-hero"><div></div><div></div><div></div></div>
                </div>
            </div>`;
}

/* ── Rich text (bold / italic / underline) ── */

function richToolbar() {
    return `<div class="st-rt-toolbar" role="toolbar" aria-label="Text formatting">
                <button type="button" class="st-rt-btn" data-cmd="bold" title="Bold (⌘B)">${icon('bold')}</button>
                <button type="button" class="st-rt-btn" data-cmd="italic" title="Italic (⌘I)">${icon('italic')}</button>
                <button type="button" class="st-rt-btn" data-cmd="underline" title="Underline (⌘U)">${icon('underline')}</button>
            </div>`;
}

/* ── Editor ── */

/**
 * createBannerEditor(root, { value, onChange, templates: bool })
 * value: normalized banner object. Returns { get(), set(value), destroy() }.
 * `enabled` is not edited here — the host page owns it.
 */
export function createBannerEditor(root, { value, onChange, showTemplates = true, autoTranslate = true } = {}) {
    let banner = clone(value);
    let lang = 'en';
    let auto = autoTranslate;
    let translateRun = 0;

    root.innerHTML = `
        ${showTemplates ? `
        <section class="st-section">
            <div class="st-section-head">
                <h3>Start from a template</h3>
                <p>Pick one and adjust the wording — Spanish is filled in for you.</p>
            </div>
            <div class="st-chip-scroller" data-templates>
                ${BANNER_TEMPLATES.map((tpl) => `
                    <button type="button" class="st-template-chip" data-template="${esc(tpl.id)}">
                        <span class="st-template-chip-dot" data-tone="${esc(tpl.color)}">${icon(tpl.icon)}</span>${esc(tpl.name)}
                    </button>`).join('')}
            </div>
        </section>` : ''}

        <section class="st-section">
            <div class="st-section-head"><h3>Style</h3><p>Color tells visitors how important the message is.</p></div>
            <div class="st-tone-grid" role="radiogroup" aria-label="Banner color">
                ${TONES.map((tone) => `
                    <button type="button" role="radio" class="st-tone" data-tone-id="${tone.id}">
                        <span class="st-tone-swatch" style="background:${tone.swatch}"></span>
                        <span class="st-tone-text"><b>${esc(tone.label)}</b><small>${esc(tone.hint)}</small></span>
                    </button>`).join('')}
            </div>
        </section>

        <section class="st-section">
            <div class="st-section-head st-section-head--row">
                <div><h3>Message</h3><p>Keep it short — one or two sentences works best.</p></div>
                <div class="st-lang-tabs" role="tablist">
                    <button type="button" role="tab" data-lang="en">English</button>
                    <button type="button" role="tab" data-lang="es">Español <span class="st-lang-state" data-auto-state></span></button>
                </div>
            </div>

            <div class="st-autotranslate" data-auto-row>
                <label class="st-switch st-switch--sm">
                    <input type="checkbox" data-auto-toggle>
                    <span class="st-switch-track"></span>
                    <span>Translate to Spanish automatically</span>
                </label>
                <button type="button" class="st-link-btn" data-retranslate>${icon('languages')} Translate now</button>
            </div>

            <div class="st-field">
                <div class="st-field-row">
                    <label class="st-label" for="${root.id || 'be'}-pill">Label</label>
                    <label class="st-check"><input type="checkbox" data-show-pill> Show label</label>
                </div>
                <input id="${root.id || 'be'}-pill" class="st-input" data-field="pill" type="text" maxlength="40" placeholder="e.g. Weather Closure">
            </div>

            <div class="st-field">
                <label class="st-label">Message</label>
                <div class="st-rt">
                    ${richToolbar()}
                    <div class="st-rt-area" contenteditable="true" data-field="message" role="textbox" aria-multiline="true"
                         data-placeholder="e.g. Due to the snow, we will open at 10:00 AM today."></div>
                </div>
                <p class="st-hint" data-count></p>
            </div>

            <div class="st-field">
                <div class="st-field-row">
                    <label class="st-label">Button <span class="st-optional">optional</span></label>
                    <label class="st-check"><input type="checkbox" data-show-button> Show button</label>
                </div>
                <div class="st-grid-2" data-button-fields>
                    <input class="st-input" data-field="ctaLabel" type="text" maxlength="32" placeholder="Button text, e.g. Call the Office">
                    <div data-link-host></div>
                </div>
            </div>
        </section>`;

    const area = qs('[data-field="message"]', root);
    const pillInput = qs('[data-field="pill"]', root);
    const ctaInput = qs('[data-field="ctaLabel"]', root);
    const linkHost = qs('[data-link-host]', root);

    function emit() { if (onChange) onChange(clone(banner)); }

    function renderLink() {
        linkHost.innerHTML = linkPickerHtml('banner-cta', banner.ctaUrl);
    }

    function syncFields() {
        qsa('[data-lang]', root).forEach((tab) => {
            tab.classList.toggle('is-active', tab.dataset.lang === lang);
            tab.setAttribute('aria-selected', tab.dataset.lang === lang ? 'true' : 'false');
        });
        qsa('[data-tone-id]', root).forEach((btn) => {
            const on = btn.dataset.toneId === banner.color;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        pillInput.value = banner.pill[lang] || '';
        if (document.activeElement !== area) area.innerHTML = sanitizeRichText(banner.message[lang] || '');
        ctaInput.value = banner.ctaLabel[lang] || '';
        qs('[data-show-pill]', root).checked = banner.showPill !== false;
        qs('[data-show-button]', root).checked = banner.showButton !== false;
        pillInput.disabled = banner.showPill === false;
        qs('[data-button-fields]', root).classList.toggle('is-off', banner.showButton === false);
        qs('[data-auto-toggle]', root).checked = auto;
        qs('[data-auto-row]', root).hidden = lang !== 'es';
        qs('[data-auto-state]', root).textContent = auto ? 'auto' : '';
        const editable = !(lang === 'es' && auto);
        [pillInput, ctaInput].forEach((input) => { input.readOnly = !editable; });
        area.contentEditable = editable ? 'true' : 'false';
        root.classList.toggle('is-auto-es', lang === 'es' && auto);
        const words = stripHtml(banner.message[lang] || '').split(/\s+/).filter(Boolean).length;
        qs('[data-count]', root).textContent = words > 40 ? `${words} words — consider shortening so it fits on phones.` : '';
    }

    const scheduleTranslate = debounce(async () => {
        if (!auto) return;
        const run = ++translateRun;
        try {
            const [pill, message, cta] = await Promise.all([
                translate(banner.pill.en),
                translateRichText(banner.message.en),
                translate(banner.ctaLabel.en)
            ]);
            if (run !== translateRun || !auto) return;
            banner.pill.es = pill || banner.pill.es;
            banner.message.es = message;
            banner.ctaLabel.es = cta;
            syncFields();
            emit();
        } catch (error) {
            if (run === translateRun) toast('Spanish translation is unavailable right now — you can type it yourself.', 'info');
        }
    }, 650);

    function setField(field, valueText) {
        banner[field][lang] = valueText;
        if (lang === 'en') scheduleTranslate();
        emit();
        if (field === 'message') syncFields();
    }

    root.addEventListener('input', (event) => {
        const target = event.target;
        if (target === pillInput) setField('pill', pillInput.value);
        else if (target === ctaInput) setField('ctaLabel', ctaInput.value);
        else if (target === area) {
            banner.message[lang] = sanitizeRichText(area.innerHTML);
            if (lang === 'en') scheduleTranslate();
            emit();
        } else if (target.matches('[data-link-select], [data-link-custom]')) {
            const link = readLinkPicker(qs('[data-linkpicker]', root));
            banner.ctaUrl = link.url;
            banner.ctaNewTab = link.newTab;
            emit();
        }
    });
    root.addEventListener('change', (event) => {
        const target = event.target;
        if (target.matches('[data-link-select]')) {
            const link = readLinkPicker(qs('[data-linkpicker]', root));
            banner.ctaUrl = link.url;
            banner.ctaNewTab = link.newTab;
            if (target.value === '__custom') qs('[data-link-custom]', root).focus();
            emit();
        } else if (target.matches('[data-show-pill]')) {
            banner.showPill = target.checked; syncFields(); emit();
        } else if (target.matches('[data-show-button]')) {
            banner.showButton = target.checked; syncFields(); emit();
        } else if (target.matches('[data-auto-toggle]')) {
            auto = target.checked; syncFields();
            if (auto) scheduleTranslate();
        }
    });
    root.addEventListener('click', (event) => {
        const tone = event.target.closest('[data-tone-id]');
        const tab = event.target.closest('[data-lang]');
        const cmd = event.target.closest('[data-cmd]');
        const tpl = event.target.closest('[data-template]');
        if (tone) { banner.color = tone.dataset.toneId; syncFields(); emit(); }
        if (tab) { lang = tab.dataset.lang; syncFields(); }
        if (cmd) {
            event.preventDefault();
            if (area.contentEditable !== 'true') return;
            area.focus();
            document.execCommand(cmd.dataset.cmd, false, null);
            banner.message[lang] = sanitizeRichText(area.innerHTML);
            if (lang === 'en') scheduleTranslate();
            emit();
        }
        if (event.target.closest('[data-retranslate]')) {
            auto = true; syncFields(); scheduleTranslate();
            toast('Translating to Spanish…', 'info', { duration: 1600 });
        }
        if (tpl) applyTemplate(tpl.dataset.template);
    });
    // Editing Spanish by hand pauses auto-translate so it isn't overwritten.
    root.addEventListener('focusin', (event) => {
        if (lang === 'es' && auto && event.target.closest('[data-field]')) {
            toast('Spanish is translated automatically. Turn off "Translate automatically" to edit it yourself.', 'info', { duration: 4200 });
        }
    });
    // Paste as plain text so formatting from Word/email doesn't leak in.
    area.addEventListener('paste', (event) => {
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text.replace(/\s*\n\s*/g, ' '));
    });

    function applyTemplate(id) {
        const tpl = BANNER_TEMPLATES.find((item) => item.id === id);
        if (!tpl) return;
        const next = clone(tpl.banner);
        banner = Object.assign(banner, {
            color: tpl.color,
            showPill: true,
            showButton: next.showButton !== false && !!next.ctaUrl,
            pill: next.pill,
            message: next.message,
            ctaLabel: next.ctaLabel,
            ctaUrl: next.ctaUrl || '',
            ctaNewTab: !!next.ctaNewTab
        });
        auto = true;
        renderLink();
        syncFields();
        emit();
        toast(`“${tpl.name}” template applied — edit anything you like.`, 'success', { duration: 2600 });
    }

    renderLink();
    syncFields();

    return {
        get: () => clone(banner),
        set(next) { banner = clone(next); renderLink(); syncFields(); },
        destroy() { scheduleTranslate.cancel(); root.innerHTML = ''; }
    };
}

// Translate visible text but keep simple bold/italic/underline formatting.
async function translateRichText(html) {
    const clean = sanitizeRichText(html || '');
    if (!stripHtml(clean)) return '';
    if (!/<(b|strong|i|em|u)>/i.test(clean)) return translate(stripHtml(clean));
    const parts = clean.split(/(<\/?(?:b|strong|i|em|u)>)/i);
    const out = await Promise.all(parts.map(async (part) => {
        if (/^<\/?(?:b|strong|i|em|u)>$/i.test(part)) return part;
        const text = stripHtml(part);
        if (!text) return part;
        const lead = /^\s/.test(part) ? ' ' : '';
        const trail = /\s$/.test(part) ? ' ' : '';
        return lead + esc(await translate(text)) + trail;
    }));
    return sanitizeRichText(out.join(''));
}
