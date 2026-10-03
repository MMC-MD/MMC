/*
 * Smart weekend hours
 * -------------------
 * The clinic opens one weekend day at a time (Sat or Sun, 8 AM - 1 PM). The
 * front desk marks each weekend day open/closed in the Front Desk Briefing Room
 * weekend calendar, which saves docs to `scheduledBanners` labelled e.g.
 * "Saturday Open – 2026-10-03". This script reads those docs and keeps three
 * places in sync:
 *   1. Top contact bar  - "Open this Sat 8am-1pm" + hover/tap popover (next 4 weekends)
 *   2. Contact modal     - this weekend's days + upcoming weekends
 *   3. Footer hours      - one-line summary
 *
 * Uses the Firestore REST API (one small request, no SDK) and caches the result
 * in localStorage so returning visitors get the right text with no flash.
 * All date logic runs in clinic time (America/New_York).
 */
(function () {
    'use strict';

    var FIRESTORE_QUERY_URL = 'https://firestore.googleapis.com/v1/projects/mmcblog-6573f/databases/(default)/documents:runQuery?key=AIzaSyApTW8VY94FYUzqqliUkaqwJQI9742_5b4';
    var CACHE_KEY = 'mmc-weekend-hours-v1';
    var CACHE_MAX_AGE = 7 * 86400000;      // still usable for first paint
    var REFRESH_AFTER = 10 * 60000;        // refetch when tab regains focus after this
    var CLINIC_TZ = 'America/New_York';
    var WEEKEND_CLOSE_HOUR = 13;           // weekend hours end at 1 PM
    var WEEKEND_OPEN_HOUR = 8;
    var WEEKENDS_SHOWN = 4;
    var LABEL_RE = /^(Saturday|Sunday)\s+(Open|Closed)\s+–\s+(\d{4}-\d{2}-\d{2})$/;

    var T = {
        en: {
            hoursShort: '8am-1pm',
            hoursLong: '8 AM – 1 PM',
            sat: 'Sat', sun: 'Sun', satLong: 'Saturday', sunLong: 'Sunday', bothLong: 'Saturday & Sunday',
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            openNow: 'Open today until 1pm',
            openToday: 'Open today 8am–1pm',
            openTomorrow: 'Open tomorrow 8am–1pm',
            openThis: function (d) { return 'Open this ' + d + ' 8am–1pm'; },
            openNext: function (d) { return 'Open next ' + d + ' 8am–1pm'; },
            openBoth: 'Open Sat & Sun 8am–1pm',
            closedThis: 'Closed this weekend',
            closedNext: 'Closed next weekend',
            varies: 'Weekend hours vary',
            open: 'Open', closed: 'Closed', tbd: 'Call to confirm',
            today: 'Today',
            thisWeekend: 'This weekend',
            nextWeekend: 'Next weekend',
            popTitle: 'Office hours',
            monThu: 'Monday – Thursday', friday: 'Friday',
            weekdayHours: ['8 AM – 7 PM', '8 AM – 6 PM'],
            popSub: 'Weekends · open one day, 8 AM – 1 PM',
            popNote: 'Holiday hours may differ. Questions?',
            tbdLong: 'To be confirmed',
            upcoming: 'Upcoming weekends',
            footerThis: 'This weekend',
            footerNext: 'Next weekend',
            and: '&',
            popLabel: 'Upcoming weekend hours'
        },
        fr: {
            hoursShort: '8h-13h', hoursLong: '8 h – 13 h',
            sat: 'Sam.', sun: 'Dim.', satLong: 'Samedi', sunLong: 'Dimanche', bothLong: 'Samedi et dimanche',
            months: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
            openNow: 'Ouvert aujourd’hui jusqu’à 13 h', openToday: 'Ouvert aujourd’hui 8 h–13 h', openTomorrow: 'Ouvert demain 8 h–13 h',
            openThis: function (d) { return 'Ouvert ce ' + d.toLowerCase() + ' 8 h–13 h'; },
            openNext: function (d) { return 'Ouvert le ' + d.toLowerCase() + ' prochain 8 h–13 h'; },
            openBoth: 'Ouvert sam. et dim. 8 h–13 h', closedThis: 'Fermé ce week-end', closedNext: 'Fermé le week-end prochain',
            varies: 'Horaires du week-end variables', open: 'Ouvert', closed: 'Fermé', tbd: 'Appelez pour confirmer',
            today: 'Aujourd’hui', thisWeekend: 'Ce week-end', nextWeekend: 'Week-end prochain',
            popTitle: 'Heures d’ouverture', monThu: 'Lundi – jeudi', friday: 'Vendredi', weekdayHours: ['8 h – 19 h', '8 h – 18 h'],
            popSub: 'Week-ends · ouvert un jour, 8 h – 13 h', popNote: 'Les horaires peuvent changer les jours fériés. Des questions ?',
            tbdLong: 'À confirmer', upcoming: 'Prochains week-ends', footerThis: 'Ce week-end', footerNext: 'Week-end prochain',
            and: 'et', popLabel: 'Horaires des prochains week-ends'
        },
        ar: {
            hoursShort: '8ص-1م', hoursLong: '8 ص – 1 م',
            sat: 'السبت', sun: 'الأحد', satLong: 'السبت', sunLong: 'الأحد', bothLong: 'السبت والأحد',
            months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
            openNow: 'مفتوح اليوم حتى 1 م', openToday: 'مفتوح اليوم 8 ص–1 م', openTomorrow: 'مفتوح غدًا 8 ص–1 م',
            openThis: function (d) { return 'مفتوح هذا ' + d + ' 8 ص–1 م'; },
            openNext: function (d) { return 'مفتوح ' + d + ' القادم 8 ص–1 م'; },
            openBoth: 'مفتوح السبت والأحد 8 ص–1 م', closedThis: 'مغلق في عطلة نهاية هذا الأسبوع', closedNext: 'مغلق في عطلة نهاية الأسبوع القادم',
            varies: 'مواعيد عطلة نهاية الأسبوع متغيرة', open: 'مفتوح', closed: 'مغلق', tbd: 'اتصل للتأكيد',
            today: 'اليوم', thisWeekend: 'نهاية هذا الأسبوع', nextWeekend: 'نهاية الأسبوع القادم',
            popTitle: 'ساعات العمل', monThu: 'الاثنين – الخميس', friday: 'الجمعة', weekdayHours: ['8 ص – 7 م', '8 ص – 6 م'],
            popSub: 'عطلة نهاية الأسبوع · مفتوح يومًا واحدًا، 8 ص – 1 م', popNote: 'قد تختلف المواعيد في العطلات الرسمية. هل لديك أسئلة؟',
            tbdLong: 'سيتم التأكيد', upcoming: 'عطلات نهاية الأسبوع القادمة', footerThis: 'نهاية هذا الأسبوع', footerNext: 'نهاية الأسبوع القادم',
            and: 'و', popLabel: 'مواعيد عطلات نهاية الأسبوع القادمة'
        },
        he: {
            hoursShort: '8:00-13:00', hoursLong: '8:00 – 13:00',
            sat: 'שבת', sun: 'ראשון', satLong: 'שבת', sunLong: 'יום ראשון', bothLong: 'שבת וראשון',
            months: ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'],
            openNow: 'פתוח היום עד 13:00', openToday: 'פתוח היום 8:00–13:00', openTomorrow: 'פתוח מחר 8:00–13:00',
            openThis: function (d) { return 'פתוח ב' + d + ' הקרוב 8:00–13:00'; },
            openNext: function (d) { return 'פתוח ב' + d + ' הבא 8:00–13:00'; },
            openBoth: 'פתוח בשבת ובראשון 8:00–13:00', closedThis: 'סגור בסוף השבוע הזה', closedNext: 'סגור בסוף השבוע הבא',
            varies: 'שעות סוף השבוע משתנות', open: 'פתוח', closed: 'סגור', tbd: 'התקשרו לאישור',
            today: 'היום', thisWeekend: 'סוף השבוע הזה', nextWeekend: 'סוף השבוע הבא',
            popTitle: 'שעות פעילות', monThu: 'שני – חמישי', friday: 'שישי', weekdayHours: ['8:00 – 19:00', '8:00 – 18:00'],
            popSub: 'סופי שבוע · פתוח יום אחד, 8:00 – 13:00', popNote: 'השעות עשויות להשתנות בחגים. שאלות?',
            tbdLong: 'טרם נקבע', upcoming: 'סופי השבוע הקרובים', footerThis: 'סוף השבוע הזה', footerNext: 'סוף השבוע הבא',
            and: 'ו', popLabel: 'שעות סופי השבוע הקרובים'
        },
        zh: {
            hoursShort: '上午8点-下午1点', hoursLong: '上午 8 点 – 下午 1 点',
            sat: '周六', sun: '周日', satLong: '星期六', sunLong: '星期日', bothLong: '星期六和星期日',
            months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            openNow: '今天营业至下午 1 点', openToday: '今天营业 上午 8 点–下午 1 点', openTomorrow: '明天营业 上午 8 点–下午 1 点',
            openThis: function (d) { return '本' + d + '营业 上午 8 点–下午 1 点'; },
            openNext: function (d) { return '下' + d + '营业 上午 8 点–下午 1 点'; },
            openBoth: '周六和周日营业 上午 8 点–下午 1 点', closedThis: '本周末休息', closedNext: '下周末休息',
            varies: '周末营业时间不定', open: '营业', closed: '休息', tbd: '请致电确认',
            today: '今天', thisWeekend: '本周末', nextWeekend: '下周末',
            popTitle: '营业时间', monThu: '周一 – 周四', friday: '周五', weekdayHours: ['上午 8 点 – 晚上 7 点', '上午 8 点 – 下午 6 点'],
            popSub: '周末 · 只开放一天，上午 8 点 – 下午 1 点', popNote: '节假日营业时间可能不同。有疑问？',
            tbdLong: '待确认', upcoming: '近期周末', footerThis: '本周末', footerNext: '下周末',
            and: '和', popLabel: '近期周末营业时间'
        },
        es: {
            hoursShort: '8am-1pm',
            hoursLong: '8 AM – 1 PM',
            sat: 'Sáb', sun: 'Dom', satLong: 'Sábado', sunLong: 'Domingo', bothLong: 'Sábado y domingo',
            months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
            openNow: 'Abierto hoy hasta la 1pm',
            openToday: 'Abierto hoy 8am–1pm',
            openTomorrow: 'Abierto mañana 8am–1pm',
            openThis: function (d) { return 'Abierto este ' + d.toLowerCase() + ' 8am–1pm'; },
            openNext: function (d) { return 'Abierto el próximo ' + d.toLowerCase() + ' 8am–1pm'; },
            openBoth: 'Abierto sáb y dom 8am–1pm',
            closedThis: 'Cerrado este fin de semana',
            closedNext: 'Cerrado el próximo fin de semana',
            varies: 'Horario de fin de semana varía',
            open: 'Abierto', closed: 'Cerrado', tbd: 'Llame para confirmar',
            today: 'Hoy',
            thisWeekend: 'Este fin de semana',
            nextWeekend: 'Próximo fin de semana',
            popTitle: 'Horario de atención',
            monThu: 'Lunes – jueves', friday: 'Viernes',
            weekdayHours: ['8 AM – 7 PM', '8 AM – 6 PM'],
            popSub: 'Fines de semana · abrimos un día, 8 AM – 1 PM',
            popNote: 'El horario puede variar en días festivos. ¿Preguntas?',
            tbdLong: 'Por confirmar',
            upcoming: 'Próximos fines de semana',
            footerThis: 'Este fin de semana',
            footerNext: 'Próximo fin de semana',
            and: 'y',
            popLabel: 'Horario de los próximos fines de semana'
        }
    };

    var dayStatus = {};   // 'YYYY-MM-DD' -> 'open' | 'closed'
    var hasData = false;
    var lastFetch = 0;
    var fetching = false;

    /* ── Dates (all in clinic time) ── */

    function clinicNow() {
        var parts = {};
        try {
            new Intl.DateTimeFormat('en-US', {
                timeZone: CLINIC_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', hourCycle: 'h23'
            }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
        } catch (e) {
            var d = new Date();
            parts = { year: String(d.getFullYear()), month: pad(d.getMonth() + 1), day: pad(d.getDate()), hour: String(d.getHours()) };
        }
        var key = parts.year + '-' + parts.month + '-' + parts.day;
        return { key: key, hour: parseInt(parts.hour, 10) % 24, dow: keyToDate(key).getUTCDay() };
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function keyToDate(key) {
        var p = key.split('-');
        return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    }

    function addDays(key, n) {
        var d = keyToDate(key);
        d.setUTCDate(d.getUTCDate() + n);
        return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    }

    function buildWeekends(now) {
        var firstSat = now.dow === 6 ? now.key : now.dow === 0 ? addDays(now.key, -1) : addDays(now.key, 6 - now.dow);
        var isWeekendToday = now.dow === 6 || now.dow === 0;
        var weekends = [];

        for (var i = 0; weekends.length < WEEKENDS_SHOWN && i < WEEKENDS_SHOWN + 1; i++) {
            var sat = addDays(firstSat, 7 * i);
            var days = [sat, addDays(sat, 1)].map(function (key, idx) {
                return {
                    key: key,
                    isSat: idx === 0,
                    status: dayStatus[key] || null,
                    isToday: key === now.key,
                    isPast: key < now.key || (key === now.key && now.hour >= WEEKEND_CLOSE_HOUR)
                };
            });
            // Look ahead once nothing is left to be open this weekend
            // (e.g. Saturday afternoon after our Saturday hours, Sunday closed).
            var remaining = days.filter(function (d) { return !d.isPast; });
            if (!remaining.length || (remaining.length < 2 && remaining.every(function (d) { return d.status === 'closed'; }))) continue;
            weekends.push({ sat: sat, days: days, isCurrent: isWeekendToday && sat === firstSat });
        }
        return weekends;
    }

    /* ── Copy ── */

    function lang() {
        try {
            if (localStorage.getItem('mmc-lang') === 'es') return 'es';
        } catch (e) { /* storage blocked */ }
        var site = document.documentElement.getAttribute('data-pt-lang');
        if (site && T[site]) return site;
        return document.documentElement.lang === 'es' ? 'es' : 'en';
    }

    function dayName(day, t) { return day.isSat ? t.sat : t.sun; }

    function dateLabel(key, t, l) {
        var d = keyToDate(key);
        var m = t.months[d.getUTCMonth()];
        if (l === 'zh') return m + d.getUTCDate() + '日';
        return l === 'en' ? m + ' ' + d.getUTCDate() : d.getUTCDate() + ' ' + m;
    }

    function rangeLabel(weekend, t, l) {
        var a = keyToDate(weekend.days[0].key);
        var b = keyToDate(weekend.days[1].key);
        var ma = t.months[a.getUTCMonth()];
        var mb = t.months[b.getUTCMonth()];
        if (l === 'zh') return ma === mb ? ma + a.getUTCDate() + '–' + b.getUTCDate() + '日' : ma + a.getUTCDate() + '日 – ' + mb + b.getUTCDate() + '日';
        if (l !== 'en') {
            return ma === mb ? a.getUTCDate() + '–' + b.getUTCDate() + ' ' + ma : a.getUTCDate() + ' ' + ma + ' – ' + b.getUTCDate() + ' ' + mb;
        }
        return ma === mb ? ma + ' ' + a.getUTCDate() + '–' + b.getUTCDate() : ma + ' ' + a.getUTCDate() + ' – ' + mb + ' ' + b.getUTCDate();
    }

    // What the first upcoming weekend looks like, phrased relative to today.
    function summarize(weekend, now, t) {
        var r = summaryKey(weekend, now, t);
        var copy = function (set) {
            var v = set[r.key];
            return typeof v === 'function' ? v(r.day) : v;
        };
        return { text: copy(t), state: r.state };
    }

    function summaryKey(weekend, now, t) {
        if (!hasData || !weekend) return { key: 'varies', state: 'unknown' };

        var remaining = weekend.days.filter(function (d) { return !d.isPast; });
        var open = remaining.filter(function (d) { return d.status === 'open'; });
        var isWeekendToday = now.dow === 6 || now.dow === 0;
        var later = isWeekendToday && !weekend.isCurrent; // viewing on a weekend, talking about the next one

        if (open.length === 2) return { key: 'openBoth', state: 'open' };
        if (open.length === 1) {
            var d = open[0];
            if (d.isToday) return { key: now.hour >= WEEKEND_OPEN_HOUR ? 'openNow' : 'openToday', state: 'open' };
            if (isWeekendToday && d.key === addDays(now.key, 1)) return { key: 'openTomorrow', state: 'open' };
            return { key: later ? 'openNext' : 'openThis', day: dayName(d, t), state: 'open' };
        }
        var allClosed = remaining.length && remaining.every(function (d) { return d.status === 'closed'; });
        if (allClosed) return { key: later ? 'closedNext' : 'closedThis', state: 'closed' };
        return { key: 'varies', state: 'unknown' };
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    /* ── Rendering ── */

    // Only touch the DOM when something changed. Also re-apply if another script
    // (e.g. lang-toggle's text walker) rewrote our content.
    function setHtml(el, html) {
        if (!el || (el.__mmcHtml === html && el.innerHTML === el.__mmcSerialized)) return;
        el.innerHTML = html;
        el.__mmcHtml = html;
        el.__mmcSerialized = el.innerHTML;
    }

    function takeOver(el) {
        // Our text is computed per language, so stop lang-toggle from overwriting it.
        if (el && el.hasAttribute('data-en')) {
            el.removeAttribute('data-en');
            el.removeAttribute('data-es');
        }
    }

    function weekendValue(days, t) {
        var open = days.filter(function (d) { return d.status === 'open'; });
        if (open.length === 2) return t.sat + ' ' + t.and + ' ' + t.sun + ' ' + t.hoursLong;
        if (open.length === 1) return dayName(open[0], t) + ' ' + t.hoursLong;
        if (days.length && days.every(function (d) { return d.status === 'closed'; })) return t.closed;
        return t.tbd;
    }

    // Some pages end up with two copies of the header, so never assume ids are unique.
    function all(selector) {
        return Array.prototype.slice.call(document.querySelectorAll(selector));
    }

    function renderBar(weekends, now, t, l) {
        var s = summarize(weekends[0], now, t);
        all('#mmcWeekendSummary').forEach(function (el) {
            takeOver(el);
            el.setAttribute('data-state', s.state);
            setHtml(el, escapeHtml(s.text));
        });
    }

    function renderPopover(weekends, now, t, l) {
        var pop = ensurePopover();
        var isWeekendToday = now.dow === 6 || now.dow === 0;
        var rows = weekends.map(function (w, i) {
            var open = w.days.filter(function (d) { return d.status === 'open'; });
            var allClosed = w.days.every(function (d) { return d.status === 'closed'; });
            var day, state;
            if (open.length) {
                day = open.length === 2 ? t.bothLong : (open[0].isSat ? t.satLong : t.sunLong);
                state = 'open';
            } else {
                day = allClosed ? t.closed : t.tbdLong;
                state = allClosed ? 'closed' : 'tbd';
            }
            var when = i === 0 ? (w.isCurrent || !isWeekendToday ? t.thisWeekend : t.nextWeekend) : '';
            return '<li class="mmc-wk-row is-' + state + (i === 0 ? ' is-first' : '') + '">' +
                '<div class="mmc-wk-when">' +
                    (when ? '<span class="mmc-wk-label">' + escapeHtml(when) + '</span>' : '') +
                    '<span class="mmc-wk-range">' + escapeHtml(rangeLabel(w, t, l)) + '</span>' +
                '</div>' +
                '<span class="mmc-wk-day">' + escapeHtml(day) + '</span></li>';
        }).join('');

        pop.setAttribute('aria-label', t.popLabel);
        setHtml(pop,
            '<span class="mmc-wk-arrow" aria-hidden="true"></span>' +
            '<div class="mmc-wk-head"><p class="mmc-wk-title">' + escapeHtml(t.popTitle) + '</p>' +
            '<dl class="mmc-wk-weekdays">' +
                '<div><dt>' + escapeHtml(t.monThu) + '</dt><dd>' + escapeHtml(t.weekdayHours[0]) + '</dd></div>' +
                '<div><dt>' + escapeHtml(t.friday) + '</dt><dd>' + escapeHtml(t.weekdayHours[1]) + '</dd></div>' +
            '</dl></div>' +
            '<p class="mmc-wk-sub">' + escapeHtml(t.popSub) + '</p>' +
            (hasData ? '<ul class="mmc-wk-list">' + rows + '</ul>' : '') +
            '<p class="mmc-wk-note">' + escapeHtml(t.popNote) + ' <a href="tel:3012082273">(301) 208-2273</a></p>');
    }

    function renderModal(weekends, now, t, l) {
        if (!hasData || !weekends.length) return;
        all('#mmcModalHours').forEach(function (list) {
            renderModalList(list, list.parentElement.querySelector('.mmc-modal-upcoming'), weekends, t, l);
        });
    }

    function renderModalList(list, upcoming, weekends, t, l) {
        var fallback = list.querySelector('[data-mmc-wk-fallback]');
        if (fallback) fallback.style.display = 'none';

        var first = weekends[0];
        var rowsHtml = first.days.map(function (d) {
            var value = d.status === 'open' ? t.hoursLong : d.status === 'closed' ? t.closed : t.tbd;
            return '<span class="mmc-wk-li-day">' + escapeHtml(dayName(d, t) + ', ' + dateLabel(d.key, t, l)) + '</span>' +
                '<span class="mmc-wk-li-val is-' + (d.status || 'tbd') + '">' + escapeHtml(value) + '</span>';
        });

        var existing = list.querySelectorAll('[data-mmc-wk-row]');
        for (var i = 0; i < 2; i++) {
            var li = existing[i];
            if (!li) {
                li = document.createElement('li');
                li.setAttribute('data-mmc-wk-row', '');
                list.appendChild(li);
            }
            li.className = first.days[i].isPast ? 'is-past' : '';
            setHtml(li, rowsHtml[i]);
        }

        if (upcoming) {
            var rest = weekends.slice(1);
            upcoming.hidden = !rest.length;
            setHtml(upcoming,
                '<span class="mmc-modal-upcoming-title">' + escapeHtml(t.upcoming) + '</span>' +
                '<ul>' + rest.map(function (w) {
                    var value = weekendValue(w.days, t);
                    var state = value === t.closed ? 'closed' : value === t.tbd ? 'tbd' : 'open';
                    return '<li><span>' + escapeHtml(rangeLabel(w, t, l)) + '</span><span class="is-' + state + '">' + escapeHtml(value) + '</span></li>';
                }).join('') + '</ul>');
        }
    }

    function renderFooter(weekends, now, t, l) {
        var el = document.getElementById('mmcFooterWeekend');
        if (!el || !hasData || !weekends.length) return;
        takeOver(el);
        var w = weekends[0];
        var isWeekendToday = now.dow === 6 || now.dow === 0;
        var label = (isWeekendToday && !w.isCurrent) ? t.footerNext : t.footerThis;
        var remaining = w.days.filter(function (d) { return !d.isPast; });
        var value = weekendValue(remaining, t).replace(t.hoursLong, t.hoursShort.replace('-', ' - '));
        setHtml(el, escapeHtml(label + ': ' + value));
    }

    function render() {
        var l = lang();
        var t = T[l];
        var now = clinicNow();
        var weekends = buildWeekends(now);
        renderBar(weekends, now, t, l);
        if (popover) renderPopover(weekends, now, t, l);
        renderModal(weekends, now, t, l);
        renderFooter(weekends, now, t, l);
        bindTrigger();
    }

    /* ── Popover (hover on desktop, tap on touch, keyboard accessible) ── */

    var popover = null;
    var activeTrigger = null;
    var isOpen = false;
    var openTimer = null;
    var closeTimer = null;

    function ensurePopover() {
        if (popover) return popover;
        popover = document.createElement('div');
        popover.id = 'mmcWeekendPopover';
        popover.className = 'mmc-wk-popover';
        popover.setAttribute('role', 'region');
        popover.hidden = true;
        popover.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') clearTimeout(closeTimer); });
        popover.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') scheduleClose(); });
        document.body.appendChild(popover);
        return popover;
    }

    function position() {
        var trigger = activeTrigger;
        if (!trigger || !popover) return;
        var r = trigger.getBoundingClientRect();
        var vw = document.documentElement.clientWidth;
        var w = popover.offsetWidth;
        var centre = r.left + r.width / 2;
        var left = Math.max(12, Math.min(centre - w / 2, vw - w - 12));
        popover.style.top = Math.round(r.bottom + 10) + 'px';
        popover.style.left = Math.round(left) + 'px';
        popover.style.setProperty('--mmc-wk-arrow-x', Math.round(centre - left) + 'px');
    }

    function open(trigger) {
        clearTimeout(closeTimer);
        if (isOpen || !trigger) return;
        activeTrigger = trigger;
        ensurePopover();
        render();
        popover.hidden = false;
        position();
        // next frame so the transition runs
        requestAnimationFrame(function () { popover.classList.add('is-open'); });
        trigger.setAttribute('aria-expanded', 'true');
        isOpen = true;
    }

    function close() {
        clearTimeout(openTimer);
        if (!isOpen || !popover) return;
        popover.classList.remove('is-open');
        if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
        isOpen = false;
        setTimeout(function () { if (!isOpen) popover.hidden = true; }, 160);
    }

    function scheduleClose() {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        closeTimer = setTimeout(close, 180);
    }

    function bindTrigger() {
        all('#mmcHoursTrigger').forEach(function (trigger) {
            if (trigger.__mmcBound) return;
            trigger.__mmcBound = true;
            var lastPointer = 'mouse';

            trigger.addEventListener('pointerenter', function (e) {
                if (e.pointerType !== 'mouse') return;
                clearTimeout(closeTimer);
                openTimer = setTimeout(function () { open(trigger); }, 90);
            });
            trigger.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') scheduleClose(); });
            trigger.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType; });
            trigger.addEventListener('click', function (e) {
                // Mouse users already opened it on hover, so a click just keeps it open.
                // (e.detail === 0 means keyboard Enter/Space, which should toggle.)
                if (e.detail !== 0 && lastPointer === 'mouse' && isOpen) return;
                if (isOpen) close(); else open(trigger);
                lastPointer = 'mouse';
            });
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) {
            close();
            if (activeTrigger) activeTrigger.focus();
        }
    });
    document.addEventListener('pointerdown', function (e) {
        if (!isOpen) return;
        if (popover.contains(e.target) || (activeTrigger && activeTrigger.contains(e.target))) return;
        close();
    });
    window.addEventListener('resize', function () { if (isOpen) close(); });

    /* ── Data ── */

    function applyDocs(docs) {
        var next = {};
        docs.forEach(function (doc) {
            var m = LABEL_RE.exec(doc.label || '');
            if (m && m[3] === doc.startDate) next[m[3]] = m[2].toLowerCase();
        });
        dayStatus = next;
        hasData = true;
    }

    function readCache() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return;
            var cache = JSON.parse(raw);
            if (!cache || !cache.days || Date.now() - cache.t > CACHE_MAX_AGE) return;
            dayStatus = cache.days;
            hasData = true;
            lastFetch = cache.t;
        } catch (e) { /* ignore */ }
    }

    function writeCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), days: dayStatus }));
        } catch (e) { /* ignore */ }
    }

    function fetchSchedule() {
        if (fetching || !window.fetch) return;
        fetching = true;
        var from = addDays(clinicNow().key, -1);
        var body = {
            structuredQuery: {
                from: [{ collectionId: 'scheduledBanners' }],
                select: { fields: [{ fieldPath: 'label' }, { fieldPath: 'startDate' }] },
                where: { fieldFilter: { field: { fieldPath: 'startDate' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: from } } },
                orderBy: [{ field: { fieldPath: 'startDate' } }],
                limit: 80
            }
        };

        fetch(FIRESTORE_QUERY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (res) {
            if (!res.ok) throw new Error('status ' + res.status);
            return res.json();
        }).then(function (rows) {
            var docs = [];
            (rows || []).forEach(function (row) {
                var f = row && row.document && row.document.fields;
                if (!f) return;
                docs.push({
                    label: f.label && f.label.stringValue,
                    startDate: f.startDate && f.startDate.stringValue
                });
            });
            applyDocs(docs);
            writeCache();
            lastFetch = Date.now();
            render();
        }).catch(function (err) {
            console.warn('MMC weekend hours: could not load schedule', err);
        }).then(function () {
            fetching = false;
        });
    }

    /* ── Styles (injected so every page gets them without another request) ── */

    function injectStyles() {
        if (document.getElementById('mmc-weekend-hours-styles')) return;
        var css = [

            '.mmc-wk-popover{position:fixed;z-index:1000001;width:min(19.5rem,calc(100vw - 24px));background:#fff;color:#0f172a;border-radius:12px;',
            'border:1px solid rgba(15,23,42,.08);box-shadow:0 1px 2px rgba(15,23,42,.04),0 16px 36px -12px rgba(15,23,42,.22);padding:1.1rem 1.25rem 1rem;',
            'opacity:0;transform:translateY(-6px);transition:opacity .18s ease,transform .22s cubic-bezier(.2,.8,.2,1);font-family:inherit;text-align:left;letter-spacing:normal}',
            '.mmc-wk-popover.is-open{opacity:1;transform:none}',
            '.mmc-wk-arrow{position:absolute;top:-6px;left:var(--mmc-wk-arrow-x,50%);width:11px;height:11px;margin-left:-5.5px;background:#fff;transform:rotate(45deg);',
            'border-left:1px solid rgba(15,23,42,.08);border-top:1px solid rgba(15,23,42,.08);border-top-left-radius:2px}',
            '.mmc-wk-head{padding-bottom:.85rem;border-bottom:1px solid #eef0f3}',
            '.mmc-wk-weekdays{margin:.6rem 0 0;display:flex;flex-direction:column;gap:.3rem}',
            '.mmc-wk-weekdays div{display:flex;justify-content:space-between;gap:1rem;font-size:.8rem}',
            '.mmc-wk-weekdays dt{color:#475569;margin:0}',
            '.mmc-wk-weekdays dd{margin:0;color:#0f172a;font-weight:500;font-variant-numeric:tabular-nums}',
            '.mmc-wk-title{margin:0;font-size:.95rem;line-height:1.3;font-weight:600;color:#0f172a}',
            '.mmc-wk-sub{margin:.85rem 0 .1rem;font-size:.72rem;line-height:1.4;color:#64748b;font-weight:500}',
            '.mmc-wk-list{list-style:none;margin:0;padding:0}',
            '.mmc-wk-row{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;padding:.6rem 0;border-bottom:1px solid #f1f3f6}',
            '.mmc-wk-row:last-child{border-bottom:0}',
            '.mmc-wk-when{display:flex;flex-direction:column;gap:.1rem}',
            '.mmc-wk-label{font-size:.7rem;font-weight:600;color:#0d47a1}',
            '.mmc-wk-range{font-size:.82rem;color:#475569;font-variant-numeric:tabular-nums;white-space:nowrap}',
            '.mmc-wk-row.is-first .mmc-wk-range{color:#0f172a;font-weight:500}',
            '.mmc-wk-day{font-size:.85rem;font-weight:600;color:#0f172a;white-space:nowrap}',
            '.mmc-wk-row.is-closed .mmc-wk-day,.mmc-wk-row.is-tbd .mmc-wk-day{font-weight:500;color:#94a3b8}',
            '.mmc-wk-note{margin:.35rem 0 0;padding-top:.75rem;border-top:1px solid #eef0f3;font-size:.72rem;line-height:1.45;color:#64748b}',
            '.mmc-wk-note a{color:#0d47a1;font-weight:600;text-decoration:none;white-space:nowrap}',
            '.mmc-wk-note a:hover{text-decoration:underline;text-underline-offset:2px}',

            '#mmcModalHours li.is-past{opacity:.45}',
            '#mmcModalHours .mmc-wk-li-val.is-closed,#mmcModalHours .mmc-wk-li-val.is-tbd{color:#9ca3af!important}',
            '.mmc-modal-upcoming{margin:.4rem 0 .35rem;padding-top:.45rem;border-top:1px solid rgba(13,71,161,.1)}',
            '.mmc-modal-upcoming-title{display:block;font-size:.66rem;font-weight:600;color:#6b7280;margin-bottom:.2rem}',
            '.mmc-modal-upcoming ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.15rem}',
            '.mmc-modal-upcoming li{display:flex;justify-content:space-between;gap:.75rem;font-size:.7rem;color:#475569}',
            '.mmc-modal-upcoming li span:last-child{text-align:right;color:#1a1a1a}',
            '.mmc-modal-upcoming .is-closed,.mmc-modal-upcoming .is-tbd{color:#9ca3af!important}',

            '@media (prefers-reduced-motion:reduce){.mmc-wk-popover,.mmc-hours-chevron{transition:none}}'
        ].join('');
        var style = document.createElement('style');
        style.id = 'mmc-weekend-hours-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ── Boot ── */

    injectStyles();
    readCache();
    render();
    // Saved schedule from the last 10 minutes is fresh enough; skip the database read.
    if (Date.now() - lastFetch > REFRESH_AFTER) fetchSchedule();

    // Header/footer are injected asynchronously - render as soon as they land.
    document.addEventListener('mmc:header-ready', render);
    ['header-placeholder', 'footer-placeholder'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && window.MutationObserver) new MutationObserver(render).observe(el, { childList: true });
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);

    // Re-render after the language toggle runs (it updates <html lang>).
    if (window.MutationObserver) {
        new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    // Keep "today / tomorrow / open now" correct on long-lived tabs.
    setInterval(render, 5 * 60000);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible') return;
        render();
        if (Date.now() - lastFetch > REFRESH_AFTER) fetchSchedule();
    });
})();
