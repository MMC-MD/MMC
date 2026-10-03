/*
 * MMC Studio — Weekend Hours.
 * One row per weekend: Saturday / Sunday / Both / Closed. Saves the same
 * "Saturday Open – YYYY-MM-DD" scheduled banners the website header, footer
 * and reminder emails already read.
 */
import {
    esc, qs, qsa, icon, state, subscribe, toast, errorMessage, confirmDialog, registerGuard,
    todayKey, addDays, dayOfWeek, keyToDate, MONTHS_SHORT, WEEKEND_LABEL_RE, isWeekendEntry
} from './core.js';

const WEEKENDS_SHOWN = 14;
const CHOICES = [
    { id: 'sat', label: 'Saturday', short: 'Sat' },
    { id: 'sun', label: 'Sunday', short: 'Sun' },
    { id: 'both', label: 'Both', short: 'Both' },
    { id: 'closed', label: 'Closed', short: 'Closed' }
];

const OPEN_MESSAGE = { en: 'The clinic is open today from 8:00 AM – 1:00 PM.', es: 'La clínica está abierta hoy de 8:00 AM a 1:00 PM.' };
const CLOSED_TOMORROW = { en: 'We are closed today but will be open tomorrow.', es: 'Estamos cerrados hoy, pero abriremos mañana.' };
const CLOSED_WEEKEND = { en: 'The clinic is closed today. Enjoy your weekend!', es: '¡La clínica está cerrada hoy. Disfrute su fin de semana!' };

function firstSaturday() {
    const today = todayKey();
    const dow = dayOfWeek(today);
    if (dow === 6) return today;
    if (dow === 0) return addDays(today, -1);
    return addDays(today, 6 - dow);
}

function weekendKeys() {
    const start = firstSaturday();
    return Array.from({ length: WEEKENDS_SHOWN }, (_, i) => addDays(start, i * 7));
}

function rangeLabel(sat) {
    const a = keyToDate(sat);
    const b = keyToDate(addDays(sat, 1));
    return a.getUTCMonth() === b.getUTCMonth()
        ? `${MONTHS_SHORT[a.getUTCMonth()]} ${a.getUTCDate()}–${b.getUTCDate()}`
        : `${MONTHS_SHORT[a.getUTCMonth()]} ${a.getUTCDate()} – ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCDate()}`;
}

/** day status map from scheduled banners: { 'YYYY-MM-DD': { status, id } } */
function readDays(scheduled) {
    const days = {};
    (scheduled || []).forEach((entry) => {
        const m = WEEKEND_LABEL_RE.exec(entry.label || '');
        if (m && m[3] === entry.startDate) days[m[3]] = { status: m[2].toLowerCase(), id: entry.id };
    });
    return days;
}

function choiceFromDays(sat, days) {
    const s = days[sat] && days[sat].status;
    const u = days[addDays(sat, 1)] && days[addDays(sat, 1)].status;
    if (s === 'open' && u === 'open') return 'both';
    if (s === 'open') return 'sat';
    if (u === 'open') return 'sun';
    if (s === 'closed' || u === 'closed') return 'closed';
    return '';
}

function statusesFor(choice) {
    if (choice === 'sat') return ['open', 'closed'];
    if (choice === 'sun') return ['closed', 'open'];
    if (choice === 'both') return ['open', 'open'];
    if (choice === 'closed') return ['closed', 'closed'];
    return [null, null];
}

function bannerFor(dateKey, status, nextDayStatus) {
    const isSat = dayOfWeek(dateKey) === 6;
    const label = `${isSat ? 'Saturday' : 'Sunday'} ${status === 'open' ? 'Open' : 'Closed'} – ${dateKey}`;
    const message = status === 'open' ? OPEN_MESSAGE : (isSat && nextDayStatus === 'open' ? CLOSED_TOMORROW : CLOSED_WEEKEND);
    return {
        label, startDate: dateKey, endDate: dateKey,
        recurrence: { mode: 'dates', days: [] },
        banner: {
            enabled: true, color: status === 'open' ? 'green' : 'red', showPill: false, showButton: false,
            pill: { en: '', es: '' }, message: Object.assign({}, message),
            ctaLabel: { en: '', es: '' }, ctaUrl: '', ctaNewTab: false
        }
    };
}

export function weekendSummary(scheduled, count = 4) {
    const days = readDays(scheduled);
    return weekendKeys().slice(0, count).map((sat) => ({ sat, label: rangeLabel(sat), choice: choiceFromDays(sat, days) }));
}

export function createWeekendPage({ api }) {
    let root = null;
    let saved = {};      // sat -> choice from server
    let draft = {};      // sat -> choice being edited
    let saving = false;
    const cleanups = [];

    function changedKeys() {
        return weekendKeys().filter((sat) => (draft[sat] || '') !== (saved[sat] || ''));
    }
    function isDirty() { return changedKeys().length > 0; }

    function loadFromState() {
        if (!state.scheduled) return;
        const days = readDays(state.scheduled);
        const fresh = {};
        weekendKeys().forEach((sat) => { fresh[sat] = choiceFromDays(sat, days); });
        const dirty = isDirty();
        saved = fresh;
        if (!dirty) draft = Object.assign({}, fresh);
    }

    function render() {
        if (!root) return;
        const list = qs('[data-weekends]', root);
        if (!state.scheduled) { list.innerHTML = '<div class="st-skeleton st-skeleton--tall"></div>'; return; }
        const today = todayKey();
        const keys = weekendKeys();
        const unset = keys.slice(0, 4).filter((sat) => !draft[sat]).length;
        qs('[data-alert]', root).innerHTML = unset
            ? `<div class="st-callout st-callout--warn">${icon('triangle-alert')}<div><b>${unset} of the next 4 weekends ${unset === 1 ? 'isn’t' : 'aren’t'} set yet.</b> The website shows “Weekend hours vary” until you choose.</div></div>`
            : `<div class="st-callout st-callout--ok">${icon('circle-check')}<div><b>The next 4 weekends are set.</b> The website header, contact popup and footer are up to date.</div></div>`;

        let lastMonth = -1;
        list.innerHTML = keys.map((sat, i) => {
            const month = keyToDate(sat).getUTCMonth();
            const monthHead = month !== lastMonth ? `<div class="st-wk-month">${esc(keyToDate(sat).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }))}</div>` : '';
            lastMonth = month;
            const choice = draft[sat] || '';
            const changed = (draft[sat] || '') !== (saved[sat] || '');
            const isNow = sat <= today && addDays(sat, 1) >= today;
            const tag = isNow ? 'This weekend' : i === 0 ? 'This weekend' : i === 1 ? 'Next weekend' : '';
            return `${monthHead}
                <div class="st-wk-row ${changed ? 'is-changed' : ''} ${!choice ? 'is-unset' : ''}" data-sat="${sat}">
                    <div class="st-wk-date">
                        <b>${esc(rangeLabel(sat))}</b>
                        ${tag ? `<small>${esc(tag)}</small>` : ''}
                    </div>
                    <div class="st-wk-choices" role="radiogroup" aria-label="Open days for ${esc(rangeLabel(sat))}">
                        ${CHOICES.map((c) => `<button type="button" role="radio" class="st-wk-choice st-wk-choice--${c.id} ${choice === c.id ? 'is-active' : ''}" aria-checked="${choice === c.id}" data-choice="${c.id}">${c.id === 'closed' ? icon('x') : icon('check')}<span>${esc(c.label)}</span></button>`).join('')}
                    </div>
                    <div class="st-wk-state">${changed ? '<span class="st-badge st-badge--warn">Changed</span>' : (!choice ? '<span class="st-badge">Not set</span>' : '')}</div>
                </div>`;
        }).join('');

        const n = changedKeys().length;
        qs('[data-status]', root).innerHTML = saving ? '<span class="st-dot st-dot--busy"></span>Saving…'
            : n ? `<span class="st-dot st-dot--warn"></span>${n} weekend${n === 1 ? '' : 's'} changed`
                : '<span class="st-dot st-dot--ok"></span>Weekend hours are saved';
        qs('[data-save]', root).disabled = saving || !n;
        qs('[data-discard]', root).disabled = saving || !n;
    }

    async function save() {
        const keys = changedKeys();
        if (!keys.length || saving) return;
        saving = true; render();
        const days = readDays(state.scheduled);
        try {
            for (const sat of keys) {
                const sun = addDays(sat, 1);
                const [satStatus, sunStatus] = statusesFor(draft[sat]);
                for (const [dateKey, status, next] of [[sat, satStatus, sunStatus], [sun, sunStatus, null]]) {
                    const existing = days[dateKey];
                    if (!status) {
                        if (existing) await api.deleteScheduledBanner(existing.id);
                        continue;
                    }
                    const entry = bannerFor(dateKey, status, next);
                    if (existing) entry.id = existing.id;
                    await api.saveScheduledBanner(entry, state.user);
                }
            }
            // Clean up any stray duplicate weekend entries for the edited dates.
            const seen = {};
            for (const e of state.scheduled || []) {
                if (!isWeekendEntry(e)) continue;
                const k = e.startDate;
                if (keys.indexOf(k) === -1 && keys.indexOf(addDays(k, -1)) === -1) continue;
                if (seen[k] && days[k] && days[k].id !== e.id) await api.deleteScheduledBanner(e.id);
                seen[k] = true;
            }
            saved = Object.assign({}, saved, Object.fromEntries(keys.map((k) => [k, draft[k] || ''])));
            toast(`Saved ${keys.length} weekend${keys.length === 1 ? '' : 's'}. The website is updated.`);
        } catch (error) {
            toast(errorMessage(error, 'Could not save weekend hours. Please try again.'), 'error');
        } finally {
            saving = false; render();
        }
    }

    async function fillAlternating() {
        const keys = weekendKeys();
        const start = draft[keys[0]] === 'sun' ? 'sun' : 'sat';
        const ok = await confirmDialog({
            title: 'Fill the alternating pattern?',
            message: `Starting this weekend with ${start === 'sat' ? 'Saturday' : 'Sunday'}, every weekend alternates between Saturday and Sunday. You can still change any weekend before saving.`,
            confirmText: 'Fill weekends'
        });
        if (!ok) return;
        keys.forEach((sat, i) => { draft[sat] = (i % 2 === 0) === (start === 'sat') ? 'sat' : 'sun'; });
        render();
    }

    return {
        id: 'weekend',
        title: 'Weekend Hours',
        isDirty,
        mount(container) {
            root = container;
            root.innerHTML = `
                <div class="st-page-head">
                    <div>
                        <h1>Weekend Hours</h1>
                        <p>Choose which day the clinic is open each weekend (8 AM – 1 PM). The website updates itself.</p>
                    </div>
                    <div class="st-page-actions">
                        <button type="button" class="st-btn st-btn--ghost" data-fill>${icon('wand-sparkles')} Alternate Sat / Sun</button>
                    </div>
                </div>
                <div data-alert></div>
                <div class="st-card st-wk-card">
                    <div class="st-wk-legend">
                        <span><i class="st-legend st-legend--open"></i>Open 8 AM – 1 PM</span>
                        <span><i class="st-legend st-legend--closed"></i>Closed</span>
                        <span class="st-wk-legend-note">Shown in the website header, the contact popup and the footer.</span>
                    </div>
                    <div data-weekends></div>
                </div>
                <div class="st-actionbar">
                    <div class="st-actionbar-status" data-status></div>
                    <div class="st-actionbar-buttons">
                        <button type="button" class="st-btn st-btn--ghost" data-discard>Discard changes</button>
                        <button type="button" class="st-btn st-btn--primary" data-save>${icon('send')} Save weekend hours</button>
                    </div>
                </div>`;
            loadFromState();
            render();
            cleanups.push(subscribe('scheduled', () => { loadFromState(); render(); }));
            cleanups.push(registerGuard(isDirty));
            root.addEventListener('click', (event) => {
                const btn = event.target.closest('[data-choice]');
                if (btn) {
                    const sat = btn.closest('[data-sat]').dataset.sat;
                    draft[sat] = draft[sat] === btn.dataset.choice ? '' : btn.dataset.choice;
                    render();
                }
                if (event.target.closest('[data-save]')) save();
                if (event.target.closest('[data-discard]')) { draft = Object.assign({}, saved); render(); }
                if (event.target.closest('[data-fill]')) fillAlternating();
            });
        },
        unmount() {
            cleanups.splice(0).forEach((fn) => fn());
            root = null;
        }
    };
}
