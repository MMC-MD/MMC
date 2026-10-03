/*
 * MMC Studio — app shell: sign-in, navigation, live data and routing.
 */
import * as api from '../../js/firebase-client.js?v=2026042806';
import {
    esc, qs, qsa, icon, state, setState, subscribe, toast, errorMessage, confirmDialog,
    hasUnsavedChanges, liveBannerToday
} from './core.js';
import { createOverviewPage } from './page-overview.js';
import { createBannerPage } from './page-banner.js';
import { createSchedulePage, openScheduleEditor } from './page-schedule.js';
import { createWeekendPage, weekendSummary } from './page-weekend.js';
import { createSlidesPage } from './page-slides.js';
import { createTeamPage } from './page-team.js';
import { SCHEDULE_STARTERS } from './templates.js';

const NAV = [
    { id: 'overview', label: 'Overview', icon: 'house' },
    { section: 'Website' },
    { id: 'banner', label: 'Site Banner', icon: 'megaphone' },
    { id: 'schedule', label: 'Scheduled Banners', icon: 'calendar-clock' },
    { id: 'weekend', label: 'Weekend Hours', icon: 'calendar-days' },
    { id: 'slides', label: 'Homepage Slides', icon: 'gallery-horizontal-end' },
    { section: 'Admin', admin: true },
    { id: 'team', label: 'Team & Reminders', icon: 'users', admin: true }
];

function openScheduleDrawer({ prefillBanner = null, starterId = null } = {}) {
    const starter = starterId ? SCHEDULE_STARTERS.find((s) => s.id === starterId) : null;
    openScheduleEditor({ api, starter, prefillBanner });
}

const ctx = { api, openScheduleDrawer };
const pages = {
    overview: createOverviewPage(ctx),
    banner: createBannerPage(ctx),
    schedule: createSchedulePage(ctx),
    weekend: createWeekendPage(ctx),
    slides: createSlidesPage(ctx),
    team: createTeamPage(ctx)
};

let current = null;
let unsubscribers = [];
let lastHash = '';

/* ═══ Sign-in screen ═══ */

function renderLogin(message, tone) {
    const app = qs('#studio');
    app.className = 'st-login-shell';
    app.innerHTML = `
        <div class="st-login">
            <div class="st-login-brand">
                <img src="/images/brand/mmc-logo-400.webp" alt="Montgomery Medical Clinic" width="200" height="56">
            </div>
            <div class="st-login-card">
                <h1>MMC Studio</h1>
                <p>Sign in to update the website — banners, weekend hours and homepage slides.</p>
                <form data-login novalidate>
                    <label class="st-field"><span class="st-label">Email</span>
                        <input class="st-input" id="loginEmail" type="email" autocomplete="username" inputmode="email" placeholder="you@mmccare.com" required autofocus></label>
                    <label class="st-field"><span class="st-label">Password</span>
                        <span class="st-password">
                            <input class="st-input" id="loginPassword" type="password" autocomplete="current-password" placeholder="Your password" required>
                            <button type="button" class="st-icon-btn" data-reveal aria-label="Show password">${icon('eye')}</button>
                        </span></label>
                    <div class="st-login-msg ${tone ? 'is-' + tone : ''}" data-msg role="status">${esc(message || '')}</div>
                    <button type="submit" class="st-btn st-btn--primary st-btn--block" data-submit>Sign in</button>
                    <button type="button" class="st-link-btn st-login-forgot" data-forgot>Forgot your password?</button>
                </form>
            </div>
            <p class="st-login-foot">${icon('lock')} For Montgomery Medical Clinic staff only.</p>
        </div>`;
    const form = qs('[data-login]', app);
    const msg = (text, t) => { const m = qs('[data-msg]', app); m.textContent = text; m.className = 'st-login-msg ' + (t ? 'is-' + t : ''); };
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = qs('#loginEmail').value.trim();
        const password = qs('#loginPassword').value;
        if (!email || !password) { msg('Enter your email and password.', 'error'); return; }
        const btn = qs('[data-submit]', app);
        btn.disabled = true; btn.textContent = 'Signing in…';
        try {
            await api.signInAdmin(email, password);
        } catch (error) {
            msg(api.getFriendlyFirebaseError(error) || 'That email and password didn’t work.', 'error');
            btn.disabled = false; btn.textContent = 'Sign in';
        }
    });
    qs('[data-forgot]', app).addEventListener('click', async () => {
        const email = qs('#loginEmail').value.trim();
        if (!email) { msg('Type your email above first, then click “Forgot your password?”.', 'info'); qs('#loginEmail').focus(); return; }
        try {
            await api.sendAdminPasswordReset(email);
            msg(`We sent a password reset link to ${email}.`, 'success');
        } catch (error) {
            msg(api.getFriendlyFirebaseError(error) || 'Could not send the reset email.', 'error');
        }
    });
    qs('[data-reveal]', app).addEventListener('click', (event) => {
        const input = qs('#loginPassword');
        input.type = input.type === 'password' ? 'text' : 'password';
        event.currentTarget.innerHTML = icon(input.type === 'password' ? 'eye' : 'eye-off');
    });
}

/* ═══ App shell ═══ */

function navHtml() {
    return NAV.filter((item) => !item.admin || state.isAdmin).map((item) => item.section
        ? `<p class="st-nav-section">${esc(item.section)}</p>`
        : `<a href="#${item.id}" class="st-nav-link" data-nav="${item.id}">${icon(item.icon)}<span>${esc(item.label)}</span><em class="st-nav-badge" data-badge="${item.id}"></em></a>`).join('');
}

function renderShell() {
    const app = qs('#studio');
    app.className = 'st-app';
    app.innerHTML = `
        <aside class="st-sidebar" data-sidebar>
            <div class="st-brand">
                <span class="st-brand-mark"><img src="/images/brand/mmc-logo-400.webp" alt=""></span>
                <div><b>MMC Studio</b><small>Website manager</small></div>
            </div>
            <nav class="st-nav">${navHtml()}</nav>
            <div class="st-sidebar-foot">
                <a class="st-nav-link st-nav-link--muted" href="/" target="_blank" rel="noopener">${icon('external-link')}<span>View website</span></a>
                <div class="st-user">
                    <span class="st-avatar">${esc((state.user.email || '?').slice(0, 1).toUpperCase())}</span>
                    <div><b title="${esc(state.user.email)}">${esc(state.user.email)}</b><small>${state.isAdmin ? 'Administrator' : 'Staff'}</small></div>
                    <button type="button" class="st-icon-btn" data-logout title="Sign out" aria-label="Sign out">${icon('log-out')}</button>
                </div>
            </div>
        </aside>
        <div class="st-scrim" data-scrim></div>
        <div class="st-main">
            <header class="st-mobilebar">
                <button type="button" class="st-icon-btn" data-menu-toggle aria-label="Open menu">${icon('menu')}</button>
                <b>MMC Studio</b>
                <a class="st-icon-btn" href="/" target="_blank" rel="noopener" aria-label="View website">${icon('external-link')}</a>
            </header>
            <main class="st-page" id="stPage" tabindex="-1"></main>
        </div>`;

    qs('[data-logout]', app).addEventListener('click', async () => {
        if (hasUnsavedChanges()) {
            const ok = await confirmDialog({ title: 'Sign out with unsaved changes?', message: 'Your unpublished edits will be lost.', confirmText: 'Sign out', tone: 'danger' });
            if (!ok) return;
        }
        await api.signOutAdmin();
    });
    qs('[data-menu-toggle]', app).addEventListener('click', () => document.body.classList.toggle('st-nav-open'));
    qs('[data-scrim]', app).addEventListener('click', () => document.body.classList.remove('st-nav-open'));
    updateBadges();
}

function updateBadges() {
    const set = (id, text, tone) => {
        const badge = qs(`[data-badge="${id}"]`);
        if (!badge) return;
        badge.textContent = text || '';
        badge.className = 'st-nav-badge' + (tone ? ' st-nav-badge--' + tone : '');
    };
    if (state.banner && state.scheduled) {
        const live = liveBannerToday();
        set('banner', live.source !== 'none' ? 'Live' : '', 'live');
    }
    if (state.scheduled) {
        const unset = weekendSummary(state.scheduled, 4).filter((w) => !w.choice).length;
        set('weekend', unset ? String(unset) : '', 'warn');
    }
    if (state.slides) set('slides', String(state.slides.filter((s) => s.enabled).length));
}

/* ═══ Routing ═══ */

async function route() {
    let id = (location.hash || '#overview').slice(1);
    if (!pages[id] || (id === 'team' && !state.isAdmin)) id = 'overview';
    if (current && current.id === id) return;
    if (current && current.isDirty()) {
        const ok = await confirmDialog({ title: 'Leave without publishing?', message: `You have unpublished changes on ${current.title}. They will be lost if you leave.`, confirmText: 'Leave page', cancelText: 'Stay', tone: 'danger' });
        if (!ok) { history.replaceState(null, '', lastHash || '#' + current.id); return; }
    }
    if (current) current.unmount();
    // Fresh host per page so listeners from the previous page can't linger or stack up.
    const oldHost = qs('#stPage');
    const host = document.createElement('main');
    host.id = 'stPage';
    host.tabIndex = -1;
    host.className = 'st-page st-page--' + id;
    oldHost.replaceWith(host);
    current = pages[id];
    current.mount(host);
    lastHash = '#' + id;
    document.title = `${current.title} · MMC Studio`;
    qsa('[data-nav]').forEach((link) => link.classList.toggle('is-active', link.dataset.nav === id));
    document.body.classList.remove('st-nav-open');
    host.scrollTop = 0;
    window.scrollTo(0, 0);
}

/* ═══ Live data ═══ */

function connect() {
    disconnect();
    const fail = (what) => (error) => toast(`Live updates for ${what} paused: ${errorMessage(error)}`, 'error');
    unsubscribers.push(api.subscribeToHomepageSlides((slides) => setState('slides', slides), fail('slides')));
    unsubscribers.push(api.subscribeToEmergencyBanner((banner) => setState('banner', banner), fail('the banner')));
    unsubscribers.push(api.subscribeToScheduledBanners((list) => setState('scheduled', list), fail('scheduled banners')));
    if (state.isAdmin) {
        unsubscribers.push(api.subscribeToMutedRecipients((rows) => setState('muted', rows), () => {}));
        api.fetchAllAuthUsers(state.user).then((rows) => setState('users', rows)).catch(() => {});
    }
    ['banner', 'scheduled', 'slides'].forEach((k) => unsubscribers.push(subscribe(k, updateBadges)));
}

function disconnect() {
    unsubscribers.splice(0).forEach((fn) => { try { if (typeof fn === 'function') fn(); } catch (e) { /* ignore */ } });
    ['slides', 'banner', 'scheduled'].forEach((k) => { state[k] = null; });
    state.users = []; state.muted = [];
}

api.observeAuthState((user) => {
    if (current) { current.unmount(); current = null; }
    if (!user) {
        disconnect();
        state.user = null; state.isAdmin = false;
        renderLogin();
        return;
    }
    state.user = user;
    state.isAdmin = api.isAdminUser(user);
    renderShell();
    connect();
    route();
});

window.addEventListener('hashchange', () => { if (state.user) route(); });
