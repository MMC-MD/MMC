/*
 * MMC Studio — Scheduled banners: list + editor drawer.
 */
import {
    esc, qs, qsa, icon, clone, same, state, subscribe, toast, errorMessage, confirmDialog,
    openLayer, todayKey, addDays, dayOfWeek, formatDate, describeRecurrence, relativeDay,
    isScheduledOn, isWeekendEntry, stripHtml, DAYS_SHORT, TONES
} from './core.js';
import { createBannerEditor, bannerPreviewHtml } from './banner-editor.js';
import { BANNER_TEMPLATES, SCHEDULE_STARTERS } from './templates.js';

const MODES = [
    { id: 'single', label: 'One day' },
    { id: 'range', label: 'Several days' },
    { id: 'weekly', label: 'Every week' },
    { id: 'biweekly', label: 'Every other week' }
];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function mondayOf(key) {
    const dow = dayOfWeek(key);
    return addDays(key, dow === 0 ? -6 : 1 - dow);
}

function emptyBanner() {
    return {
        enabled: true, color: 'orange', showPill: true, showButton: false,
        pill: { en: 'Notice', es: 'Aviso' }, message: { en: '', es: '' },
        ctaLabel: { en: '', es: '' }, ctaUrl: '', ctaNewTab: false
    };
}

function bannerFromTemplate(id) {
    const tpl = BANNER_TEMPLATES.find((item) => item.id === id);
    if (!tpl) return emptyBanner();
    const b = clone(tpl.banner);
    return {
        enabled: true, color: tpl.color, showPill: true, showButton: b.showButton !== false && !!b.ctaUrl,
        pill: b.pill, message: b.message, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl || '', ctaNewTab: !!b.ctaNewTab
    };
}

export function entryStatus(entry, today = todayKey()) {
    const mode = (entry.recurrence && entry.recurrence.mode) || 'dates';
    if (mode === 'weekly' || mode === 'biweekly') {
        return { group: 'repeat', active: isScheduledOn(entry, today), label: isScheduledOn(entry, today) ? 'Showing today' : 'Repeats' };
    }
    if (!entry.startDate || !entry.endDate) return { group: 'past', label: 'No dates' };
    if (entry.endDate < today) return { group: 'past', label: 'Ended ' + relativeDay(entry.endDate) };
    if (entry.startDate <= today) {
        return { group: 'active', active: true, label: entry.endDate === today ? 'Showing today · ends tonight' : 'Showing now · ends ' + relativeDay(entry.endDate) };
    }
    return { group: 'upcoming', label: 'Starts ' + relativeDay(entry.startDate) };
}

/* ═══ Editor drawer ═══ */

export function openScheduleEditor({ api, entry = null, starter = null, prefillBanner = null }) {
    const today = todayKey();
    const isNew = !entry || !entry.id;
    const source = entry ? clone(entry) : null;
    const initialMode = (() => {
        if (source) {
            const m = source.recurrence && source.recurrence.mode;
            if (m === 'weekly' || m === 'biweekly') return m;
            return source.startDate && source.startDate === source.endDate ? 'single' : 'range';
        }
        if (starter && (starter.mode === 'weekly' || starter.mode === 'range')) return starter.mode;
        return 'single';
    })();

    const model = {
        id: source ? source.id : '',
        label: source ? source.label : (starter ? starter.name : ''),
        mode: initialMode,
        startDate: source ? source.startDate || today : today,
        endDate: source ? source.endDate || today : (starter && starter.mode === 'range' ? addDays(today, 27) : today),
        days: source && source.recurrence ? (source.recurrence.days || []).slice() : (starter && starter.mode === 'weekly' ? [6] : []),
        anchor: source && source.recurrence && source.recurrence.anchorDate ? source.recurrence.anchorDate : mondayOf(today),
        weekParity: source && source.recurrence ? source.recurrence.weekParity || 0 : 0,
        banner: source ? clone(source.banner) : (prefillBanner ? clone(prefillBanner) : (starter ? bannerFromTemplate(starter.template) : emptyBanner()))
    };
    model.banner.enabled = true;
    const original = clone(model);
    let editor = null;
    let saving = false;
    let previewDevice = 'desktop';

    const body = `
        <div class="st-drawer-grid">
            <div class="st-drawer-form">
                ${starter && starter.mode === 'holiday' ? `
                <section class="st-section st-section--accent">
                    <div class="st-section-head"><h3>${icon('party-popper')} Which holiday?</h3><p>We'll fill in the name, date and message.</p></div>
                    <select class="st-input" data-holiday><option value="">Loading holidays…</option></select>
                </section>` : ''}

                <section class="st-section">
                    <div class="st-field">
                        <label class="st-label" for="schedName">Name <span class="st-optional">only staff see this</span></label>
                        <input id="schedName" class="st-input" data-sched-name type="text" maxlength="60" placeholder="e.g. Thanksgiving closure" value="${esc(model.label)}" autofocus>
                    </div>
                    <div class="st-field">
                        <span class="st-label">When should it show?</span>
                        <div class="st-seg st-seg--full" role="radiogroup">
                            ${MODES.map((m) => `<button type="button" role="radio" data-mode="${m.id}">${esc(m.label)}</button>`).join('')}
                        </div>
                    </div>
                    <div data-when></div>
                    <p class="st-when-summary" data-when-summary></p>
                </section>

                <div data-banner-editor id="schedBannerEditor"></div>
            </div>
            <aside class="st-drawer-preview">
                <div class="st-preview-bar">
                    <span class="st-preview-title">${icon('eye')} Preview</span>
                    <div class="st-seg st-seg--sm">
                        <button type="button" data-pdevice="desktop">${icon('monitor')}</button>
                        <button type="button" data-pdevice="phone">${icon('smartphone')}</button>
                    </div>
                </div>
                <div data-preview></div>
            </aside>
        </div>`;

    const footer = `
        ${isNew ? '' : `<button type="button" class="st-btn st-btn--danger-ghost" data-delete>${icon('trash-2')} Delete</button>`}
        <span class="st-foot-spacer"></span>
        <button type="button" class="st-btn st-btn--ghost" data-close>Cancel</button>
        <button type="button" class="st-btn st-btn--primary" data-save>${icon('calendar-check')} ${isNew ? 'Schedule banner' : 'Save changes'}</button>`;

    const layer = openLayer({
        title: isNew ? 'Schedule a banner' : 'Edit scheduled banner',
        subtitle: 'It appears and disappears on its own — no need to remember to turn it off.',
        kind: 'drawer', size: 'xl', body, footer,
        closeGuard: async () => {
            if (saving) return false;
            if (!isChanged()) return true;
            return confirmDialog({ title: 'Discard this banner?', message: 'Your changes to this scheduled banner will be lost.', confirmText: 'Discard', tone: 'danger' });
        }
    });
    const root = layer.root;

    function isChanged() {
        return !same(Object.assign({}, model, { banner: editor ? editor.get() : model.banner }), original);
    }

    function whenHtml() {
        if (model.mode === 'single') {
            return `<div class="st-field"><label class="st-label" for="schedDay">Date</label>
                    <input id="schedDay" class="st-input st-input--date" type="date" data-start value="${esc(model.startDate)}" min="${esc(isNew ? today : '')}"></div>`;
        }
        if (model.mode === 'range') {
            return `<div class="st-grid-2">
                        <div class="st-field"><label class="st-label" for="schedFrom">First day</label>
                            <input id="schedFrom" class="st-input st-input--date" type="date" data-start value="${esc(model.startDate)}"></div>
                        <div class="st-field"><label class="st-label" for="schedTo">Last day</label>
                            <input id="schedTo" class="st-input st-input--date" type="date" data-end value="${esc(model.endDate)}" min="${esc(model.startDate)}"></div>
                    </div>`;
        }
        const chips = `<div class="st-day-chips" role="group" aria-label="Days of the week">
            ${WEEK_ORDER.map((d) => `<button type="button" class="st-day-chip ${model.days.indexOf(d) !== -1 ? 'is-on' : ''}" data-day="${d}" aria-pressed="${model.days.indexOf(d) !== -1}">${DAYS_SHORT[d]}</button>`).join('')}
        </div>`;
        if (model.mode === 'weekly') {
            return `<div class="st-field"><span class="st-label">On these days</span>${chips}</div>`;
        }
        return `<div class="st-field"><span class="st-label">On these days</span>${chips}</div>
                <div class="st-field"><label class="st-label" for="schedAnchor">Starting the week of</label>
                    <input id="schedAnchor" class="st-input st-input--date" type="date" data-anchor value="${esc(addDays(model.anchor, model.weekParity ? 7 : 0))}">
                    <p class="st-hint">Shows that week, skips the next, and so on.</p></div>`;
    }

    function summary() {
        const days = WEEK_ORDER.filter((d) => model.days.indexOf(d) !== -1).map((d) => DAYS_SHORT[d]).join(', ');
        if (model.mode === 'single') {
            if (!model.startDate) return '';
            const rel = relativeDay(model.startDate);
            const relative = /^(today|tomorrow|in |next week)/.test(rel) ? ` — ${rel}` : '';
            return `Shows all day on ${formatDate(model.startDate, { year: true })}${relative}.`;
        }
        if (model.mode === 'range') {
            if (model.endDate < model.startDate) return '⚠︎ The last day is before the first day.';
            const n = Math.round((new Date(model.endDate) - new Date(model.startDate)) / 86400000) + 1;
            return `Shows for ${n} day${n === 1 ? '' : 's'}: ${formatDate(model.startDate)} through ${formatDate(model.endDate)}.`;
        }
        if (!days) return 'Pick at least one day.';
        return model.mode === 'weekly' ? `Shows every ${days}, until you delete it.` : `Shows every other week on ${days}, until you delete it.`;
    }

    function renderWhen() {
        qsa('[data-mode]', root).forEach((b) => {
            b.classList.toggle('is-active', b.dataset.mode === model.mode);
            b.setAttribute('aria-checked', b.dataset.mode === model.mode ? 'true' : 'false');
        });
        qs('[data-when]', root).innerHTML = whenHtml();
        renderSummary();
    }
    function renderSummary() { qs('[data-when-summary]', root).textContent = summary(); }

    function renderPreview() {
        qs('[data-preview]', root).innerHTML = bannerPreviewHtml(editor ? editor.get() : model.banner, { device: previewDevice });
        qsa('[data-pdevice]', root).forEach((b) => b.classList.toggle('is-active', b.dataset.pdevice === previewDevice));
    }

    editor = createBannerEditor(qs('[data-banner-editor]', root), {
        value: model.banner,
        showTemplates: !starter || starter.mode !== 'holiday',
        onChange: () => renderPreview()
    });
    renderWhen();
    renderPreview();

    // Holiday quick-fill.
    const holidaySelect = qs('[data-holiday]', root);
    if (holidaySelect) {
        const fill = (list) => {
            holidaySelect.innerHTML = '<option value="">Choose a holiday…</option>' + list.map((h) =>
                `<option value="${esc(h.date)}" data-name="${esc(h.name)}">${esc(h.name)} — ${esc(formatDate(h.date))}</option>`).join('');
        };
        if (state.holidays) fill(state.holidays);
        else {
            api.fetchUpcomingHolidays(240).then((list) => { state.holidays = list || []; fill(state.holidays); })
                .catch(() => { holidaySelect.innerHTML = '<option value="">Couldn’t load holidays — set the date below</option>'; });
        }
        holidaySelect.addEventListener('change', () => {
            const opt = holidaySelect.selectedOptions[0];
            if (!holidaySelect.value) return;
            const name = opt.dataset.name;
            model.label = name + ' closure';
            model.mode = 'single';
            model.startDate = model.endDate = holidaySelect.value;
            qs('[data-sched-name]', root).value = model.label;
            const b = editor.get();
            b.message.en = `Our office is <b>closed today</b> for ${esc(name)}. We will reopen on the next business day.`;
            b.message.es = '';
            editor.set(b);
            // Trigger auto-translate by nudging the editor with the English text.
            const area = qs('[data-banner-editor] [data-field="message"]', root);
            if (area) area.dispatchEvent(new Event('input', { bubbles: true }));
            renderWhen(); renderPreview();
        });
    }

    root.addEventListener('input', (event) => {
        const t = event.target;
        if (t.matches('[data-sched-name]')) model.label = t.value;
        if (t.matches('[data-start]')) {
            model.startDate = t.value;
            if (model.mode === 'single' || model.endDate < model.startDate) model.endDate = t.value;
            const end = qs('[data-end]', root);
            if (end) { end.min = t.value; if (end.value < t.value) end.value = t.value; }
            renderSummary();
        }
        if (t.matches('[data-end]')) { model.endDate = t.value; renderSummary(); }
        if (t.matches('[data-anchor]') && t.value) { model.anchor = mondayOf(t.value); model.weekParity = 0; renderSummary(); }
    });
    root.addEventListener('click', async (event) => {
        const modeBtn = event.target.closest('[data-mode]');
        const dayBtn = event.target.closest('[data-day]');
        const dev = event.target.closest('[data-pdevice]');
        if (modeBtn) {
            model.mode = modeBtn.dataset.mode;
            if (model.mode === 'single') model.endDate = model.startDate;
            if ((model.mode === 'weekly' || model.mode === 'biweekly') && !model.days.length) model.days = [6];
            renderWhen();
        }
        if (dayBtn) {
            const d = Number(dayBtn.dataset.day);
            const i = model.days.indexOf(d);
            if (i === -1) model.days.push(d); else model.days.splice(i, 1);
            renderWhen();
        }
        if (dev) { previewDevice = dev.dataset.pdevice; renderPreview(); }
        if (event.target.closest('[data-save]')) save();
        if (event.target.closest('[data-delete]')) {
            const ok = await confirmDialog({ title: 'Delete this scheduled banner?', message: `“${model.label || 'Scheduled banner'}” will be removed and won't show on the website.`, confirmText: 'Delete', tone: 'danger' });
            if (!ok) return;
            try {
                await api.deleteScheduledBanner(model.id);
                toast('Scheduled banner deleted.');
                layer.close(true);
            } catch (error) { toast(errorMessage(error, 'Could not delete it.'), 'error'); }
        }
    });

    async function save() {
        const banner = editor.get();
        if (!stripHtml(banner.message.en)) { toast('Write the banner message first.', 'error'); return; }
        if ((model.mode === 'single' || model.mode === 'range') && !model.startDate) { toast('Pick a date.', 'error'); return; }
        if (model.mode === 'range' && model.endDate < model.startDate) { toast('The last day must be on or after the first day.', 'error'); return; }
        if ((model.mode === 'weekly' || model.mode === 'biweekly') && !model.days.length) { toast('Pick at least one day of the week.', 'error'); return; }
        const repeating = model.mode === 'weekly' || model.mode === 'biweekly';
        const entryOut = {
            id: model.id || undefined,
            label: (model.label || '').trim() || stripHtml(banner.pill.en) || 'Scheduled banner',
            startDate: repeating ? today : model.startDate,
            endDate: repeating ? today : (model.mode === 'single' ? model.startDate : model.endDate),
            recurrence: repeating
                ? Object.assign({ mode: model.mode, days: model.days.slice().sort() }, model.mode === 'biweekly' ? { anchorDate: model.anchor, weekParity: model.weekParity } : {})
                : { mode: 'dates', days: [] },
            banner: Object.assign(banner, { enabled: true })
        };
        saving = true;
        qs('[data-save]', root).disabled = true;
        try {
            await api.saveScheduledBanner(entryOut, state.user);
            toast(isNew ? 'Scheduled! It will appear on the website automatically.' : 'Scheduled banner updated.');
            saving = false;
            layer.close(true);
        } catch (error) {
            saving = false;
            qs('[data-save]', root).disabled = false;
            toast(errorMessage(error, 'Could not save the scheduled banner.'), 'error');
        }
    }

    return layer;
}

/* ═══ List page ═══ */

export function createSchedulePage({ api }) {
    let root = null;
    let view = 'upcoming';
    let showWeekend = false;
    const cleanups = [];

    function toneOf(color) { return TONES.find((t) => t.id === color) || TONES[0]; }

    function rowHtml(entry) {
        const status = entryStatus(entry);
        const mode = (entry.recurrence && entry.recurrence.mode) || 'dates';
        const repeating = mode === 'weekly' || mode === 'biweekly';
        const date = entry.startDate ? new Date(entry.startDate + 'T12:00:00') : null;
        const badge = repeating
            ? `<div class="st-date-badge st-date-badge--repeat">${icon('repeat')}</div>`
            : `<div class="st-date-badge"><small>${date ? esc(date.toLocaleString('en-US', { month: 'short' })) : ''}</small><b>${date ? date.getDate() : '–'}</b></div>`;
        const tone = toneOf(entry.banner.color);
        const message = stripHtml(entry.banner.message.en || entry.banner.message.es) || '(no message)';
        return `
            <article class="st-sched-row ${status.active ? 'is-active' : ''} ${status.group === 'past' ? 'is-past' : ''}" data-id="${esc(entry.id)}">
                ${badge}
                <button type="button" class="st-sched-main" data-edit="${esc(entry.id)}">
                    <div class="st-sched-top">
                        <h3>${esc(entry.label)}</h3>
                        <span class="st-status-pill ${status.active ? 'is-live' : ''}">${status.active ? '<span class="st-pulse"></span>' : ''}${esc(status.label)}</span>
                    </div>
                    <p class="st-sched-when">${icon(repeating ? 'repeat' : 'calendar-days')} ${esc(describeRecurrence(entry))}</p>
                    <p class="st-sched-msg"><span class="st-tone-dot" style="background:${tone.swatch}"></span>${esc(message)}</p>
                </button>
                <div class="st-sched-actions">
                    <button type="button" class="st-icon-btn" data-duplicate="${esc(entry.id)}" title="Duplicate">${icon('copy')}</button>
                    <button type="button" class="st-icon-btn st-icon-btn--danger" data-remove="${esc(entry.id)}" title="Delete">${icon('trash-2')}</button>
                </div>
            </article>`;
    }

    function group(title, items, empty) {
        if (!items.length) return empty ? `<div class="st-group"><h2 class="st-group-title">${esc(title)}</h2><p class="st-empty-line">${esc(empty)}</p></div>` : '';
        return `<div class="st-group"><h2 class="st-group-title">${esc(title)} <span>${items.length}</span></h2>${items.map(rowHtml).join('')}</div>`;
    }

    function render() {
        if (!root) return;
        const list = qs('[data-list]', root);
        if (!state.scheduled) { list.innerHTML = '<div class="st-skeleton"></div><div class="st-skeleton"></div>'; return; }
        const all = state.scheduled;
        const weekendCount = all.filter(isWeekendEntry).length;
        const items = all.filter((e) => showWeekend || !isWeekendEntry(e));
        const buckets = { active: [], upcoming: [], repeat: [], past: [] };
        items.forEach((e) => buckets[entryStatus(e).group].push(e));
        buckets.past.sort((a, b) => (a.endDate < b.endDate ? 1 : -1));
        qs('[data-weekend-count]', root).textContent = weekendCount ? `(${weekendCount})` : '';
        qsa('[data-view]', root).forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
        qs('[data-past-count]', root).textContent = buckets.past.length ? buckets.past.length : '';

        if (view === 'past') {
            list.innerHTML = buckets.past.length ? group('Past banners', buckets.past)
                : `<div class="st-empty">${icon('calendar-check')}<h3>Nothing in the past yet</h3><p>Banners that have finished will show up here.</p></div>`;
            return;
        }
        const anything = buckets.active.length + buckets.upcoming.length + buckets.repeat.length;
        if (!anything) {
            list.innerHTML = `<div class="st-empty">${icon('calendar-clock')}<h3>No banners scheduled</h3><p>Plan ahead for holidays, early closings and seasonal messages. Pick a quick start above.</p></div>`;
            return;
        }
        list.innerHTML = group('Showing on the website today', buckets.active)
            + group('Coming up', buckets.upcoming, 'Nothing else is scheduled yet.')
            + group('Repeats', buckets.repeat);
    }

    async function remove(id) {
        const entry = (state.scheduled || []).find((e) => e.id === id);
        if (!entry) return;
        const ok = await confirmDialog({ title: 'Delete this scheduled banner?', message: `“${entry.label}” will be removed and won't show on the website.`, confirmText: 'Delete', tone: 'danger' });
        if (!ok) return;
        try {
            await api.deleteScheduledBanner(id);
            toast('Deleted.', 'success', {
                action: { label: 'Undo', run: () => api.saveScheduledBanner(Object.assign(clone(entry), { id: undefined }), state.user).then(() => toast('Restored.')) }
            });
        } catch (error) { toast(errorMessage(error, 'Could not delete it.'), 'error'); }
    }

    return {
        id: 'schedule',
        title: 'Scheduled Banners',
        isDirty: () => false,
        mount(container) {
            root = container;
            root.innerHTML = `
                <div class="st-page-head">
                    <div>
                        <h1>Scheduled Banners</h1>
                        <p>Plan banners ahead of time. They turn on and off by themselves.</p>
                    </div>
                    <div class="st-page-actions">
                        <button type="button" class="st-btn st-btn--primary" data-new>${icon('plus')} New scheduled banner</button>
                    </div>
                </div>
                <section class="st-quickstart">
                    ${SCHEDULE_STARTERS.map((s) => `
                        <button type="button" class="st-quick" data-starter="${esc(s.id)}">
                            <span class="st-quick-icon">${icon(s.icon)}</span>
                            <span class="st-quick-text"><b>${esc(s.name)}</b><small>${esc(s.hint)}</small></span>
                        </button>`).join('')}
                </section>
                <div class="st-toolbar">
                    <div class="st-seg">
                        <button type="button" data-view="upcoming">Upcoming</button>
                        <button type="button" data-view="past">Past <span class="st-count" data-past-count></span></button>
                    </div>
                    <label class="st-check st-check--muted" title="Weekend open/closed entries are managed on the Weekend Hours page">
                        <input type="checkbox" data-show-weekend> Show weekend-hours entries <span data-weekend-count></span>
                    </label>
                </div>
                <div data-list></div>`;
            render();
            cleanups.push(subscribe('scheduled', render));
            root.addEventListener('click', (event) => {
                const edit = event.target.closest('[data-edit]');
                const dup = event.target.closest('[data-duplicate]');
                const rem = event.target.closest('[data-remove]');
                const starter = event.target.closest('[data-starter]');
                const viewBtn = event.target.closest('[data-view]');
                if (event.target.closest('[data-new]')) openScheduleEditor({ api });
                if (starter) openScheduleEditor({ api, starter: SCHEDULE_STARTERS.find((s) => s.id === starter.dataset.starter) });
                if (edit) {
                    const entry = state.scheduled.find((e) => e.id === edit.dataset.edit);
                    if (entry && isWeekendEntry(entry)) {
                        toast('Weekend open/closed days are easier to change on the Weekend Hours page.', 'info', { action: { label: 'Open', run: () => { location.hash = '#weekend'; } } });
                    }
                    if (entry) openScheduleEditor({ api, entry });
                }
                if (dup) {
                    const entry = state.scheduled.find((e) => e.id === dup.dataset.duplicate);
                    if (entry) openScheduleEditor({ api, entry: Object.assign(clone(entry), { id: '', label: entry.label + ' (copy)' }) });
                }
                if (rem) remove(rem.dataset.remove);
                if (viewBtn) { view = viewBtn.dataset.view; render(); }
            });
            root.addEventListener('change', (event) => {
                if (event.target.matches('[data-show-weekend]')) { showWeekend = event.target.checked; render(); }
            });
        },
        unmount() {
            cleanups.splice(0).forEach((fn) => fn());
            root = null;
        }
    };
}
