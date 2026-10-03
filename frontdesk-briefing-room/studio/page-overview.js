/*
 * MMC Studio — Overview: what's on the website right now, plus quick actions.
 */
import {
    esc, qs, icon, state, subscribe, liveBannerToday, isWeekendEntry, stripHtml, describeRecurrence
} from './core.js';
import { bannerPreviewHtml } from './banner-editor.js';
import { weekendSummary } from './page-weekend.js';
import { entryStatus } from './page-schedule.js';
import { thumbHtml, observeThumbs } from './page-slides.js';

const CHOICE_TEXT = { sat: 'Open Saturday', sun: 'Open Sunday', both: 'Open Sat & Sun', closed: 'Closed', '': 'Not set' };

export function createOverviewPage({ openScheduleDrawer }) {
    let root = null;
    const cleanups = [];

    function greeting() {
        const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(new Date()));
        const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        const name = state.user && state.user.email ? state.user.email.split('@')[0].split(/[._-]/)[0] : '';
        return `${part}${name ? ', ' + name.charAt(0).toUpperCase() + name.slice(1) : ''}`;
    }

    function bannerCard() {
        if (!state.banner || !state.scheduled) return '<div class="st-skeleton st-skeleton--tall"></div>';
        const live = liveBannerToday();
        const status = live.source === 'manual'
            ? '<span class="st-status-pill is-live"><span class="st-pulse"></span>Live now</span>'
            : live.source === 'scheduled'
                ? '<span class="st-status-pill is-live"><span class="st-pulse"></span>Scheduled · live today</span>'
                : '<span class="st-status-pill">No banner today</span>';
        const detail = live.source === 'scheduled'
            ? `From the schedule: <b>${esc(live.entry.label)}</b> · ${esc(describeRecurrence(live.entry))}`
            : live.source === 'manual' ? 'Turned on from the Site Banner page.' : 'The website shows no announcement strip today.';
        return `
            <div class="st-card st-ov-card st-ov-banner">
                <div class="st-ov-card-head">
                    <div><h3>${icon('megaphone')} Site banner</h3><p>${detail}</p></div>
                    ${status}
                </div>
                ${live.banner ? `<div class="st-ov-banner-preview">${bannerPreviewHtml(live.banner, { device: 'desktop' })}</div>` : ''}
                <div class="st-ov-card-foot">
                    <a class="st-btn st-btn--${live.source === 'none' ? 'primary' : 'ghost'} st-btn--sm" href="#banner">${icon(live.source === 'none' ? 'plus' : 'pencil')} ${live.source === 'none' ? 'Post a banner' : 'Edit banner'}</a>
                    <a class="st-btn st-btn--ghost st-btn--sm" href="#schedule">${icon('calendar-clock')} Scheduled banners</a>
                </div>
            </div>`;
    }

    function weekendCard() {
        if (!state.scheduled) return '<div class="st-skeleton st-skeleton--tall"></div>';
        const weeks = weekendSummary(state.scheduled, 4);
        const unset = weeks.filter((w) => !w.choice).length;
        return `
            <div class="st-card st-ov-card">
                <div class="st-ov-card-head">
                    <div><h3>${icon('calendar-days')} Weekend hours</h3><p>${unset ? `${unset} weekend${unset === 1 ? '' : 's'} still need${unset === 1 ? 's' : ''} to be set.` : 'All set for the next 4 weekends.'}</p></div>
                    ${unset ? '<span class="st-status-pill is-warn">Needs attention</span>' : '<span class="st-status-pill is-ok">All set</span>'}
                </div>
                <ul class="st-ov-weekends">
                    ${weeks.map((w, i) => `
                        <li class="${w.choice ? '' : 'is-unset'}">
                            <span>${esc(w.label)}${i === 0 ? ' <small>this weekend</small>' : ''}</span>
                            <b class="st-wk-pill st-wk-pill--${w.choice || 'unset'}">${esc(CHOICE_TEXT[w.choice || ''])}</b>
                        </li>`).join('')}
                </ul>
                <div class="st-ov-card-foot"><a class="st-btn st-btn--${unset ? 'primary' : 'ghost'} st-btn--sm" href="#weekend">${icon('calendar-days')} ${unset ? 'Set weekend hours' : 'Change weekend hours'}</a></div>
            </div>`;
    }

    function slidesCard() {
        if (!state.slides) return '<div class="st-skeleton st-skeleton--tall"></div>';
        const live = state.slides.filter((s) => s.enabled);
        return `
            <div class="st-card st-ov-card">
                <div class="st-ov-card-head">
                    <div><h3>${icon('gallery-horizontal-end')} Homepage slides</h3><p>${live.length} showing on the homepage${state.slides.length > live.length ? `, ${state.slides.length - live.length} hidden` : ''}.</p></div>
                </div>
                <div class="st-ov-thumbs">${live.slice(0, 4).map((s) => `<a href="#slides" class="st-ov-thumb">${thumbHtml(s)}</a>`).join('')}</div>
                <div class="st-ov-card-foot"><a class="st-btn st-btn--ghost st-btn--sm" href="#slides">${icon('pencil')} Edit slides</a></div>
            </div>`;
    }

    function upcomingCard() {
        if (!state.scheduled) return '<div class="st-skeleton st-skeleton--tall"></div>';
        const upcoming = state.scheduled.filter((e) => !isWeekendEntry(e)).map((e) => ({ e, s: entryStatus(e) }))
            .filter((x) => x.s.group === 'upcoming' || x.s.group === 'active' || x.s.group === 'repeat').slice(0, 4);
        return `
            <div class="st-card st-ov-card">
                <div class="st-ov-card-head"><div><h3>${icon('calendar-clock')} Coming up</h3><p>Scheduled banners (not counting weekend hours).</p></div></div>
                ${upcoming.length ? `<ul class="st-ov-list">${upcoming.map(({ e, s }) => `
                    <li><span class="st-tone-dot" data-tone="${esc(e.banner.color)}"></span>
                        <div><b>${esc(e.label)}</b><small>${esc(s.label)} · ${esc(stripHtml(e.banner.message.en).slice(0, 70))}</small></div></li>`).join('')}</ul>`
                    : '<p class="st-empty-line">Nothing scheduled. Plan ahead for the next holiday.</p>'}
                <div class="st-ov-card-foot"><button type="button" class="st-btn st-btn--ghost st-btn--sm" data-holiday>${icon('party-popper')} Schedule a holiday closure</button></div>
            </div>`;
    }

    function render() {
        if (!root) return;
        qs('[data-grid]', root).innerHTML = bannerCard() + weekendCard() + slidesCard() + upcomingCard();
        observeThumbs(root);
    }

    return {
        id: 'overview',
        title: 'Overview',
        isDirty: () => false,
        mount(container) {
            root = container;
            const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }).format(new Date());
            root.innerHTML = `
                <div class="st-page-head st-page-head--hello">
                    <div><p class="st-eyebrow">${esc(date)}</p><h1>${esc(greeting())}</h1><p>Here's what's on mmccare.com right now.</p></div>
                    <a class="st-btn st-btn--ghost" href="/" target="_blank" rel="noopener">${icon('external-link')} Open the website</a>
                </div>
                <div class="st-quick-actions">
                    <a href="#banner" class="st-qa"><span class="st-qa-icon st-qa-icon--red">${icon('megaphone')}</span><b>Post an announcement</b><small>Closures, delays, good news</small></a>
                    <button type="button" class="st-qa" data-holiday><span class="st-qa-icon st-qa-icon--orange">${icon('party-popper')}</span><b>Plan a holiday closure</b><small>Shows and hides itself</small></button>
                    <a href="#weekend" class="st-qa"><span class="st-qa-icon st-qa-icon--green">${icon('calendar-days')}</span><b>Set weekend hours</b><small>Saturday or Sunday</small></a>
                    <a href="#slides" class="st-qa"><span class="st-qa-icon st-qa-icon--blue">${icon('gallery-horizontal-end')}</span><b>Update homepage slides</b><small>23 ready-made designs</small></a>
                </div>
                <div class="st-ov-grid" data-grid></div>`;
            render();
            ['banner', 'scheduled', 'slides'].forEach((k) => cleanups.push(subscribe(k, render)));
            root.addEventListener('click', (event) => {
                if (event.target.closest('[data-holiday]')) openScheduleDrawer({ starterId: 'holiday' });
            });
        },
        unmount() { cleanups.splice(0).forEach((fn) => fn()); root = null; }
    };
}
