/**
 * Holiday calendar.
 *
 * Federal and secular holidays are computed from rules (deterministic forever).
 * Jewish holidays come from a generated table in jewish-holidays.ts (currently
 * covers 2026-2040; regenerate with scripts/gen-jewish-holidays.sh).
 *
 * Each holiday has:
 *   - key:  stable id (e.g. 'thanksgiving')
 *   - name: human-readable name shown in the email
 *   - date: YYYY-MM-DD in the office's local time zone (America/New_York)
 *
 * The reminder fires when a holiday is exactly 2 days from "today" in ET.
 */

import { JEWISH_HOLIDAYS, JewishHolidayEntry } from './jewish-holidays';

export interface Holiday {
    date: string;     // YYYY-MM-DD
    key: string;
    name: string;
    /** "federal" / "jewish" / "observance" — used in email copy. */
    category: 'federal' | 'jewish' | 'observance';
}

/* ──────────────────────────────────────────────
   Date helpers (no timezones — these are
   "office calendar dates" already in ET)
   ────────────────────────────────────────────── */

function ymd(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dayOfWeek(year: number, month: number, day: number): number {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
}

// "n-th weekday in a month": e.g., 3rd Monday in January.
// occurrence = 1..5; weekday = 0..6 (Sunday..Saturday)
function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number): string {
    const firstDow = dayOfWeek(year, month, 1);
    const offset = (weekday - firstDow + 7) % 7;
    const day = 1 + offset + (occurrence - 1) * 7;
    return ymd(year, month, day);
}

// "Last weekday of a month": e.g., last Monday in May.
function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
    // Find the last day of the month.
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastDow = dayOfWeek(year, month, lastDay);
    const back = (lastDow - weekday + 7) % 7;
    return ymd(year, month, lastDay - back);
}

// Federal observance shift: a fixed-date holiday that lands on Saturday is
// observed Friday; on Sunday, observed Monday. This is what the office staff
// would actually take off, so we use the observed date for the reminder.
function shiftedObservance(year: number, month: number, day: number): string {
    const dow = dayOfWeek(year, month, day);
    if (dow === 6) {
        // Saturday → Friday before
        const d = new Date(Date.UTC(year, month - 1, day));
        d.setUTCDate(d.getUTCDate() - 1);
        return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    if (dow === 0) {
        // Sunday → Monday after
        const d = new Date(Date.UTC(year, month - 1, day));
        d.setUTCDate(d.getUTCDate() + 1);
        return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return ymd(year, month, day);
}

// Easter Sunday — Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
// Deterministic forever for the Gregorian calendar.
function easterSunday(year: number): { year: number; month: number; day: number } {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return { year, month, day };
}

function goodFriday(year: number): string {
    const e = easterSunday(year);
    const d = new Date(Date.UTC(e.year, e.month - 1, e.day));
    d.setUTCDate(d.getUTCDate() - 2);
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/* ──────────────────────────────────────────────
   Rule-based holidays for one Gregorian year
   ────────────────────────────────────────────── */

function federalAndSecularForYear(year: number): Holiday[] {
    const out: Holiday[] = [];

    out.push({
        date: shiftedObservance(year, 1, 1),
        key: 'new-years-day',
        name: "New Year's Day",
        category: 'federal'
    });
    out.push({
        date: nthWeekdayOfMonth(year, 1, 1, 3),
        key: 'mlk-day',
        name: 'Martin Luther King Jr. Day',
        category: 'federal'
    });
    out.push({
        date: nthWeekdayOfMonth(year, 2, 1, 3),
        key: 'presidents-day',
        name: "Presidents' Day",
        category: 'federal'
    });
    out.push({
        date: goodFriday(year),
        key: 'good-friday',
        name: 'Good Friday',
        category: 'observance'
    });
    out.push({
        date: lastWeekdayOfMonth(year, 5, 1),
        key: 'memorial-day',
        name: 'Memorial Day',
        category: 'federal'
    });
    out.push({
        date: shiftedObservance(year, 6, 19),
        key: 'juneteenth',
        name: 'Juneteenth',
        category: 'federal'
    });
    out.push({
        date: shiftedObservance(year, 7, 4),
        key: 'independence-day',
        name: 'Independence Day',
        category: 'federal'
    });
    out.push({
        date: nthWeekdayOfMonth(year, 9, 1, 1),
        key: 'labor-day',
        name: 'Labor Day',
        category: 'federal'
    });
    out.push({
        date: shiftedObservance(year, 11, 11),
        key: 'veterans-day',
        name: 'Veterans Day',
        category: 'federal'
    });
    // Thanksgiving is the 4th Thursday of November.
    const thanksgiving = nthWeekdayOfMonth(year, 11, 4, 4);
    out.push({
        date: thanksgiving,
        key: 'thanksgiving',
        name: 'Thanksgiving',
        category: 'federal'
    });
    // Day after Thanksgiving (the Friday) — schools closed, most offices.
    const tgDate = new Date(thanksgiving + 'T00:00:00Z');
    tgDate.setUTCDate(tgDate.getUTCDate() + 1);
    out.push({
        date: ymd(tgDate.getUTCFullYear(), tgDate.getUTCMonth() + 1, tgDate.getUTCDate()),
        key: 'day-after-thanksgiving',
        name: 'Day After Thanksgiving',
        category: 'observance'
    });
    out.push({
        date: ymd(year, 12, 24),
        key: 'christmas-eve',
        name: 'Christmas Eve',
        category: 'observance'
    });
    out.push({
        date: shiftedObservance(year, 12, 25),
        key: 'christmas',
        name: 'Christmas Day',
        category: 'federal'
    });
    out.push({
        date: ymd(year, 12, 31),
        key: 'new-years-eve',
        name: "New Year's Eve",
        category: 'observance'
    });

    return out;
}

/* ──────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────── */

export function holidaysForYear(year: number): Holiday[] {
    const ruleBased = federalAndSecularForYear(year);
    const jewish: Holiday[] = JEWISH_HOLIDAYS
        .filter((h: JewishHolidayEntry) => h.date.startsWith(String(year)))
        .map((h: JewishHolidayEntry) => ({
            date: h.date,
            key: h.key,
            name: h.name,
            category: 'jewish' as const
        }));
    return [...ruleBased, ...jewish].sort((a, b) => a.date.localeCompare(b.date));
}

// Find a holiday landing exactly on the given target date.
// Returns null if none. Returns the *first* match if multiple holidays
// share the same date (rare but possible: e.g. a Jewish holiday landing
// on the same day as a federal one).
export function holidayOnDate(targetYmd: string): Holiday | null {
    const year = parseInt(targetYmd.slice(0, 4), 10);
    if (isNaN(year)) return null;
    const list = holidaysForYear(year);
    for (const h of list) {
        if (h.date === targetYmd) return h;
    }
    return null;
}

// Check whether the given target date is covered by any banner that already
// exists. We expect callers to pass in their banner-coverage check function
// rather than reimplement the recurrence logic here.
export function isHolidayCovered(
    holiday: Holiday,
    isCovered: (ymd: string) => boolean
): boolean {
    return isCovered(holiday.date);
}
