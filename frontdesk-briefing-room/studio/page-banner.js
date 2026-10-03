/*
 * MMC Studio — Site Banner page (the banner shown on every page right now).
 */
import {
    esc, qs, icon, clone, same, state, subscribe, toast, errorMessage, confirmDialog,
    registerGuard, stripHtml, timeAgo, liveBannerToday, formatRange
} from './core.js';
import { createBannerEditor, bannerPreviewHtml } from './banner-editor.js';

export function createBannerPage({ api, navigate, openScheduleDrawer }) {
    let root = null;
    let editor = null;
    let draft = null;
    let saved = null;
    let device = 'desktop';
    let locale = 'en';
    let saving = false;
    const cleanups = [];

    function isDirty() { return !!(draft && saved && !same(draft, saved)); }

    function statusLine() {
        if (saving) return `<span class="st-dot st-dot--busy"></span>Publishing…`;
        if (isDirty()) return `<span class="st-dot st-dot--warn"></span>Unsaved changes`;
        const by = state.banner && state.banner.updatedByEmail ? ` by ${esc(state.banner.updatedByEmail)}` : '';
        const when = state.banner && state.banner.updatedAt ? timeAgo(state.banner.updatedAt) : '';
        return `<span class="st-dot st-dot--ok"></span>All changes published${when ? ` · ${esc(when)}` : ''}${by}`;
    }

    function liveCard() {
        const enabled = draft.enabled;
        const hasMessage = !!stripHtml(draft.message.en || draft.message.es);
        const live = liveBannerToday();
        let note = '';
        if (!enabled && live.source === 'scheduled') {
            note = `<p class="st-live-note">${icon('calendar-clock')} A scheduled banner is showing today instead: <b>${esc(live.entry.label)}</b> (${esc(formatRange(live.entry.startDate, live.entry.endDate) || 'repeating')}). Turning this banner on will replace it.</p>`;
        } else if (enabled && !hasMessage) {
            note = `<p class="st-live-note st-live-note--warn">${icon('triangle-alert')} Add a message — an empty banner won't show on the website.</p>`;
        }
        return `
            <div class="st-live-card ${enabled ? 'is-on' : ''}">
                <label class="st-switch st-switch--lg">
                    <input type="checkbox" data-enabled ${enabled ? 'checked' : ''}>
                    <span class="st-switch-track"></span>
                </label>
                <div class="st-live-text">
                    <b>${enabled ? 'Banner is turned on' : 'Banner is turned off'}</b>
                    <span>${enabled
                        ? (isDirty() ? 'Publish to show it on mmccare.com.' : 'Showing at the top of every page on mmccare.com.')
                        : 'Visitors don’t see this banner. Turn it on, then publish.'}</span>
                </div>
            </div>${note}`;
    }

    function renderChrome() {
        if (!root) return;
        qs('[data-live]', root).innerHTML = liveCard();
        qs('[data-status]', root).innerHTML = statusLine();
        qs('[data-publish]', root).disabled = saving || !isDirty();
        qs('[data-discard]', root).disabled = saving || !isDirty();
        qs('[data-preview]', root).innerHTML = bannerPreviewHtml(draft, { device, locale, hidden: !draft.enabled });
        qs('[data-preview-note]', root).textContent = draft.enabled ? '' : 'Preview — this banner is currently turned off.';
        root.querySelectorAll('[data-device]').forEach((b) => b.classList.toggle('is-active', b.dataset.device === device));
        root.querySelectorAll('[data-plang]').forEach((b) => b.classList.toggle('is-active', b.dataset.plang === locale));
    }

    function loadFromState(force) {
        if (!state.banner) return;
        const incoming = clone(state.banner);
        delete incoming.updatedAt; delete incoming.updatedByEmail; delete incoming.updatedByUid;
        if (!saved || force || !isDirty()) {
            saved = incoming;
            draft = clone(incoming);
            if (editor) editor.set(draft);
        } else {
            saved = incoming; // someone else published; keep local edits
            toast('The banner was just updated by someone else. Your unsaved edits are kept.', 'info');
        }
        renderChrome();
    }

    async function publish() {
        if (!isDirty() || saving) return;
        if (draft.enabled && !stripHtml(draft.message.en)) {
            toast('Write a message in English before publishing.', 'error');
            return;
        }
        saving = true; renderChrome();
        try {
            await api.saveEmergencyBanner(draft, state.user);
            saved = clone(draft);
            toast(draft.enabled ? 'Published — the banner is live on the website.' : 'Saved — the banner is hidden from the website.');
        } catch (error) {
            toast(errorMessage(error, 'Could not publish the banner.'), 'error');
        } finally {
            saving = false; renderChrome();
        }
    }

    async function quickToggle(enabled) {
        draft.enabled = enabled;
        renderChrome();
        // Turning off is the common emergency action — make it one click.
        if (!enabled && saved && saved.enabled && same(Object.assign({}, draft, { enabled: true }), Object.assign({}, saved))) {
            const ok = await confirmDialog({ title: 'Take the banner down?', message: 'The banner will disappear from the website right away.', confirmText: 'Turn off now', tone: 'danger' });
            if (ok) publish(); else { draft.enabled = true; renderChrome(); }
        }
    }

    return {
        id: 'banner',
        title: 'Site Banner',
        isDirty,
        mount(container) {
            root = container;
            draft = null; saved = null;
            root.innerHTML = `
                <div class="st-page-head">
                    <div>
                        <h1>Site Banner</h1>
                        <p>An announcement strip at the top of every page — for closures, delays and good news.</p>
                    </div>
                    <div class="st-page-actions">
                        <button type="button" class="st-btn st-btn--ghost" data-schedule>${icon('calendar-clock')} Schedule for later</button>
                    </div>
                </div>
                <div class="st-split">
                    <div class="st-split-main">
                        <div data-live></div>
                        <div id="siteBannerEditor" data-editor></div>
                    </div>
                    <aside class="st-split-side">
                        <div class="st-preview-card">
                            <div class="st-preview-bar">
                                <span class="st-preview-title">${icon('eye')} Live preview</span>
                                <div class="st-seg st-seg--sm">
                                    <button type="button" data-plang="en">EN</button><button type="button" data-plang="es">ES</button>
                                </div>
                                <div class="st-seg st-seg--sm">
                                    <button type="button" data-device="desktop" title="Desktop">${icon('monitor')}</button>
                                    <button type="button" data-device="phone" title="Phone">${icon('smartphone')}</button>
                                </div>
                            </div>
                            <div data-preview></div>
                            <p class="st-preview-note" data-preview-note></p>
                        </div>
                    </aside>
                </div>
                <div class="st-actionbar">
                    <div class="st-actionbar-status" data-status></div>
                    <div class="st-actionbar-buttons">
                        <button type="button" class="st-btn st-btn--ghost" data-discard>Discard changes</button>
                        <button type="button" class="st-btn st-btn--primary" data-publish>${icon('send')} Publish</button>
                    </div>
                </div>`;

            if (!state.banner) {
                qs('[data-editor]', root).innerHTML = '<div class="st-skeleton st-skeleton--tall"></div>';
            }
            const startEditor = () => {
                if (editor || !state.banner) return;
                loadFromState(true);
                editor = createBannerEditor(qs('[data-editor]', root), {
                    value: draft,
                    onChange(next) {
                        draft = Object.assign(next, { enabled: draft.enabled });
                        renderChrome();
                    }
                });
                renderChrome();
            };
            startEditor();
            cleanups.push(subscribe('banner', () => { if (!editor) startEditor(); else loadFromState(false); }));
            cleanups.push(subscribe('scheduled', () => { if (draft) renderChrome(); }));
            cleanups.push(registerGuard(isDirty));

            root.addEventListener('change', (event) => {
                if (event.target.matches('[data-enabled]')) quickToggle(event.target.checked);
            });
            root.addEventListener('click', async (event) => {
                if (event.target.closest('[data-publish]')) publish();
                if (event.target.closest('[data-discard]')) {
                    draft = clone(saved); editor.set(draft); renderChrome();
                    toast('Changes discarded.', 'info');
                }
                const d = event.target.closest('[data-device]');
                if (d) { device = d.dataset.device; renderChrome(); }
                const l = event.target.closest('[data-plang]');
                if (l) { locale = l.dataset.plang; renderChrome(); }
                if (event.target.closest('[data-schedule]')) {
                    openScheduleDrawer({ prefillBanner: Object.assign(clone(draft), { enabled: true }) });
                }
            });
            document.addEventListener('keydown', onKey);
        },
        unmount() {
            document.removeEventListener('keydown', onKey);
            cleanups.splice(0).forEach((fn) => fn());
            if (editor) editor.destroy();
            editor = null; root = null;
        }
    };

    function onKey(event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            publish();
        }
    }
}
