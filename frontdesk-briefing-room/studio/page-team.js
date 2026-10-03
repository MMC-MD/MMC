/*
 * MMC Studio — Team (admins only): members, reminder emails, muted emails.
 */
import {
    esc, qs, qsa, icon, state, subscribe, setState, toast, errorMessage, confirmDialog,
    timeAgo, formatDate
} from './core.js';

const ADMIN_LIST = ['efikess@gmail.com', 'bendoryair@gmail.com'];

function parseEmails(raw) {
    return String(raw || '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

function initials(email) {
    const name = String(email || '?').split('@')[0].replace(/[._-]+/g, ' ').trim();
    const parts = name.split(' ').filter(Boolean);
    return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export function createTeamPage({ api }) {
    let root = null;
    let tab = 'members';
    let loadingUsers = false;
    const cleanups = [];

    async function refreshUsers() {
        if (!state.isAdmin) return;
        loadingUsers = true; render();
        try {
            setState('users', await api.fetchAllAuthUsers(state.user));
        } catch (error) {
            toast(errorMessage(error, 'Could not load the team list.'), 'error');
        } finally {
            loadingUsers = false; render();
        }
    }

    function allRecipients() {
        const muted = new Set((state.muted || []).map((m) => m.email));
        const out = [];
        ADMIN_LIST.concat((state.users || []).filter((u) => u && u.email && !u.disabled).map((u) => u.email))
            .forEach((e) => { if (!muted.has(e) && out.indexOf(e) === -1) out.push(e); });
        return out;
    }

    function membersHtml() {
        const users = state.users || [];
        const rows = users.length ? users.map((u) => `
            <div class="st-member ${u.disabled ? 'is-disabled' : ''}">
                <span class="st-avatar">${esc(initials(u.email))}</span>
                <div class="st-member-text">
                    <div class="st-member-name">${esc(u.email || '(unknown)')}
                        ${u.isAdmin ? '<span class="st-badge st-badge--blue">Admin</span>' : ''}
                        ${u.disabled ? '<span class="st-badge st-badge--red">Disabled</span>' : '<span class="st-badge st-badge--green">Active</span>'}
                        ${u.isMuted ? '<span class="st-badge st-badge--warn">Reminders muted</span>' : ''}
                    </div>
                    <small>${u.invitedBy ? 'Invited by ' + esc(u.invitedBy) : ''}${u.invitedAt ? (u.invitedBy ? ' · ' : 'Invited ') + esc(timeAgo(u.invitedAt)) : ''}</small>
                </div>
                <div class="st-member-actions">
                    <button type="button" class="st-btn st-btn--ghost st-btn--sm" data-reset="${esc(u.email)}">${icon('key-round')} Reset password</button>
                    ${u.isAdmin ? '' : u.disabled
                        ? `<button type="button" class="st-btn st-btn--ghost st-btn--sm" data-enable="${esc(u.uid)}" data-email="${esc(u.email)}">${icon('user-check')} Re-enable</button>`
                        : `<button type="button" class="st-btn st-btn--ghost st-btn--sm" data-disable="${esc(u.uid)}" data-email="${esc(u.email)}">${icon('user-x')} Disable</button>`}
                    ${u.isAdmin ? '' : `<button type="button" class="st-icon-btn st-icon-btn--danger" data-remove="${esc(u.uid)}" data-email="${esc(u.email)}" title="Remove">${icon('trash-2')}</button>`}
                </div>
            </div>`).join('')
            : (loadingUsers ? '<div class="st-skeleton"></div><div class="st-skeleton"></div>' : '<p class="st-empty-line">No team members found.</p>');
        return `
            <section class="st-card st-section">
                <div class="st-section-head"><h3>Invite someone</h3><p>They get an email to set their own password, then can sign in here.</p></div>
                <form class="st-inline-form" data-invite>
                    <input class="st-input" type="email" required placeholder="teammate@mmccare.com" data-invite-email autocomplete="off">
                    <button type="submit" class="st-btn st-btn--primary">${icon('send')} Send invite</button>
                </form>
            </section>
            <section class="st-card st-section">
                <div class="st-section-head st-section-head--row">
                    <div><h3>Team members <span class="st-count">${(state.users || []).length || ''}</span></h3><p>Admins are set by the system and can't be disabled here.</p></div>
                    <button type="button" class="st-btn st-btn--ghost st-btn--sm" data-refresh>${icon('rotate-ccw')} Refresh</button>
                </div>
                <div class="st-members">${rows}</div>
            </section>`;
    }

    function remindersHtml() {
        const holidays = state.holidays;
        const n = allRecipients().length;
        return `
            <section class="st-card st-section">
                <div class="st-section-head"><h3>${icon('calendar-days')} Weekend schedule reminder</h3>
                    <p>Sent automatically Wednesday–Friday if this weekend isn't set. Send one now to test or nudge people.</p></div>
                <form class="st-stack" data-weekend-form>
                    <input class="st-input" type="text" placeholder="Emails, separated by commas" data-weekend-to>
                    <div class="st-btn-row">
                        <button type="submit" class="st-btn st-btn--ghost">Send to these emails</button>
                        <button type="button" class="st-btn st-btn--primary" data-weekend-all>${icon('send')} Send to everyone (${n})</button>
                    </div>
                </form>
            </section>
            <section class="st-card st-section">
                <div class="st-section-head"><h3>${icon('party-popper')} Holiday reminder</h3>
                    <p>Sent automatically 2 days before each holiday. Pick a holiday to send one now.</p></div>
                <form class="st-stack" data-holiday-form>
                    <select class="st-input" data-holiday-pick>
                        <option value="">${holidays ? 'Next upcoming holiday' : 'Loading holidays…'}</option>
                        ${(holidays || []).map((h) => `<option value="${esc(h.date)}">${esc(h.name)} — ${esc(formatDate(h.date, { year: true }))}</option>`).join('')}
                    </select>
                    <input class="st-input" type="text" placeholder="Emails, separated by commas" data-holiday-to>
                    <div class="st-btn-row">
                        <button type="submit" class="st-btn st-btn--ghost">Send to these emails</button>
                        <button type="button" class="st-btn st-btn--primary" data-holiday-all>${icon('send')} Send to everyone (${n})</button>
                    </div>
                </form>
            </section>`;
    }

    function mutedHtml() {
        const muted = state.muted || [];
        return `
            <section class="st-card st-section">
                <div class="st-section-head"><h3>Mute reminder emails</h3><p>Muted people won't get automatic weekend or holiday reminders.</p></div>
                <form class="st-inline-form" data-mute>
                    <input class="st-input" type="email" required placeholder="someone@example.com" data-mute-email>
                    <input class="st-input" type="text" placeholder="Note (optional), e.g. on leave" data-mute-note>
                    <button type="submit" class="st-btn st-btn--primary">${icon('bell-off')} Mute</button>
                </form>
            </section>
            <section class="st-card st-section">
                <div class="st-section-head"><h3>Currently muted <span class="st-count">${muted.length || ''}</span></h3></div>
                <div class="st-members">
                    ${muted.length ? muted.map((m) => `
                        <div class="st-member">
                            <span class="st-avatar st-avatar--muted">${icon('bell-off')}</span>
                            <div class="st-member-text"><div class="st-member-name">${esc(m.email)}</div>
                                <small>${esc(m.note || '')}${m.mutedBy ? (m.note ? ' · ' : '') + 'by ' + esc(m.mutedBy) : ''}${m.mutedAt ? ' · ' + esc(timeAgo(m.mutedAt)) : ''}</small></div>
                            <div class="st-member-actions"><button type="button" class="st-btn st-btn--ghost st-btn--sm" data-unmute="${esc(m.email)}">Unmute</button></div>
                        </div>`).join('') : '<p class="st-empty-line">Nobody is muted — reminders go to the whole team.</p>'}
                </div>
            </section>`;
    }

    function render() {
        if (!root) return;
        qsa('[data-tab]', root).forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
        const panel = qs('[data-panel]', root);
        const active = document.activeElement;
        const keep = active && panel.contains(active) && active.matches('input') ? { sel: active.getAttribute('data-invite-email') !== null ? '[data-invite-email]' : null, value: active.value } : null;
        panel.innerHTML = tab === 'members' ? membersHtml() : tab === 'reminders' ? remindersHtml() : mutedHtml();
        if (keep && keep.sel) { const input = qs(keep.sel, panel); if (input) { input.value = keep.value; input.focus(); } }
    }

    async function sendWeekend(recipients) {
        if (!recipients.length) { toast('Add at least one valid email.', 'error'); return; }
        try {
            const result = await api.sendManualReminder(recipients, state.user);
            const count = (result.recipients || recipients).length;
            const covered = result.saturday && result.sunday && result.saturday.covered && result.sunday.covered;
            toast(`Reminder sent to ${count} ${count === 1 ? 'person' : 'people'}.${covered ? ' This weekend is already set, so the email says so.' : ''}`);
        } catch (error) { toast(errorMessage(error, 'Could not send the reminder.'), 'error'); }
    }

    async function sendHoliday(recipients) {
        if (!recipients.length) { toast('Add at least one valid email.', 'error'); return; }
        const date = qs('[data-holiday-pick]', root).value;
        try {
            const result = await api.sendHolidayReminder(recipients, date, state.user);
            const name = result.holiday && result.holiday.name ? result.holiday.name : 'the holiday';
            const count = (result.recipients || recipients).length;
            toast(`Reminder for ${name} sent to ${count} ${count === 1 ? 'person' : 'people'}.`);
        } catch (error) { toast(errorMessage(error, 'Could not send the holiday reminder.'), 'error'); }
    }

    return {
        id: 'team',
        title: 'Team',
        isDirty: () => false,
        mount(container) {
            root = container;
            root.innerHTML = `
                <div class="st-page-head">
                    <div><h1>Team</h1><p>Who can sign in to MMC Studio, and who gets reminder emails.</p></div>
                </div>
                <div class="st-tabs">
                    <button type="button" data-tab="members">${icon('users')} Members</button>
                    <button type="button" data-tab="reminders">${icon('mail')} Reminder emails</button>
                    <button type="button" data-tab="muted">${icon('bell-off')} Muted emails</button>
                </div>
                <div data-panel class="st-team-panel"></div>`;
            render();
            if (!state.users || !state.users.length) refreshUsers();
            if (!state.holidays) {
                api.fetchUpcomingHolidays(180).then((list) => { state.holidays = list || []; if (tab === 'reminders') render(); })
                    .catch(() => { state.holidays = []; });
            }
            cleanups.push(subscribe('muted', render));
            cleanups.push(subscribe('users', render));

            root.addEventListener('click', async (event) => {
                const t = event.target;
                const tb = t.closest('[data-tab]');
                if (tb) { tab = tb.dataset.tab; render(); return; }
                if (t.closest('[data-refresh]')) refreshUsers();
                const reset = t.closest('[data-reset]');
                const disable = t.closest('[data-disable]');
                const enable = t.closest('[data-enable]');
                const remove = t.closest('[data-remove]');
                const unmute = t.closest('[data-unmute]');
                try {
                    if (reset) {
                        await api.sendUserPasswordReset(reset.dataset.reset);
                        toast(`Password reset email sent to ${reset.dataset.reset}.`);
                    }
                    if (disable) {
                        const ok = await confirmDialog({ title: `Disable ${disable.dataset.email}?`, message: 'They won’t be able to make changes until you re-enable them.', confirmText: 'Disable', tone: 'danger' });
                        if (!ok) return;
                        await api.setUserDisabled(disable.dataset.disable, true, state.user, disable.dataset.email);
                        toast('Account disabled.'); refreshUsers();
                    }
                    if (enable) {
                        await api.setUserDisabled(enable.dataset.enable, false, state.user, enable.dataset.email);
                        toast('Account re-enabled.'); refreshUsers();
                    }
                    if (remove) {
                        const ok = await confirmDialog({ title: `Remove ${remove.dataset.email}?`, message: 'This permanently deletes their login. They can only come back if you invite them again.', confirmText: 'Remove', tone: 'danger' });
                        if (!ok) return;
                        try { await api.setUserDisabled(remove.dataset.remove, true, state.user, remove.dataset.email); } catch (e) { /* auth delete is the source of truth */ }
                        await api.deleteUserAccount(remove.dataset.remove, remove.dataset.email, state.user);
                        toast('Removed.'); refreshUsers();
                    }
                    if (unmute) {
                        await api.unmuteRecipient(unmute.dataset.unmute, state.user);
                        toast(`${unmute.dataset.unmute} will get reminders again.`);
                    }
                    if (t.closest('[data-weekend-all]')) {
                        const list = allRecipients();
                        const ok = await confirmDialog({ title: 'Send the weekend reminder?', message: `It goes to ${list.length} ${list.length === 1 ? 'person' : 'people'} (muted emails are skipped).`, confirmText: 'Send' });
                        if (ok) sendWeekend(list);
                    }
                    if (t.closest('[data-holiday-all]')) {
                        const list = allRecipients();
                        const pick = qs('[data-holiday-pick]', root);
                        const label = pick.selectedOptions[0] ? pick.selectedOptions[0].text : 'the next holiday';
                        const ok = await confirmDialog({ title: 'Send the holiday reminder?', message: `A reminder for “${label}” goes to ${list.length} ${list.length === 1 ? 'person' : 'people'}.`, confirmText: 'Send' });
                        if (ok) sendHoliday(list);
                    }
                } catch (error) {
                    toast(errorMessage(error, 'That didn’t work. Please try again.'), 'error');
                }
            });
            root.addEventListener('submit', async (event) => {
                event.preventDefault();
                const f = event.target;
                try {
                    if (f.matches('[data-invite]')) {
                        const email = qs('[data-invite-email]', f).value.trim();
                        if (!email) return;
                        const result = await api.inviteUser(email, state.user);
                        toast(`Invite sent to ${result.email || email}.`);
                        qs('[data-invite-email]', f).value = '';
                        refreshUsers();
                    }
                    if (f.matches('[data-mute]')) {
                        const email = qs('[data-mute-email]', f).value.trim();
                        await api.muteRecipient(email, qs('[data-mute-note]', f).value.trim(), state.user);
                        toast(`${email} won't get reminder emails.`);
                    }
                    if (f.matches('[data-weekend-form]')) sendWeekend(parseEmails(qs('[data-weekend-to]', f).value));
                    if (f.matches('[data-holiday-form]')) sendHoliday(parseEmails(qs('[data-holiday-to]', f).value));
                } catch (error) {
                    const code = error && error.code;
                    toast(code === 'auth/email-already-in-use'
                        ? 'That email already has an account. Use “Reset password” if they need access.'
                        : errorMessage(error, 'That didn’t work. Please try again.'), 'error');
                }
            });
        },
        unmount() {
            cleanups.splice(0).forEach((fn) => fn());
            root = null;
        }
    };
}
