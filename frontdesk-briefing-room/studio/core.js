/*
 * MMC Studio — shared helpers: state, DOM utilities, toasts, dialogs,
 * translation, formatting and sanitizing.
 */
import { icon } from './icons.js';

export { icon };

/* ── Tiny reactive store ── */

const listeners = new Map();
export const state = {
    user: null,
    isAdmin: false,
    slides: null,       // array once loaded
    banner: null,       // normalized emergency banner
    scheduled: null,    // array of scheduled banners
    muted: [],
    users: [],
    holidays: null
};

export function setState(key, value) {
    state[key] = value;
    (listeners.get(key) || []).forEach((fn) => {
        try { fn(value); } catch (error) { console.error(error); }
    });
}

export function subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key).delete(fn);
}

/* ── DOM helpers ── */

export function esc(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function qs(selector, root = document) { return root.querySelector(selector); }
export function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

export function el(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

export function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

// Order-insensitive deep equality for plain data (used for "unsaved changes").
function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') {
        return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    }
    return JSON.stringify(value === undefined ? null : value);
}

export function same(a, b) {
    return stable(a) === stable(b);
}

export function debounce(fn, ms) {
    let timer = null;
    const wrapped = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
    wrapped.cancel = () => clearTimeout(timer);
    return wrapped;
}

export function uid(prefix = 'id') {
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
}

/* ── Toasts ── */

export function toast(message, tone = 'success', options = {}) {
    let host = qs('#stToasts');
    if (!host) {
        host = el('<div id="stToasts" class="st-toasts" role="status" aria-live="polite"></div>');
        document.body.appendChild(host);
    }
    const glyph = tone === 'error' ? 'circle-alert' : tone === 'info' ? 'info' : 'circle-check';
    const node = el(`<div class="st-toast st-toast--${tone}">${icon(glyph)}<span>${esc(message)}</span></div>`);
    if (options.action) {
        const button = el(`<button type="button" class="st-toast-action">${esc(options.action.label)}</button>`);
        button.addEventListener('click', () => { options.action.run(); dismiss(); });
        node.appendChild(button);
    }
    host.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-in'));
    const dismiss = () => {
        node.classList.remove('is-in');
        setTimeout(() => node.remove(), 250);
    };
    setTimeout(dismiss, options.duration || (tone === 'error' ? 6500 : 3800));
    return dismiss;
}

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
    return (error && (error.friendly || error.message)) || fallback;
}

/* ── Dialogs ── */

let openLayers = 0;

function trapFocus(container, event) {
    const focusable = qsa('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]', container)
        .filter((node) => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

/**
 * Generic layer (modal or side drawer).
 * Returns { root, body, footer, close }. `onClose` runs once on close.
 */
export function openLayer({ title, subtitle = '', kind = 'modal', size = 'md', body = '', footer = '', onClose, closeGuard }) {
    const previouslyFocused = document.activeElement;
    const root = el(`
        <div class="st-layer st-layer--${kind}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
            <div class="st-layer-backdrop" data-close></div>
            <div class="st-layer-panel st-layer-panel--${size}">
                <header class="st-layer-head">
                    <div>
                        <h2 class="st-layer-title">${esc(title)}</h2>
                        ${subtitle ? `<p class="st-layer-sub">${esc(subtitle)}</p>` : ''}
                    </div>
                    <button type="button" class="st-icon-btn" data-close aria-label="Close">${icon('x')}</button>
                </header>
                <div class="st-layer-body"></div>
                <footer class="st-layer-foot"></footer>
            </div>
        </div>`);
    const bodyEl = qs('.st-layer-body', root);
    const footEl = qs('.st-layer-foot', root);
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    if (typeof footer === 'string') footEl.innerHTML = footer; else if (footer) footEl.appendChild(footer);
    if (!footer) footEl.hidden = true;

    let closed = false;
    async function close(force) {
        if (closed) return;
        if (!force && closeGuard && !(await closeGuard())) return;
        closed = true;
        openLayers -= 1;
        root.classList.remove('is-open');
        document.removeEventListener('keydown', onKey, true);
        setTimeout(() => {
            root.remove();
            if (!openLayers) document.body.classList.remove('st-has-layer');
        }, 220);
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        if (onClose) onClose();
    }
    function onKey(event) {
        if (!root.isConnected || root !== qsa('.st-layer').pop()) return;
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
        if (event.key === 'Tab') trapFocus(root, event);
    }
    root.addEventListener('click', (event) => {
        if (event.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(root);
    document.body.classList.add('st-has-layer');
    openLayers += 1;
    requestAnimationFrame(() => {
        root.classList.add('is-open');
        const autofocus = qs('[autofocus]', root) || qs('.st-layer-body input, .st-layer-body button', root);
        if (autofocus) autofocus.focus({ preventScroll: true });
    });
    return { root, body: bodyEl, footer: footEl, close };
}

export function confirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'primary' }) {
    return new Promise((resolve) => {
        let result = false;
        const layer = openLayer({
            title,
            size: 'sm',
            body: `<p class="st-confirm-text">${esc(message)}</p>`,
            footer: `<button type="button" class="st-btn st-btn--ghost" data-close>${esc(cancelText)}</button>
                     <button type="button" class="st-btn st-btn--${tone === 'danger' ? 'danger' : 'primary'}" data-confirm autofocus>${esc(confirmText)}</button>`,
            onClose: () => resolve(result)
        });
        qs('[data-confirm]', layer.root).addEventListener('click', () => { result = true; layer.close(true); });
    });
}

/* ── Unsaved-change guards (pages register; router asks before leaving) ── */

const guards = new Set();
export function registerGuard(fn) { guards.add(fn); return () => guards.delete(fn); }
export function hasUnsavedChanges() { return Array.from(guards).some((fn) => fn()); }
window.addEventListener('beforeunload', (event) => {
    if (hasUnsavedChanges()) { event.preventDefault(); event.returnValue = ''; }
});

/* ── Translation (English → Spanish) ── */

const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=';
const translations = new Map();

export function translate(text) {
    const clean = typeof text === 'string' ? text.trim() : '';
    if (!clean) return Promise.resolve('');
    if (translations.has(clean)) return translations.get(clean);
    const request = fetch(TRANSLATE_URL + encodeURIComponent(clean))
        .then((response) => {
            if (!response.ok) throw new Error('Automatic Spanish translation is temporarily unavailable.');
            return response.json();
        })
        .then((data) => {
            const chunks = Array.isArray(data) ? data[0] : null;
            if (!Array.isArray(chunks)) throw new Error('Automatic Spanish translation returned an unexpected response.');
            return chunks.map((chunk) => (Array.isArray(chunk) ? chunk[0] || '' : '')).join('').trim();
        })
        .catch((error) => {
            translations.delete(clean);
            throw error;
        });
    translations.set(clean, request);
    return request;
}

/* ── Sanitizing ── */

export function sanitizeUrl(value) {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return '';
    if (url.startsWith('#') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;
    if (/^(https?:|mailto:|tel:|sms:)/i.test(url)) return url;
    if (/^[a-z0-9][a-z0-9/_\-.]*([?#].*)?$/i.test(url)) return url;
    return '';
}

// Same allow-list the public site uses for banner messages.
export function sanitizeRichText(raw) {
    if (typeof raw !== 'string') return '';
    const temp = document.createElement('div');
    temp.innerHTML = raw;
    const allowed = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, SPAN: 1, BR: 1 };
    (function walk(parent) {
        Array.from(parent.childNodes).forEach((node) => {
            if (node.nodeType === 3) return;
            if (node.nodeType !== 1 || !allowed[node.tagName]) {
                while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
                node.parentNode.removeChild(node);
                return;
            }
            const color = node.tagName === 'SPAN' ? node.style.color : '';
            Array.from(node.attributes).forEach((attr) => node.removeAttribute(attr.name));
            if (color) node.style.color = color;
            walk(node);
        });
    })(temp);
    return temp.innerHTML.replace(/(<br\s*\/?>\s*)+$/i, '').trim();
}

export function stripHtml(html) {
    if (typeof html !== 'string') return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent || '').replace(/\s+/g, ' ').trim();
}

/* ── Links staff use all the time ── */

export const LINK_PRESETS = [
    { id: 'book', label: 'Book an appointment', url: 'https://nextpatient.co/p/montgomerymedclinic/schedule', newTab: true },
    { id: 'call', label: 'Call the office', url: 'tel:3012082273' },
    { id: 'text', label: 'Text the office', url: 'sms:3012052293' },
    { id: 'portal', label: 'Patient portal', url: 'https://15259-6.portal.athenahealth.com', newTab: true },
    { id: 'directions', label: 'Get directions', url: 'https://maps.apple.com/?address=800%20S%20Frederick%20Ave,%20Suite%20110,%20Gaithersburg,%20MD%20%2020877', newTab: true },
    { id: 'services', label: 'Our services (homepage)', url: '#services' },
    { id: 'urgent', label: 'Urgent & Primary Care page', url: '/urgent-primary-care/' },
    { id: 'faa', label: 'FAA pilot exams page', url: '/faa-physicals/pilot-resources/' },
    { id: 'immigration', label: 'Immigration physicals page', url: '/immigration-physicals/' },
    { id: 'occupational', label: 'Occupational health page', url: '/occupational-health/' },
    { id: 'derma', label: 'Dermatology page', url: '/dermatology/' },
    { id: 'wellness', label: 'Wellness center page', url: '/nutrition-wellness/' },
    { id: 'acupuncture', label: 'Acupuncture page', url: '/five-elements-acupuncture/' },
    { id: 'insurance', label: 'Insurance page', url: '/insurance/' }
];

export function presetForUrl(url) {
    return LINK_PRESETS.find((preset) => preset.url === url) || null;
}

/** Link picker: a select of common destinations plus a custom field. */
export function linkPickerHtml(name, url) {
    const preset = presetForUrl(url);
    const custom = url && !preset;
    return `
        <div class="st-linkpicker" data-linkpicker="${esc(name)}">
            <select class="st-input" data-link-select aria-label="Where the button goes">
                <option value="">Choose where it goes…</option>
                ${LINK_PRESETS.map((p) => `<option value="${esc(p.id)}" ${preset && preset.id === p.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
                <option value="__custom" ${custom ? 'selected' : ''}>Custom link…</option>
            </select>
            <input class="st-input" data-link-custom type="text" placeholder="https://… or /page/" value="${custom ? esc(url) : ''}" ${custom ? '' : 'hidden'}>
        </div>`;
}

/** Reads a link picker; returns { url, newTab } (newTab only when a preset suggests it). */
export function readLinkPicker(root) {
    const select = qs('[data-link-select]', root);
    const custom = qs('[data-link-custom]', root);
    if (!select) return { url: '', newTab: false };
    if (select.value === '__custom') {
        custom.hidden = false;
        const url = sanitizeUrl(custom.value);
        return { url, newTab: /^https?:/i.test(url) };
    }
    custom.hidden = true;
    const preset = LINK_PRESETS.find((p) => p.id === select.value);
    return preset ? { url: preset.url, newTab: !!preset.newTab } : { url: '', newTab: false };
}

/* ── Dates (clinic time: America/New_York) ── */

const TZ = 'America/New_York';
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n) { return (n < 10 ? '0' : '') + n; }

export function todayKey() {
    try {
        const parts = {};
        new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
            .formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
        return `${parts.year}-${parts.month}-${parts.day}`;
    } catch (error) {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
}

export function keyToDate(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function addDays(key, n) {
    const d = keyToDate(key);
    d.setUTCDate(d.getUTCDate() + n);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function dayOfWeek(key) { return keyToDate(key).getUTCDay(); }

export function daysBetween(fromKey, toKey) {
    return Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86400000);
}

export function formatDate(key, { weekday = true, year = false } = {}) {
    if (!key) return '';
    const d = keyToDate(key);
    return (weekday ? DAYS_SHORT[d.getUTCDay()] + ', ' : '') + MONTHS_SHORT[d.getUTCMonth()] + ' ' + d.getUTCDate()
        + (year ? ', ' + d.getUTCFullYear() : '');
}

export function formatRange(startKey, endKey) {
    if (!startKey) return '';
    if (!endKey || endKey === startKey) return formatDate(startKey, { year: keyToDate(startKey).getUTCFullYear() !== keyToDate(todayKey()).getUTCFullYear() });
    const a = keyToDate(startKey);
    const b = keyToDate(endKey);
    if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
        return `${MONTHS_SHORT[a.getUTCMonth()]} ${a.getUTCDate()} – ${b.getUTCDate()}`;
    }
    return `${formatDate(startKey, { weekday: false })} – ${formatDate(endKey, { weekday: false })}`;
}

export function relativeDay(key) {
    const diff = daysBetween(todayKey(), key);
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    if (diff === -1) return 'yesterday';
    if (diff > 1 && diff < 7) return 'in ' + diff + ' days';
    if (diff >= 7 && diff < 14) return 'next week';
    if (diff < -1 && diff > -7) return Math.abs(diff) + ' days ago';
    return formatDate(key);
}

export function timeAgo(value) {
    if (!value) return '';
    let date = null;
    if (value && typeof value.toDate === 'function') date = value.toDate();
    else if (value instanceof Date) date = value;
    else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
    if (!date || Number.isNaN(date.getTime())) return '';
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return 'just now';
    if (seconds < 3600) return Math.round(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.round(seconds / 3600) + ' hr ago';
    if (seconds < 86400 * 30) return Math.round(seconds / 86400) + ' days ago';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Scheduled-banner helpers (mirror the public site's logic) ── */

export const WEEKEND_LABEL_RE = /^(Saturday|Sunday)\s+(Open|Closed)\s+–\s+(\d{4}-\d{2}-\d{2})$/;
export function isWeekendEntry(entry) { return WEEKEND_LABEL_RE.test((entry && entry.label) || ''); }

function weekParityOn(entry, key) {
    const recurrence = entry.recurrence || {};
    if (!recurrence.anchorDate) return false;
    const weekIndex = Math.floor(daysBetween(recurrence.anchorDate, key) / 7);
    return ((weekIndex % 2) + 2) % 2 === (recurrence.weekParity || 0);
}

/** Is this scheduled banner showing on `key` (YYYY-MM-DD)? Same rules as the site. */
export function isScheduledOn(entry, key) {
    const recurrence = entry.recurrence || { mode: 'dates', days: [] };
    const dow = dayOfWeek(key);
    if (recurrence.mode === 'weekly') return (recurrence.days || []).indexOf(dow) !== -1;
    if (recurrence.mode === 'biweekly') return (recurrence.days || []).indexOf(dow) !== -1 && weekParityOn(entry, key);
    return !!(entry.startDate && entry.endDate && entry.startDate <= key && entry.endDate >= key);
}

/** What the public site shows today: the manual banner wins, then the first active scheduled one. */
export function liveBannerToday() {
    const banner = state.banner;
    if (banner && banner.enabled && stripHtml(banner.message.en || banner.message.es)) {
        return { source: 'manual', banner };
    }
    const today = todayKey();
    const entry = (state.scheduled || []).find((item) => isScheduledOn(item, today));
    return entry ? { source: 'scheduled', banner: entry.banner, entry } : { source: 'none', banner: null };
}

export function describeRecurrence(entry) {
    const recurrence = entry.recurrence || { mode: 'dates' };
    const days = (recurrence.days || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAYS_SHORT[d]);
    if (recurrence.mode === 'weekly') return days.length ? 'Every ' + days.join(', ') : 'Weekly (no days picked)';
    if (recurrence.mode === 'biweekly') return days.length ? 'Every other ' + days.join(', ') : 'Every other week';
    return formatRange(entry.startDate, entry.endDate);
}

export const TONES = [
    { id: 'red', label: 'Urgent', hint: 'Closures, emergencies', swatch: '#9b1c22' },
    { id: 'orange', label: 'Notice', hint: 'Changes, delays', swatch: '#b8460b' },
    { id: 'yellow', label: 'Heads-up', hint: 'Weather, reminders', swatch: '#e0b93f' },
    { id: 'green', label: 'Good news', hint: 'Open, new services', swatch: '#17603a' }
];
