/*
 * MMC Studio — Homepage Slides editor.
 */
import {
    esc, qs, qsa, icon, clone, same, state, subscribe, toast, errorMessage, confirmDialog,
    openLayer, registerGuard, debounce, translate, linkPickerHtml, readLinkPicker, timeAgo
} from './core.js';
import {
    SLIDE_TEMPLATES, SLIDE_CATEGORIES, IMAGE_LIBRARY, LAYOUT_OPTIONS, ACCENTS, blankSlide
} from './templates.js';

const store = window.MMCSlideshowStore;
const renderer = window.MMCSlideshow;
const TEXT_FIELDS = ['pill', 'title', 'titleAccent', 'kicker', 'subtext', 'ctaLabel'];
const RECOMMENDED_MAX = 6;

function normalize(slide) { return store.normalizeSlide(clone(slide)); }

function slideName(slide) {
    return (slide.title && (slide.title.en || slide.title.es)) || 'Untitled slide';
}

/* ── Thumbnails: real slide markup, scaled down ── */

const thumbObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
        entry.target.style.setProperty('--thumb-scale', String(entry.contentRect.width / 1060));
    });
});

export function thumbHtml(slide, locale = 'en') {
    return `<div class="st-thumb" data-thumb>
                <div class="st-thumb-inner">
                    <div class="slide-container"><div class="slide-track slide-track--tall">
                        ${renderer.buildSlideMarkup(normalize(slide), true, { locale, disableLink: true })}
                    </div></div>
                </div>
            </div>`;
}

export function observeThumbs(root) {
    qsa('[data-thumb]', root).forEach((node) => {
        node.style.setProperty('--thumb-scale', String((node.clientWidth || 280) / 1060));
        thumbObserver.observe(node);
    });
}

/* ── Accurate preview in an iframe (so phone media queries apply) ── */

function createPreviewFrame(host) {
    const frame = document.createElement('iframe');
    frame.className = 'st-preview-frame';
    frame.title = 'Slide preview';
    frame.setAttribute('tabindex', '-1');
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/css/slides.css">
        <style>html,body{margin:0;background:#f5f5f7;font-family:Inter,system-ui,sans-serif}
        .slideshow-section{padding:24px}.slide-controls{pointer-events:none}a{pointer-events:none}</style>
        </head><body><section class="slideshow-section"><div class="slideshow-wrapper"><div class="slide-container">
        <div class="slide-track" id="t"></div>
        <div class="slide-controls"><span class="s-nav s-prev"></span><div class="s-dots" id="d"></div><span class="s-nav s-next"></span></div>
        </div></div></section></body></html>`;
    host.appendChild(frame);
    let pending = null;
    let ready = false;
    frame.addEventListener('load', () => { ready = true; if (pending) { update(pending); pending = null; } });
    function update(args) {
        if (!ready) { pending = args; return; }
        const doc = frame.contentDocument;
        const track = doc.getElementById('t');
        const dots = doc.getElementById('d');
        track.className = 'slide-track' + (args.slide.layout && args.slide.layout !== 'classic' ? ' slide-track--tall' : '');
        track.innerHTML = renderer.buildSlideMarkup(normalize(args.slide), true, { locale: args.locale, disableLink: true });
        dots.innerHTML = Array.from({ length: args.count }, (_, i) => `<span class="s-dot ${i === args.index ? 'active' : ''}"></span>`).join('');
        // Size the frame to the slide itself (scrollHeight never shrinks below the frame).
        const fit = () => {
            const section = doc.querySelector('.slideshow-section');
            if (section) frame.style.height = Math.ceil(section.getBoundingClientRect().height) + 'px';
        };
        requestAnimationFrame(fit);
        setTimeout(fit, 250);
    }
    return { frame, update };
}

/* ═══ Template gallery ═══ */

function openTemplateGallery({ onPick }) {
    let category = 'all';
    const layer = openLayer({
        title: 'Add a slide',
        subtitle: 'Pick a ready-made slide — English and Spanish are already written. You can change anything after.',
        kind: 'modal', size: 'xxl',
        body: `
            <div class="st-gallery-toolbar">
                <div class="st-seg" data-cats>
                    ${SLIDE_CATEGORIES.map((c) => `<button type="button" data-cat="${c.id}">${esc(c.label)}</button>`).join('')}
                </div>
                <button type="button" class="st-btn st-btn--ghost" data-blank>${icon('plus')} Start from blank</button>
            </div>
            <div class="st-gallery" data-grid></div>`
    });
    const grid = qs('[data-grid]', layer.root);
    function render() {
        qsa('[data-cat]', layer.root).forEach((b) => b.classList.toggle('is-active', b.dataset.cat === category));
        const items = SLIDE_TEMPLATES.filter((tpl) => category === 'all' || tpl.category === category);
        grid.innerHTML = items.map((tpl) => `
            <button type="button" class="st-gallery-card" data-tpl="${esc(tpl.id)}">
                ${thumbHtml(tpl.slide)}
                <span class="st-gallery-meta">
                    <b>${esc(tpl.name)}</b>
                    <small>${esc((LAYOUT_OPTIONS.find((l) => l.id === tpl.slide.layout) || {}).label || 'Classic')} layout</small>
                </span>
                <span class="st-gallery-use">${icon('plus')} Use</span>
            </button>`).join('');
        observeThumbs(grid);
    }
    layer.root.addEventListener('click', (event) => {
        const cat = event.target.closest('[data-cat]');
        const tpl = event.target.closest('[data-tpl]');
        if (cat) { category = cat.dataset.cat; render(); }
        if (tpl) {
            const found = SLIDE_TEMPLATES.find((t) => t.id === tpl.dataset.tpl);
            onPick(clone(found.slide), found.name);
            layer.close(true);
        }
        if (event.target.closest('[data-blank]')) { onPick(blankSlide(), 'Blank'); layer.close(true); }
    });
    render();
}

/* ═══ Page ═══ */

export function createSlidesPage({ api }) {
    let root = null;
    let draft = null;     // working array
    let saved = null;     // last published
    let selectedId = null;
    let lang = 'en';
    let previewLocale = 'en';
    let previewDevice = 'desktop';
    let autoTranslate = {}; // slideId -> bool
    let saving = false;
    let preview = null;
    let dragId = null;
    const cleanups = [];

    const isDirty = () => !!(draft && saved && !same(draft, saved));
    const selected = () => (draft || []).find((s) => s.id === selectedId) || null;
    const isAuto = (id) => autoTranslate[id] !== false;

    function changeCount() {
        if (!draft || !saved) return 0;
        const savedMap = new Map(saved.map((s, i) => [s.id, { s, i }]));
        let n = 0;
        draft.forEach((s, i) => {
            const prev = savedMap.get(s.id);
            if (!prev || !same(prev.s, s) || prev.i !== i) n += 1;
        });
        saved.forEach((s) => { if (!draft.find((d) => d.id === s.id)) n += 1; });
        return n;
    }

    function loadFromState(force) {
        if (!state.slides) return;
        const incoming = state.slides.map(normalize);
        if (!saved || force || !isDirty()) {
            saved = clone(incoming);
            draft = clone(incoming);
            if (!draft.find((s) => s.id === selectedId)) selectedId = draft[0] ? draft[0].id : null;
        } else {
            saved = clone(incoming);
            toast('Someone else just published slides. Your unsaved edits are kept.', 'info');
        }
    }

    /* ── Rendering ── */

    function renderAll() {
        if (!root) return;
        if (!draft) {
            qs('[data-body]', root).innerHTML = `<div class="st-slides-layout"><div class="st-skeleton st-skeleton--tall"></div><div class="st-skeleton st-skeleton--tall"></div></div>`;
            return;
        }
        if (!qs('.st-slides-layout[data-ready]', root)) {
            qs('[data-body]', root).innerHTML = `
                <div class="st-slides-layout" data-ready>
                    <aside class="st-slide-list-col">
                        <div class="st-slide-list-head">
                            <b>On the homepage</b><span data-live-count></span>
                        </div>
                        <div class="st-slide-list" data-list></div>
                        <button type="button" class="st-add-slide" data-add>${icon('plus')} Add a slide</button>
                        <p class="st-hint" data-list-hint></p>
                    </aside>
                    <section class="st-slide-editor" data-editor></section>
                </div>`;
        }
        renderList();
        renderEditor();
        renderStatus();
    }

    function renderList() {
        const list = qs('[data-list]', root);
        const live = draft.filter((s) => s.enabled).length;
        qs('[data-live-count]', root).textContent = `${live} showing · ${draft.length} total`;
        qs('[data-list-hint]', root).textContent = live > RECOMMENDED_MAX
            ? `Tip: ${live} slides is a lot — visitors usually see the first ${RECOMMENDED_MAX} or fewer.`
            : 'Drag slides to change the order.';
        list.innerHTML = draft.map((slide, i) => `
            <div class="st-slide-item ${slide.id === selectedId ? 'is-selected' : ''} ${slide.enabled ? '' : 'is-hidden'}"
                 data-slide="${esc(slide.id)}" draggable="true" tabindex="0" role="button" aria-pressed="${slide.id === selectedId}">
                <span class="st-slide-num">${i + 1}</span>
                <div class="st-slide-item-thumb">${thumbHtml(slide)}</div>
                <div class="st-slide-item-text">
                    <b>${esc(slideName(slide))}</b>
                    <small>${slide.enabled ? '<span class="st-dot st-dot--ok"></span>Showing' : '<span class="st-dot"></span>Hidden'}</small>
                </div>
                <span class="st-drag" title="Drag to reorder">${icon('grip-vertical')}</span>
            </div>`).join('') || `<div class="st-empty st-empty--sm">${icon('gallery-horizontal-end')}<p>No slides yet.</p></div>`;
        observeThumbs(list);
    }

    function field(name, label, { placeholder = '', multiline = false, max = 120, hint = '' } = {}) {
        const s = selected();
        const value = (s[name] && s[name][lang]) || '';
        const locked = lang === 'es' && isAuto(s.id);
        const input = multiline
            ? `<textarea class="st-input st-textarea" data-text="${name}" rows="2" maxlength="${max}" placeholder="${esc(placeholder)}" ${locked ? 'readonly' : ''}>${esc(value)}</textarea>`
            : `<input class="st-input" data-text="${name}" type="text" maxlength="${max}" placeholder="${esc(placeholder)}" value="${esc(value)}" ${locked ? 'readonly' : ''}>`;
        return `<div class="st-field"><label class="st-label">${label}</label>${input}${hint ? `<p class="st-hint">${hint}</p>` : ''}</div>`;
    }

    function highlightChips(s) {
        const title = (s.title[lang] || '').trim();
        if (!title) return '';
        const words = title.split(/\s+/);
        const options = new Set();
        // Suggest the last 1–3 words and each meaningful single word.
        for (let n = 1; n <= Math.min(3, words.length - 1); n += 1) options.add(words.slice(-n).join(' '));
        words.forEach((w) => { if (w.replace(/[^\p{L}\p{N}]/gu, '').length >= 3) options.add(w.replace(/[.,!?;:]+$/, '')); });
        const current = (s.titleAccent[lang] || '').trim().toLowerCase();
        const found = current && title.toLowerCase().indexOf(current) !== -1;
        return `<div class="st-highlight">
                    <span class="st-label">Highlight in color</span>
                    <div class="st-chip-row">
                        <button type="button" class="st-chip ${!current ? 'is-on' : ''}" data-accent-pick="">None</button>
                        ${Array.from(options).slice(0, 8).map((o) => `<button type="button" class="st-chip ${o.toLowerCase() === current ? 'is-on' : ''}" data-accent-pick="${esc(o)}">${esc(o)}</button>`).join('')}
                    </div>
                    ${current && !found ? `<p class="st-hint st-hint--warn">${icon('triangle-alert')} “${esc(s.titleAccent[lang])}” isn't in the ${lang === 'es' ? 'Spanish' : 'English'} headline — pick words above.</p>` : ''}
                </div>`;
    }

    function renderEditor() {
        const host = qs('[data-editor]', root);
        const s = selected();
        if (!s) {
            host.innerHTML = `<div class="st-empty">${icon('gallery-horizontal-end')}<h3>No slide selected</h3><p>Add a slide to get started.</p></div>`;
            preview = null;
            return;
        }
        const index = draft.indexOf(s);
        const needsImage = s.layout === 'photo' || s.layout === 'feature';
        if (!qs('[data-eform]', host)) {
            host.innerHTML = `<div data-ehead></div>
            <div class="st-preview-card st-preview-card--slide">
                <div class="st-preview-bar">
                    <span class="st-preview-title">${icon('eye')} Preview</span>
                    <div class="st-seg st-seg--sm">
                        <button type="button" data-plocale="en">EN</button><button type="button" data-plocale="es">ES</button>
                    </div>
                    <div class="st-seg st-seg--sm">
                        <button type="button" data-pdevice="desktop" title="Desktop">${icon('monitor')}</button>
                        <button type="button" data-pdevice="phone" title="Phone">${icon('smartphone')}</button>
                    </div>
                </div>
                <div class="st-frame-host" data-frame></div>
                <p class="st-preview-note" data-pnote></p>
            </div>
            <div class="st-editor-grid" data-eform></div>`;
            preview = createPreviewFrame(qs('[data-frame]', host));
        }
        qs('[data-ehead]', host).innerHTML = `
            <div class="st-editor-head">
                <div>
                    <span class="st-eyebrow">Slide ${index + 1} of ${draft.length}</span>
                    <h2>${esc(slideName(s))}</h2>
                </div>
                <div class="st-editor-actions">
                    <label class="st-switch" title="Show this slide on the homepage">
                        <input type="checkbox" data-enabled ${s.enabled ? 'checked' : ''}>
                        <span class="st-switch-track"></span><span>${s.enabled ? 'Showing' : 'Hidden'}</span>
                    </label>
                    <span class="st-vsep"></span>
                    <button type="button" class="st-icon-btn" data-move="-1" title="Move up" ${index === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button>
                    <button type="button" class="st-icon-btn" data-move="1" title="Move down" ${index === draft.length - 1 ? 'disabled' : ''}>${icon('arrow-down')}</button>
                    <button type="button" class="st-icon-btn" data-duplicate title="Duplicate">${icon('copy')}</button>
                    <button type="button" class="st-icon-btn st-icon-btn--danger" data-delete title="Delete">${icon('trash-2')}</button>
                </div>
            </div>`;
        qs('[data-pnote]', host).innerHTML = s.enabled ? '' : `${icon('eye-off')} This slide is hidden — visitors won't see it until you switch it on.`;
        qs('[data-eform]', host).innerHTML = `
                <section class="st-section st-card">
                    <div class="st-section-head"><h3>Design</h3><p>Choose a look. Photo layouts use our clinic image library.</p></div>
                    <div class="st-layout-grid" role="radiogroup" aria-label="Layout">
                        ${LAYOUT_OPTIONS.map((l) => `
                            <button type="button" role="radio" class="st-layout ${s.layout === l.id ? 'is-active' : ''}" aria-checked="${s.layout === l.id}" data-layout="${l.id}">
                                <span class="st-layout-art st-layout-art--${l.id}"><i></i><i></i><i></i></span>
                                <b>${esc(l.label)}</b><small>${esc(l.hint)}</small>
                            </button>`).join('')}
                    </div>
                    <div class="st-field ${needsImage ? '' : 'is-collapsed'}" data-image-field>
                        <span class="st-label">Photo</span>
                        <div class="st-image-grid">
                            ${IMAGE_LIBRARY.map((im) => `
                                <button type="button" class="st-image ${s.image === im.src ? 'is-active' : ''}" data-image="${esc(im.src)}" title="${esc(im.label)}">
                                    <img src="${esc(im.thumb)}" alt="" loading="lazy"><span>${esc(im.label)}</span>
                                </button>`).join('')}
                        </div>
                    </div>
                    <div class="st-field">
                        <span class="st-label">Accent color</span>
                        <div class="st-swatches">
                            ${ACCENTS.map((a) => `<button type="button" class="st-swatch ${s.accent.toLowerCase() === a.value ? 'is-active' : ''}" style="--sw:${a.value}" data-accent="${a.value}" title="${esc(a.label)}" aria-label="${esc(a.label)}"></button>`).join('')}
                            <label class="st-swatch st-swatch--custom" title="Custom color"><input type="color" data-accent-custom value="${esc(s.accent)}">${icon('palette')}</label>
                        </div>
                    </div>
                </section>

                <section class="st-section st-card">
                    <div class="st-section-head st-section-head--row">
                        <div><h3>Words</h3><p>Short and clear works best.</p></div>
                        <div class="st-lang-tabs">
                            <button type="button" data-lang="en" class="${lang === 'en' ? 'is-active' : ''}">English</button>
                            <button type="button" data-lang="es" class="${lang === 'es' ? 'is-active' : ''}">Español ${isAuto(s.id) ? '<span class="st-lang-state">auto</span>' : ''}</button>
                        </div>
                    </div>
                    ${lang === 'es' ? `
                    <div class="st-autotranslate">
                        <label class="st-switch st-switch--sm"><input type="checkbox" data-auto ${isAuto(s.id) ? 'checked' : ''}><span class="st-switch-track"></span><span>Translate from English automatically</span></label>
                        <button type="button" class="st-link-btn" data-translate>${icon('languages')} Translate now</button>
                    </div>` : ''}
                    ${field('pill', 'Small label <span class="st-optional">optional</span>', { placeholder: 'e.g. Available Today', max: 40 })}
                    ${field('title', 'Headline', { placeholder: 'e.g. Seasonal Flu Shots Are Here', max: 80 })}
                    ${highlightChips(s)}
                    ${field('subtext', 'Description <span class="st-optional">optional</span>', { placeholder: 'One or two short sentences.', multiline: true, max: 220 })}
                    ${field('kicker', 'Tagline <span class="st-optional">optional · small caps line</span>', { placeholder: 'e.g. Protect yourself this season', max: 60 })}
                </section>

                <section class="st-section st-card">
                    <div class="st-section-head st-section-head--row">
                        <div><h3>Checkmark points <span class="st-optional">optional</span></h3><p>Great for credentials and quick benefits.</p></div>
                        <button type="button" class="st-btn st-btn--ghost st-btn--sm" data-add-cred>${icon('plus')} Add point</button>
                    </div>
                    <div class="st-creds" data-creds>
                        ${s.credentials.length ? s.credentials.map((c, i) => `
                            <div class="st-cred-row">
                                <span class="st-cred-check">${icon('check')}</span>
                                <input class="st-input" data-cred="${i}" type="text" maxlength="70" value="${esc(c[lang] || '')}" placeholder="e.g. Authorized Aviation Medical Examiner" ${lang === 'es' && isAuto(s.id) ? 'readonly' : ''}>
                                <button type="button" class="st-icon-btn" data-remove-cred="${i}" title="Remove">${icon('x')}</button>
                            </div>`).join('') : '<p class="st-empty-line">No checkmark points.</p>'}
                    </div>
                </section>

                <section class="st-section st-card">
                    <div class="st-section-head"><h3>Button <span class="st-optional">optional</span></h3><p>Leave the text empty for no button.</p></div>
                    <div class="st-grid-2">
                        ${field('ctaLabel', 'Button text', { placeholder: 'e.g. Book a Flu Shot', max: 32 })}
                        <div class="st-field"><span class="st-label">Goes to</span>${linkPickerHtml('slide-cta', s.ctaUrl)}</div>
                    </div>
                </section>`;
        updatePreview();
        syncPreviewControls();
    }

    function syncPreviewControls() {
        qsa('[data-plocale]', root).forEach((b) => b.classList.toggle('is-active', b.dataset.plocale === previewLocale));
        qsa('[data-pdevice]', root).forEach((b) => b.classList.toggle('is-active', b.dataset.pdevice === previewDevice));
        const host = qs('[data-frame]', root);
        if (host) host.className = 'st-frame-host st-frame-host--' + previewDevice;
    }

    function updatePreview() {
        const s = selected();
        if (!s || !preview) return;
        const visible = draft.filter((x) => x.enabled);
        preview.update({ slide: s, locale: previewLocale, count: Math.max(1, visible.length), index: Math.max(0, visible.indexOf(s)) });
    }

    function renderStatus() {
        if (!root) return;
        const n = changeCount();
        const lastBy = state.slidesMeta && state.slidesMeta.updatedByEmail ? ` by ${esc(state.slidesMeta.updatedByEmail)}` : '';
        const when = state.slidesMeta && state.slidesMeta.updatedAt ? ` · ${esc(timeAgo(state.slidesMeta.updatedAt))}` : '';
        qs('[data-status]', root).innerHTML = saving ? '<span class="st-dot st-dot--busy"></span>Publishing…'
            : n ? `<span class="st-dot st-dot--warn"></span>${n} unpublished change${n === 1 ? '' : 's'}`
                : `<span class="st-dot st-dot--ok"></span>Homepage is up to date${when}${lastBy}`;
        qs('[data-publish]', root).disabled = saving || !n;
        qs('[data-discard]', root).disabled = saving || !n;
    }

    // Light refresh after typing: keep focus, update list item + preview + status.
    const refreshAfterEdit = debounce(() => {
        if (!root) return;
        const s = selected();
        const item = s && qs(`[data-slide="${CSS.escape(s.id)}"]`, root);
        if (item) {
            item.querySelector('.st-slide-item-text b').textContent = slideName(s);
            item.querySelector('.st-slide-item-thumb').innerHTML = thumbHtml(s);
            observeThumbs(item);
        }
        const head = qs('.st-editor-head h2', root);
        if (head && s) head.textContent = slideName(s);
        const chips = qs('.st-highlight', root);
        if (chips && s && document.activeElement && document.activeElement.dataset.text === 'title') {
            const fresh = document.createElement('div');
            fresh.innerHTML = highlightChips(s);
            if (fresh.firstElementChild) chips.replaceWith(fresh.firstElementChild);
        }
        updatePreview();
        renderStatus();
    }, 120);

    /* ── Translation ── */

    const translateSlide = debounce(async (id) => {
        const s = draft && draft.find((x) => x.id === id);
        if (!s || !isAuto(id)) return;
        try {
            const results = await Promise.all(TEXT_FIELDS.map((f) => translate(s[f].en)));
            const creds = await Promise.all(s.credentials.map((c) => translate(c.en)));
            const current = draft && draft.find((x) => x.id === id);
            if (!root || !current || !isAuto(id)) return;
            TEXT_FIELDS.forEach((f, i) => { current[f].es = results[i] || ''; });
            current.credentials.forEach((c, i) => { c.es = creds[i] || ''; });
            // Make sure the Spanish highlight actually appears in the Spanish headline.
            if (current.titleAccent.es && current.title.es.toLowerCase().indexOf(current.titleAccent.es.toLowerCase()) === -1) {
                const words = current.title.es.split(/\s+/);
                current.titleAccent.es = words.slice(-Math.min(2, words.length)).join(' ');
            }
            if (lang === 'es' && selectedId === id) renderEditor();
            refreshAfterEdit();
        } catch (error) {
            toast('Spanish translation is unavailable right now — you can type it yourself.', 'info');
        }
    }, 700);

    /* ── Mutations ── */

    function mutate(fn, { rerender = 'editor' } = {}) {
        const s = selected();
        if (!s) return;
        fn(s);
        if (rerender === 'all') { renderList(); renderEditor(); renderStatus(); }
        else if (rerender === 'editor') { renderEditor(); refreshAfterEdit(); }
        else refreshAfterEdit();
    }

    function addSlide(slide, name) {
        const next = normalize(Object.assign(slide, { id: '' }));
        const at = selected() ? draft.indexOf(selected()) + 1 : draft.length;
        draft.splice(at, 0, next);
        selectedId = next.id;
        lang = 'en';
        renderList(); renderEditor(); renderStatus();
        toast(`“${name}” slide added. Publish when you're ready.`);
        qs('[data-editor]', root).scrollTop = 0;
    }

    async function deleteSelected() {
        const s = selected();
        if (!s) return;
        const ok = await confirmDialog({ title: 'Delete this slide?', message: `“${slideName(s)}” will be removed from the homepage when you publish.`, confirmText: 'Delete slide', tone: 'danger' });
        if (!ok) return;
        const index = draft.indexOf(s);
        const removed = draft.splice(index, 1)[0];
        selectedId = draft[Math.min(index, draft.length - 1)] ? draft[Math.min(index, draft.length - 1)].id : null;
        renderAll();
        toast('Slide deleted.', 'success', {
            action: { label: 'Undo', run: () => { draft.splice(index, 0, removed); selectedId = removed.id; renderAll(); } }
        });
    }

    function move(id, toIndex) {
        const from = draft.findIndex((s) => s.id === id);
        if (from === -1 || toIndex < 0 || toIndex >= draft.length || from === toIndex) return;
        const [s] = draft.splice(from, 1);
        draft.splice(toIndex, 0, s);
        renderList(); renderEditor(); renderStatus();
    }

    async function publish() {
        if (!isDirty() || saving) return;
        const problems = draft.filter((s) => s.enabled && !s.title.en.trim());
        if (problems.length) {
            selectedId = problems[0].id; lang = 'en'; renderAll();
            toast('Every showing slide needs an English headline.', 'error');
            return;
        }
        if (!draft.some((s) => s.enabled)) {
            const ok = await confirmDialog({ title: 'No slides are showing', message: 'With every slide hidden, the homepage falls back to the default slides. Publish anyway?', confirmText: 'Publish anyway' });
            if (!ok) return;
        }
        saving = true; renderStatus();
        try {
            const payload = draft.map(normalize);
            await api.saveHomepageSlides(payload, state.user);
            saved = clone(draft);
            toast('Published — the homepage slides are live.');
        } catch (error) {
            toast(errorMessage(error, 'Could not publish the slides.'), 'error');
        } finally {
            saving = false; renderStatus();
        }
    }

    function exportBackup() {
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), slides: draft }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `mmc-homepage-slides-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Backup downloaded.');
    }

    function importBackup(file) {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const parsed = JSON.parse(reader.result);
                const slides = Array.isArray(parsed) ? parsed : parsed && parsed.slides;
                if (!Array.isArray(slides) || !slides.length) throw new Error('No slides found in that file.');
                const ok = await confirmDialog({ title: 'Restore this backup?', message: `This replaces the slides you're editing with ${slides.length} slide${slides.length === 1 ? '' : 's'} from the file. Nothing goes live until you publish.`, confirmText: 'Restore' });
                if (!ok) return;
                draft = slides.map(normalize);
                selectedId = draft[0].id;
                renderAll();
                toast('Backup restored — review it, then publish.');
            } catch (error) {
                toast(errorMessage(error, 'That file could not be read.'), 'error');
            }
        };
        reader.readAsText(file);
    }

    function onKey(event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); publish(); }
    }

    return {
        id: 'slides',
        title: 'Homepage Slides',
        isDirty,
        mount(container) {
            root = container;
            draft = null; saved = null;
            root.innerHTML = `
                <div class="st-page-head">
                    <div>
                        <h1>Homepage Slides</h1>
                        <p>The rotating highlights on the homepage. Edit, reorder and preview — nothing changes until you publish.</p>
                    </div>
                    <div class="st-page-actions">
                        <div class="st-menu">
                            <button type="button" class="st-btn st-btn--ghost" data-menu aria-haspopup="true">${icon('ellipsis')} More</button>
                            <div class="st-menu-panel" hidden>
                                <button type="button" data-export>${icon('download')} Download a backup</button>
                                <label>${icon('upload')} Restore from a backup<input type="file" accept=".json,application/json" data-import hidden></label>
                                <button type="button" data-reset>${icon('rotate-ccw')} Start over with default slides</button>
                            </div>
                        </div>
                        <button type="button" class="st-btn st-btn--primary" data-add>${icon('plus')} Add a slide</button>
                    </div>
                </div>
                <div data-body></div>
                <div class="st-actionbar">
                    <div class="st-actionbar-status" data-status></div>
                    <div class="st-actionbar-buttons">
                        <button type="button" class="st-btn st-btn--ghost" data-discard>Discard changes</button>
                        <button type="button" class="st-btn st-btn--primary" data-publish>${icon('send')} Publish slides</button>
                    </div>
                </div>`;
            loadFromState(true);
            renderAll();
            if (!draft) renderStatusSafe();
            cleanups.push(subscribe('slides', () => { const had = !!draft; loadFromState(false); if (!had || !isDirty()) renderAll(); else renderStatus(); }));
            cleanups.push(registerGuard(isDirty));
            document.addEventListener('keydown', onKey);

            root.addEventListener('click', async (event) => {
                const t = event.target;
                const item = t.closest('[data-slide]');
                const menuBtn = t.closest('[data-menu]');
                const panel = qs('.st-menu-panel', root);
                if (menuBtn) { panel.hidden = !panel.hidden; return; }
                if (!t.closest('.st-menu')) panel.hidden = true;
                if (t.closest('[data-add]')) openTemplateGallery({ onPick: addSlide });
                if (item && !t.closest('[data-drag]')) {
                    if (item.dataset.slide !== selectedId) { selectedId = item.dataset.slide; renderList(); renderEditor(); }
                }
                if (t.closest('[data-publish]')) publish();
                if (t.closest('[data-discard]')) {
                    const ok = await confirmDialog({ title: 'Discard all changes?', message: 'Your unpublished edits to the slides will be lost.', confirmText: 'Discard', tone: 'danger' });
                    if (ok) { draft = clone(saved); if (!selected()) selectedId = draft[0] ? draft[0].id : null; renderAll(); }
                }
                if (t.closest('[data-export]')) { panel.hidden = true; exportBackup(); }
                if (t.closest('[data-reset]')) {
                    panel.hidden = true;
                    const ok = await confirmDialog({ title: 'Start over with the default slides?', message: 'Your slides are replaced by the four original slides. Nothing goes live until you publish.', confirmText: 'Use default slides' });
                    if (ok) { draft = store.defaultSlides.map(normalize); selectedId = draft[0].id; renderAll(); }
                }
                const s = selected();
                if (!s) return;
                const layoutBtn = t.closest('[data-layout]');
                const imageBtn = t.closest('[data-image]');
                const accentBtn = t.closest('[data-accent]');
                const langBtn = t.closest('[data-lang]');
                const pick = t.closest('[data-accent-pick]');
                const pl = t.closest('[data-plocale]');
                const pd = t.closest('[data-pdevice]');
                const moveBtn = t.closest('[data-move]');
                if (layoutBtn) mutate((x) => {
                    x.layout = layoutBtn.dataset.layout;
                    if ((x.layout === 'photo' || x.layout === 'feature') && !x.image) x.image = IMAGE_LIBRARY[0].src;
                });
                if (imageBtn) mutate((x) => { x.image = imageBtn.dataset.image; });
                if (accentBtn) mutate((x) => { x.accent = accentBtn.dataset.accent; });
                if (langBtn) { lang = langBtn.dataset.lang; previewLocale = lang; renderEditor(); }
                if (pick) mutate((x) => { x.titleAccent[lang] = pick.dataset.accentPick; if (lang === 'es') autoTranslate[x.id] = autoTranslate[x.id]; });
                if (pl) { previewLocale = pl.dataset.plocale; syncPreviewControls(); updatePreview(); }
                if (pd) { previewDevice = pd.dataset.pdevice; syncPreviewControls(); updatePreview(); }
                if (moveBtn) move(s.id, draft.indexOf(s) + Number(moveBtn.dataset.move));
                if (t.closest('[data-duplicate]')) {
                    const copy = normalize(Object.assign(clone(s), { id: '', enabled: false }));
                    copy.title.en = copy.title.en ? copy.title.en + ' (copy)' : '';
                    draft.splice(draft.indexOf(s) + 1, 0, copy);
                    selectedId = copy.id; renderAll();
                    toast('Duplicated. The copy is hidden until you switch it on.');
                }
                if (t.closest('[data-delete]')) deleteSelected();
                if (t.closest('[data-add-cred]')) {
                    mutate((x) => { x.credentials.push({ en: '', es: '' }); });
                    const inputs = qsa('[data-cred]', root);
                    if (inputs.length) inputs[inputs.length - 1].focus();
                }
                const rm = t.closest('[data-remove-cred]');
                if (rm) mutate((x) => { x.credentials.splice(Number(rm.dataset.removeCred), 1); });
                if (t.closest('[data-translate]')) { autoTranslate[s.id] = true; renderEditor(); translateSlide(s.id); toast('Translating to Spanish…', 'info', { duration: 1500 }); }
            });

            root.addEventListener('input', (event) => {
                const t = event.target;
                const s = selected();
                if (!s) return;
                if (t.dataset.text) {
                    s[t.dataset.text][lang] = t.value;
                    if (lang === 'en' && isAuto(s.id)) translateSlide(s.id);
                    refreshAfterEdit();
                } else if (t.dataset.cred !== undefined) {
                    const c = s.credentials[Number(t.dataset.cred)];
                    if (c) { c[lang] = t.value; if (lang === 'en' && isAuto(s.id)) translateSlide(s.id); refreshAfterEdit(); }
                } else if (t.matches('[data-link-select], [data-link-custom]')) {
                    const link = readLinkPicker(qs('[data-linkpicker]', root));
                    s.ctaUrl = link.url; s.ctaNewTab = link.newTab;
                    refreshAfterEdit();
                } else if (t.matches('[data-accent-custom]')) {
                    s.accent = t.value; refreshAfterEdit();
                }
            });
            root.addEventListener('change', (event) => {
                const t = event.target;
                const s = selected();
                if (t.matches('[data-import]') && t.files[0]) { importBackup(t.files[0]); t.value = ''; qs('.st-menu-panel', root).hidden = true; return; }
                if (!s) return;
                if (t.matches('[data-enabled]')) mutate((x) => { x.enabled = t.checked; }, { rerender: 'all' });
                if (t.matches('[data-auto]')) { autoTranslate[s.id] = t.checked; renderEditor(); if (t.checked) translateSlide(s.id); }
                if (t.matches('[data-link-select]')) {
                    const link = readLinkPicker(qs('[data-linkpicker]', root));
                    s.ctaUrl = link.url; s.ctaNewTab = link.newTab;
                    if (t.value === '__custom') qs('[data-link-custom]', root).focus();
                    refreshAfterEdit();
                }
                if (t.matches('[data-accent-custom]')) renderEditor();
            });
            root.addEventListener('focusin', (event) => {
                const s = selected();
                if (s && lang === 'es' && isAuto(s.id) && event.target.readOnly) {
                    toast('Spanish follows the English automatically. Switch off “Translate automatically” to edit it.', 'info', { duration: 4200 });
                }
            });
            root.addEventListener('keydown', (event) => {
                const item = event.target.closest && event.target.closest('[data-slide]');
                if (item && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); item.click(); }
                if (item && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                    event.preventDefault();
                    const i = draft.findIndex((s) => s.id === item.dataset.slide);
                    move(item.dataset.slide, i + (event.key === 'ArrowUp' ? -1 : 1));
                    const again = qs(`[data-slide="${CSS.escape(item.dataset.slide)}"]`, root);
                    if (again) again.focus();
                }
            });

            // Drag & drop reordering.
            root.addEventListener('dragstart', (event) => {
                const item = event.target.closest('[data-slide]');
                if (!item) return;
                dragId = item.dataset.slide;
                item.classList.add('is-dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', dragId);
            });
            root.addEventListener('dragover', (event) => {
                const item = event.target.closest('[data-slide]');
                if (!item || !dragId) return;
                event.preventDefault();
                const rect = item.getBoundingClientRect();
                qsa('.st-slide-item', root).forEach((n) => n.classList.remove('drop-before', 'drop-after'));
                item.classList.add(event.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
            });
            root.addEventListener('drop', (event) => {
                const item = event.target.closest('[data-slide]');
                if (!item || !dragId) return;
                event.preventDefault();
                const rect = item.getBoundingClientRect();
                const before = event.clientY < rect.top + rect.height / 2;
                const from = draft.findIndex((s) => s.id === dragId);
                let to = draft.findIndex((s) => s.id === item.dataset.slide) + (before ? 0 : 1);
                if (from < to) to -= 1;
                move(dragId, to);
            });
            root.addEventListener('dragend', () => {
                dragId = null;
                qsa('.st-slide-item', root).forEach((n) => n.classList.remove('is-dragging', 'drop-before', 'drop-after'));
            });
        },
        unmount() {
            document.removeEventListener('keydown', onKey);
            cleanups.splice(0).forEach((fn) => fn());
            translateSlide.cancel(); refreshAfterEdit.cancel();
            root = null; preview = null;
        }
    };

    function renderStatusSafe() { if (qs('[data-status]', root)) qs('[data-status]', root).innerHTML = '<span class="st-dot st-dot--busy"></span>Loading slides…'; }
}
