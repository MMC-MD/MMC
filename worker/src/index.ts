/**
 * MMC reminder Worker.
 *
 * Cron: every day at 9:00 AM America/New_York.
 * Two cron triggers (13:00 UTC and 14:00 UTC) cover EDT and EST. We pick the
 * one that lands on local hour 9 and skip the other.
 *
 * Two reminder types:
 *   1. WEEKEND — Wed/Thu/Fri, looks at the upcoming Sat & Sun and emails if
 *      either day is uncovered by `scheduledBanners`.
 *   2. HOLIDAY — every day, looks 2 days out for a holiday (federal, secular,
 *      or Jewish) and emails if it isn't covered.
 *
 * Both share the recipient list (admins + invited users − muted) and the
 * brand-styled email shell.
 */

import { Holiday, holidayOnDate } from './holidays';

export interface Env {
    RESEND_API_KEY: string;
    FIREBASE_PROJECT_ID: string;
    FIREBASE_SERVICE_ACCOUNT_EMAIL: string;
    FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: string;

    SITE_URL: string;
    PUBLIC_SITE_URL: string;
    FROM_EMAIL: string;
    ADMIN_EMAILS: string;
    TZ_NAME: string;
}

interface ScheduledBanner {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    recurrence: {
        mode: 'dates' | 'weekly' | 'biweekly';
        days: number[];
        anchorDate?: string;
        weekParity?: 0 | 1;
    };
}

interface UserRecord {
    email: string;
    disabled: boolean;
}

interface MuteRecord {
    email: string;
}

interface RunSummary {
    ranAt: string;
    localHour: number;
    skipped: boolean;
    reason?: string;
    weekendCheck?: WeekendCheckSummary;
    holidayCheck?: HolidayCheckSummary;
    error?: string;
}

interface WeekendCheckSummary {
    skipped: boolean;
    reason?: string;
    saturday?: { date: string; covered: boolean; bannerId?: string };
    sunday?: { date: string; covered: boolean; bannerId?: string };
    recipients?: string[];
    emailId?: string;
}

interface HolidayCheckSummary {
    skipped: boolean;
    reason?: string;
    holiday?: { date: string; key: string; name: string; category: string; covered: boolean };
    recipients?: string[];
    emailId?: string;
}

/* ──────────────────────────────────────────────
   Time helpers (DST-aware via Intl)
   ────────────────────────────────────────────── */

function partsInZone(date: Date, timeZone: string) {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'short'
    });
    const parts = fmt.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
    }, {});
    const weekdayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    };
    return {
        year: parseInt(parts.year, 10),
        month: parseInt(parts.month, 10),
        day: parseInt(parts.day, 10),
        hour: parseInt(parts.hour, 10),
        minute: parseInt(parts.minute, 10),
        second: parseInt(parts.second, 10),
        weekday: weekdayMap[parts.weekday] ?? 0
    };
}

function ymd(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Given a local date (year/month/day) and how many days to add, return the new ymd.
function addDaysYmd(year: number, month: number, day: number, addDays: number): string {
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + addDays);
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function dayOfWeekFromYmd(ymdStr: string): number {
    const [y, m, d] = ymdStr.split('-').map((s) => parseInt(s, 10));
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
}

/* ──────────────────────────────────────────────
   Banner coverage logic — must match the frontend
   `getActiveScheduledBanner` in firebase-client.js
   ────────────────────────────────────────────── */

function isBannerActiveOnDate(
    banner: ScheduledBanner,
    targetYmd: string
): boolean {
    const recurrence = banner.recurrence || { mode: 'dates', days: [] };
    const targetDow = dayOfWeekFromYmd(targetYmd);

    if (recurrence.mode === 'weekly') {
        return Array.isArray(recurrence.days) && recurrence.days.indexOf(targetDow) !== -1;
    }

    if (recurrence.mode === 'biweekly') {
        if (!Array.isArray(recurrence.days) || recurrence.days.indexOf(targetDow) === -1) {
            return false;
        }
        if (!recurrence.anchorDate) return false;
        const [ay, am, ad] = recurrence.anchorDate.split('-').map((s) => parseInt(s, 10));
        const [ty, tm, td] = targetYmd.split('-').map((s) => parseInt(s, 10));
        const anchorMs = Date.UTC(ay, am - 1, ad);
        const targetMs = Date.UTC(ty, tm - 1, td);
        const diffDays = Math.floor((targetMs - anchorMs) / 86400000);
        const weekIndex = Math.floor(diffDays / 7);
        const parity = ((weekIndex % 2) + 2) % 2;
        return parity === (recurrence.weekParity || 0);
    }

    // dates mode
    if (banner.startDate && banner.endDate) {
        return banner.startDate <= targetYmd && banner.endDate >= targetYmd;
    }
    return false;
}

function findCoveringBanner(banners: ScheduledBanner[], targetYmd: string): ScheduledBanner | null {
    for (const b of banners) {
        if (isBannerActiveOnDate(b, targetYmd)) return b;
    }
    return null;
}

/* ──────────────────────────────────────────────
   Firestore REST via service-account JWT
   ────────────────────────────────────────────── */

function base64UrlEncode(buf: ArrayBuffer | Uint8Array | string): string {
    let bytes: Uint8Array;
    if (typeof buf === 'string') {
        bytes = new TextEncoder().encode(buf);
    } else if (buf instanceof Uint8Array) {
        bytes = buf;
    } else {
        bytes = new Uint8Array(buf);
    }
    let str = '';
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
    const cleaned = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\\n/g, '\n')
        .replace(/[\r\n\s]+/g, '');
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(env: Env): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
        iss: env.FIREBASE_SERVICE_ACCOUNT_EMAIL,
        // datastore: Firestore REST. firebase: Identity Toolkit (list/delete auth users).
        scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    };
    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const claimB64 = base64UrlEncode(JSON.stringify(claim));
    const unsigned = `${headerB64}.${claimB64}`;

    const keyData = pemToArrayBuffer(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY);
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyData,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(unsigned)
    );
    const jwt = `${unsigned}.${base64UrlEncode(sig)}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });
    if (!tokenRes.ok) {
        const text = await tokenRes.text();
        throw new Error(`Google token exchange failed (${tokenRes.status}): ${text}`);
    }
    const json = (await tokenRes.json()) as { access_token: string; expires_in: number };
    cachedToken = { token: json.access_token, expiresAt: now + json.expires_in };
    return json.access_token;
}

async function firestoreList(env: Env, collection: string): Promise<any[]> {
    const token = await getGoogleAccessToken(env);
    const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}?pageSize=300`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Firestore list ${collection} failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { documents?: any[] };
    return json.documents || [];
}

// Convert a Firestore REST document `fields` shape to a plain JS object.
function decodeFields(fields: Record<string, any> | undefined): any {
    if (!fields) return {};
    const out: any = {};
    for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
    return out;
}

function decodeValue(v: any): any {
    if (v == null) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return parseInt(v.integerValue, 10);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v) return decodeFields(v.mapValue.fields);
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
    return null;
}

function docIdFromName(name: string): string {
    const parts = name.split('/');
    return parts[parts.length - 1];
}

/* ──────────────────────────────────────────────
   Data loaders
   ────────────────────────────────────────────── */

async function loadScheduledBanners(env: Env): Promise<ScheduledBanner[]> {
    const docs = await firestoreList(env, 'scheduledBanners');
    return docs.map((doc) => {
        const data = decodeFields(doc.fields);
        const recurrenceRaw = data.recurrence || {};
        const recurrence = {
            mode: (recurrenceRaw.mode === 'weekly' || recurrenceRaw.mode === 'biweekly') ? recurrenceRaw.mode : 'dates',
            days: Array.isArray(recurrenceRaw.days) ? recurrenceRaw.days.map((d: any) => parseInt(d, 10)).filter((d: number) => !isNaN(d)) : [],
            anchorDate: typeof recurrenceRaw.anchorDate === 'string' ? recurrenceRaw.anchorDate : '',
            weekParity: recurrenceRaw.weekParity === 1 ? 1 : 0
        };
        return {
            id: docIdFromName(doc.name),
            label: typeof data.label === 'string' ? data.label : 'Scheduled Banner',
            startDate: typeof data.startDate === 'string' ? data.startDate : '',
            endDate: typeof data.endDate === 'string' ? data.endDate : '',
            recurrence
        } as ScheduledBanner;
    });
}

interface AuthUserRecord {
    uid: string;
    email: string;
    disabled: boolean;
    createdAt?: string;
    lastLoginAt?: string;
}

// List every user from Firebase Authentication. This is the source of truth for
// "who can sign in and edit banners" — far more reliable than a hand-maintained
// Firestore /users collection, which can drift if accounts were created via the
// Firebase console rather than the in-app invite form.
async function listAuthUsers(env: Env): Promise<AuthUserRecord[]> {
    const token = await getGoogleAccessToken(env);
    const out: AuthUserRecord[] = [];
    let nextPageToken = '';
    // Identity Toolkit caps at 1000 per page; loop in case there are more.
    for (let page = 0; page < 20; page++) {
        const body: Record<string, any> = { maxResults: 1000 };
        if (nextPageToken) body.nextPageToken = nextPageToken;
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:batchGet?maxResults=1000${nextPageToken ? `&nextPageToken=${encodeURIComponent(nextPageToken)}` : ''}`,
            {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Identity Toolkit list users failed (${res.status}): ${text}`);
        }
        const json = (await res.json()) as { users?: any[]; nextPageToken?: string };
        for (const u of json.users || []) {
            const email = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
            if (!email) continue;
            out.push({
                uid: u.localId || '',
                email,
                disabled: u.disabled === true,
                createdAt: u.createdAt,
                lastLoginAt: u.lastLoginAt
            });
        }
        nextPageToken = json.nextPageToken || '';
        if (!nextPageToken) break;
    }
    return out;
}

async function loadUsers(env: Env): Promise<UserRecord[]> {
    // Authoritative roster: every Firebase Auth account.
    let authUsers: AuthUserRecord[] = [];
    try {
        authUsers = await listAuthUsers(env);
    } catch (e) {
        console.error('[mmc-reminders] listAuthUsers failed, falling back to Firestore /users', e);
    }

    // Overlay the Firestore /users disabled flag — admins use that to revoke
    // edit access without deleting the account outright.
    const firestoreDisabled = new Map<string, boolean>();
    try {
        const docs = await firestoreList(env, 'users');
        for (const d of docs) {
            const data = decodeFields(d.fields);
            const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
            if (email) firestoreDisabled.set(email, data.disabled === true);
        }
    } catch (e) {
        // Collection may not exist yet — that's fine, treat all as enabled.
    }

    if (authUsers.length > 0) {
        return authUsers.map((u) => ({
            email: u.email,
            disabled: u.disabled || firestoreDisabled.get(u.email) === true
        }));
    }

    // Fallback: if we couldn't reach Identity Toolkit, use the legacy
    // Firestore-only path so cron emails still go out to invited users.
    let docs: any[] = [];
    try {
        docs = await firestoreList(env, 'users');
    } catch (e) {
        return [];
    }
    return docs
        .map((doc) => {
            const data = decodeFields(doc.fields);
            return {
                email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : '',
                disabled: data.disabled === true
            };
        })
        .filter((u) => !!u.email);
}

async function loadMutedRecipients(env: Env): Promise<Set<string>> {
    let docs: any[] = [];
    try {
        docs = await firestoreList(env, 'mutedRecipients');
    } catch (e) {
        return new Set();
    }
    const out = new Set<string>();
    for (const doc of docs) {
        const id = docIdFromName(doc.name).trim().toLowerCase();
        if (id) out.add(id);
    }
    return out;
}

/* ──────────────────────────────────────────────
   Recipient resolution
   ────────────────────────────────────────────── */

function buildRecipientList(
    users: UserRecord[],
    muted: Set<string>,
    adminEmailsCsv: string
): string[] {
    const set = new Set<string>();
    const adminList = (adminEmailsCsv || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    for (const e of adminList) set.add(e);
    for (const u of users) {
        if (u.disabled) continue;
        if (u.email) set.add(u.email);
    }
    for (const m of muted) set.delete(m);
    return Array.from(set);
}

/* ──────────────────────────────────────────────
   Email
   ────────────────────────────────────────────── */

function formatNiceDate(ymdStr: string): string {
    const [y, m, d] = ymdStr.split('-').map((s) => parseInt(s, 10));
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function buildDayCard(label: string, date: string, covered: boolean): string {
    const accent = covered ? '#16a34a' : '#e67e22';
    const accentSoft = covered ? '#dcfce7' : '#fff1e0';
    const statusText = covered ? 'Covered' : 'Not set';
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${accent};margin-right:6px;vertical-align:middle;"></span>`;
    return `
        <td valign="top" width="50%" style="padding:0 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:14px;background:#ffffff;">
                <tr>
                    <td style="padding:18px 18px 16px 18px;">
                        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0d47a1;">${label}</p>
                        <p style="margin:6px 0 0;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#0f172a;line-height:1.25;">${date}</p>
                        <p style="margin:14px 0 0;">
                            <span style="display:inline-block;background:${accentSoft};color:${accent};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:6px 10px;border-radius:999px;">${dot}${statusText}</span>
                        </p>
                    </td>
                </tr>
            </table>
        </td>`;
}

function buildEmailHtml(
    saturday: { date: string; covered: boolean },
    sunday: { date: string; covered: boolean },
    siteUrl: string,
    publicSiteUrl: string
): string {
    const missing: string[] = [];
    if (!saturday.covered) missing.push(formatNiceDate(saturday.date));
    if (!sunday.covered) missing.push(formatNiceDate(sunday.date));
    const missingLine = missing.length === 2
        ? `${missing[0]} and ${missing[1]}`
        : missing[0];
    const verb = missing.length === 2 ? 'have' : 'has';

    const satNice = formatNiceDate(saturday.date);
    const sunNice = formatNiceDate(sunday.date);

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>MMC Briefing Room</title>
<!--[if mso]>
<style>
  table, td, p, a, span { font-family: 'Segoe UI', Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;overflow:hidden;">
    Heads up: ${missingLine} ${verb} no scheduled weekend banner yet. Open the Briefing Room to publish it.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5f9;padding:36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(13,71,161,0.10);border:1px solid #e6e8ee;">

          <!-- Hero -->
          <tr>
            <td style="background:#0d47a1;background-image:linear-gradient(140deg,#0d3b8c 0%,#1565c0 35%,#1976d2 60%,#0a6ebd 80%,#0d47a1 100%);padding:36px 36px 30px 36px;color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ffb347;">Montgomery Medical Clinic</p>
                    <p style="margin:6px 0 0;font-size:13px;font-weight:600;letter-spacing:0.02em;color:rgba(255,255,255,0.78);">Briefing Room · Weekend Schedule</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px;">
                    <h1 style="margin:0;font-size:28px;line-height:1.18;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">
                      The weekend banner <span style="color:#ffb347;">still needs setting</span>.
                    </h1>
                    <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.92);max-width:480px;">
                      Patients land on the homepage looking for weekend hours. Without a banner, they don't see them.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status cards -->
          <tr>
            <td style="padding:28px 30px 8px 30px;background:#ffffff;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">This weekend at a glance</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${buildDayCard('Saturday', satNice, saturday.covered)}
                  ${buildDayCard('Sunday', sunNice, sunday.covered)}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding:24px 36px 8px 36px;background:#ffffff;font-size:15px;line-height:1.6;color:#0f172a;">
              <p style="margin:0 0 14px;">Hi team,</p>
              <p style="margin:0 0 14px;">Heads up — <strong>${missingLine}</strong> ${verb} no scheduled weekend banner yet. When patients visit the website, they won't see weekend hours until someone publishes one in the Briefing Room.</p>
              <p style="margin:0;">It only takes a minute. Tap the button below to open the editor.</p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:24px 36px 8px 36px;background:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background:#e67e22;background-image:linear-gradient(135deg,#ff9a3c 0%,#ff8f00 50%,#e67e22 100%);border-radius:14px;box-shadow:0 8px 24px rgba(230,126,34,0.32);">
                    <a href="${siteUrl}" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:700;letter-spacing:0.01em;color:#ffffff;text-decoration:none;border-radius:14px;">
                      Open the Briefing Room  →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:12px;color:#64748b;">
                Direct link: <a href="${siteUrl}" style="color:#0d47a1;text-decoration:none;border-bottom:1px solid rgba(13,71,161,0.25);">${siteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Helper tip -->
          <tr>
            <td style="padding:28px 36px 4px 36px;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8faff;border:1px solid #e1ebff;border-left:4px solid #ffb347;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;font-size:13px;line-height:1.55;color:#334155;">
                    <strong style="color:#0d47a1;">Tip:</strong> In the Briefing Room sidebar, open <em>Scheduled Banners</em> and pick the <em>Weekend Hours</em> template — it pre-fills the times and language for you.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 36px 32px 36px;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #eef0f5;">
                <tr>
                  <td style="padding-top:20px;font-size:12px;line-height:1.6;color:#64748b;">
                    You're receiving this because you have edit access to the MMC website. An admin can mute these reminders for you in the Briefing Room under <em>Email Mute List</em>.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:14px;font-size:12px;color:#94a3b8;">
                    <a href="${publicSiteUrl}" style="color:#0d47a1;text-decoration:none;font-weight:600;">mmccare.com</a>
                    <span style="color:#cbd5e1;"> &nbsp;·&nbsp; </span>
                    Montgomery Medical Clinic
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Brand bar -->
          <tr>
            <td style="height:6px;background:#0d47a1;background-image:linear-gradient(90deg,#0d3b8c 0%,#1565c0 50%,#ffb347 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>

        <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;">
          Sent automatically by the MMC Briefing Room reminder bot.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(
    saturday: { date: string; covered: boolean },
    sunday: { date: string; covered: boolean },
    siteUrl: string
): string {
    const missing: string[] = [];
    if (!saturday.covered) missing.push(formatNiceDate(saturday.date));
    if (!sunday.covered) missing.push(formatNiceDate(sunday.date));
    const missingLine = missing.length === 2 ? `${missing[0]} and ${missing[1]}` : missing[0];
    return [
        `Heads up: ${missingLine} ${missing.length === 2 ? 'have' : 'has'} no scheduled weekend banner yet.`,
        '',
        'Please open the Briefing Room and publish the weekend hours:',
        siteUrl
    ].join('\n');
}

async function sendResend(
    env: Env,
    recipients: string[],
    saturday: { date: string; covered: boolean },
    sunday: { date: string; covered: boolean }
): Promise<string> {
    const html = buildEmailHtml(saturday, sunday, env.SITE_URL, env.PUBLIC_SITE_URL);
    const text = buildEmailText(saturday, sunday, env.SITE_URL);

    const subject = saturday.covered || sunday.covered
        ? 'Reminder: weekend banner still needs setting'
        : 'Reminder: weekend banner not set yet';

    return await sendResendRaw(env, recipients, subject, html, text);
}

async function sendResendRaw(
    env: Env,
    recipients: string[],
    subject: string,
    html: string,
    text: string
): Promise<string> {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: env.FROM_EMAIL,
            to: recipients,
            subject,
            html,
            text
        })
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend send failed (${res.status}): ${body}`);
    }
    const json = (await res.json()) as { id?: string };
    return json.id || '';
}

/* ──────────────────────────────────────────────
   Holiday email
   ────────────────────────────────────────────── */

function holidayCategoryLabel(category: string): string {
    if (category === 'jewish') return 'Jewish Holiday';
    if (category === 'federal') return 'Federal Holiday';
    return 'Office Observance';
}

function buildHolidayEmailHtml(
    holiday: Holiday,
    daysAway: number,
    covered: boolean,
    siteUrl: string,
    publicSiteUrl: string
): string {
    const niceDate = formatNiceDate(holiday.date);
    const categoryLabel = holidayCategoryLabel(holiday.category);
    const heading = covered
        ? `${holiday.name} <span style="color:#ffb347;">is on the calendar</span>`
        : `${holiday.name} <span style="color:#ffb347;">is ${daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`}</span>`;
    const subhead = covered
        ? `A banner is already scheduled for ${niceDate}. Just a heads-up so you can review it.`
        : `Patients still don't see anything special on the homepage for ${niceDate}. Add a banner so they know what to expect.`;
    const ctaLabel = covered ? 'Review the banner' : 'Open the Briefing Room';
    const statusBadge = covered
        ? '<span style="display:inline-block;background:#dcfce7;color:#16a34a;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:6px 10px;border-radius:999px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:6px;vertical-align:middle;"></span>Banner scheduled</span>'
        : '<span style="display:inline-block;background:#fff1e0;color:#e67e22;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:6px 10px;border-radius:999px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e67e22;margin-right:6px;vertical-align:middle;"></span>No banner yet</span>';

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>MMC Briefing Room</title>
<!--[if mso]>
<style>table, td, p, a, span { font-family: 'Segoe UI', Arial, sans-serif !important; }</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;overflow:hidden;">
    Heads up: ${holiday.name} is ${daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`} (${niceDate}). Please publish a banner so patients know what to expect.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f5f9;padding:36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(13,71,161,0.10);border:1px solid #e6e8ee;">

          <!-- Hero -->
          <tr>
            <td style="background:#0d47a1;background-image:linear-gradient(140deg,#0d3b8c 0%,#1565c0 35%,#1976d2 60%,#0a6ebd 80%,#0d47a1 100%);padding:36px 36px 30px 36px;color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ffb347;">Montgomery Medical Clinic</p>
                    <p style="margin:6px 0 0;font-size:13px;font-weight:600;letter-spacing:0.02em;color:rgba(255,255,255,0.78);">Briefing Room · ${categoryLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px;">
                    <h1 style="margin:0;font-size:28px;line-height:1.18;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">
                      ${heading}.
                    </h1>
                    <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.92);max-width:480px;">
                      ${subhead}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status card -->
          <tr>
            <td style="padding:28px 30px 8px 30px;background:#ffffff;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${categoryLabel}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e8ee;border-radius:14px;background:#ffffff;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0d47a1;">${holiday.name}</p>
                    <p style="margin:6px 0 0;font-size:22px;font-weight:800;letter-spacing:-0.01em;color:#0f172a;line-height:1.25;">${niceDate}</p>
                    <p style="margin:14px 0 0;">${statusBadge}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding:24px 36px 8px 36px;background:#ffffff;font-size:15px;line-height:1.6;color:#0f172a;">
              <p style="margin:0 0 14px;">Hi team,</p>
              <p style="margin:0 0 14px;">${
                  covered
                      ? `Just a heads-up — there's already a banner scheduled for <strong>${holiday.name}</strong>. Tap the button to double-check the wording before patients see it.`
                      : `<strong>${holiday.name}</strong> is coming up on <strong>${niceDate}</strong>. Patients won't see anything about it on the homepage until someone publishes a banner.`
              }</p>
              <p style="margin:0;">It only takes a minute. Tap the button below to open the editor.</p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:24px 36px 8px 36px;background:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background:#e67e22;background-image:linear-gradient(135deg,#ff9a3c 0%,#ff8f00 50%,#e67e22 100%);border-radius:14px;box-shadow:0 8px 24px rgba(230,126,34,0.32);">
                    <a href="${siteUrl}" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:700;letter-spacing:0.01em;color:#ffffff;text-decoration:none;border-radius:14px;">
                      ${ctaLabel}  →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:12px;color:#64748b;">
                Direct link: <a href="${siteUrl}" style="color:#0d47a1;text-decoration:none;border-bottom:1px solid rgba(13,71,161,0.25);">${siteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Helper tip -->
          <tr>
            <td style="padding:28px 36px 4px 36px;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8faff;border:1px solid #e1ebff;border-left:4px solid #ffb347;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;font-size:13px;line-height:1.55;color:#334155;">
                    <strong style="color:#0d47a1;">Tip:</strong> In the Briefing Room sidebar, open <em>Scheduled Banners</em> &rarr; <em>New Banner</em> and pick the start/end date as <strong>${niceDate}</strong>. Use a calm color (green or yellow) and write a short note about office hours that day.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 36px 32px 36px;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #eef0f5;">
                <tr>
                  <td style="padding-top:20px;font-size:12px;line-height:1.6;color:#64748b;">
                    You're receiving this because you have edit access to the MMC website. An admin can mute these reminders for you in the Briefing Room under <em>Email Mute List</em>.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:14px;font-size:12px;color:#94a3b8;">
                    <a href="${publicSiteUrl}" style="color:#0d47a1;text-decoration:none;font-weight:600;">mmccare.com</a>
                    <span style="color:#cbd5e1;"> &nbsp;·&nbsp; </span>
                    Montgomery Medical Clinic
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Brand bar -->
          <tr>
            <td style="height:6px;background:#0d47a1;background-image:linear-gradient(90deg,#0d3b8c 0%,#1565c0 50%,#ffb347 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>

        <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;">
          Sent automatically by the MMC Briefing Room reminder bot.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildHolidayEmailText(
    holiday: Holiday,
    daysAway: number,
    covered: boolean,
    siteUrl: string
): string {
    const niceDate = formatNiceDate(holiday.date);
    const when = daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;
    if (covered) {
        return [
            `${holiday.name} (${niceDate}) is ${when}, and a banner is already scheduled.`,
            '',
            'You can review or edit it in the Briefing Room:',
            siteUrl
        ].join('\n');
    }
    return [
        `Heads up: ${holiday.name} is ${when} (${niceDate}). No banner is scheduled yet.`,
        '',
        'Please open the Briefing Room and add a banner so patients know what to expect:',
        siteUrl
    ].join('\n');
}

async function sendHolidayResend(
    env: Env,
    recipients: string[],
    holiday: Holiday,
    daysAway: number,
    covered: boolean
): Promise<string> {
    const html = buildHolidayEmailHtml(holiday, daysAway, covered, env.SITE_URL, env.PUBLIC_SITE_URL);
    const text = buildHolidayEmailText(holiday, daysAway, covered, env.SITE_URL);
    const when = daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;
    const subject = covered
        ? `${holiday.name} is ${when} — banner is on the calendar`
        : `${holiday.name} is ${when} — schedule a banner`;
    return await sendResendRaw(env, recipients, subject, html, text);
}

/* ──────────────────────────────────────────────
   Main check
   ────────────────────────────────────────────── */

interface LocalParts {
    year: number; month: number; day: number;
    hour: number; minute: number; second: number;
    weekday: number;
}

async function runWeekendCheck(env: Env, local: LocalParts, opts: { force?: boolean }): Promise<WeekendCheckSummary> {
    const summary: WeekendCheckSummary = { skipped: false };

    if (!opts.force) {
        if (local.weekday !== 3 && local.weekday !== 4 && local.weekday !== 5) {
            summary.skipped = true;
            summary.reason = `Weekday is ${local.weekday} (not Wed/Thu/Fri)`;
            return summary;
        }
    }

    const todayWeekday = local.weekday;
    const daysUntilSat = (6 - todayWeekday + 7) % 7 || 7;
    const saturdayYmd = addDaysYmd(local.year, local.month, local.day, daysUntilSat);
    const sundayYmd = addDaysYmd(local.year, local.month, local.day, daysUntilSat + 1);

    const banners = await loadScheduledBanners(env);
    const satBanner = findCoveringBanner(banners, saturdayYmd);
    const sunBanner = findCoveringBanner(banners, sundayYmd);

    summary.saturday = { date: saturdayYmd, covered: !!satBanner, bannerId: satBanner?.id };
    summary.sunday = { date: sundayYmd, covered: !!sunBanner, bannerId: sunBanner?.id };

    if (satBanner && sunBanner) {
        summary.skipped = true;
        summary.reason = 'Both Saturday and Sunday are covered.';
        return summary;
    }

    const [users, muted] = await Promise.all([loadUsers(env), loadMutedRecipients(env)]);
    const recipients = buildRecipientList(users, muted, env.ADMIN_EMAILS);
    summary.recipients = recipients;

    if (recipients.length === 0) {
        summary.skipped = true;
        summary.reason = 'No recipients (all muted or none invited).';
        return summary;
    }

    summary.emailId = await sendResend(env, recipients, summary.saturday, summary.sunday);
    return summary;
}

const HOLIDAY_LEAD_DAYS = 2;

async function runHolidayCheck(env: Env, local: LocalParts, _opts: { force?: boolean }): Promise<HolidayCheckSummary> {
    const summary: HolidayCheckSummary = { skipped: false };

    const targetYmd = addDaysYmd(local.year, local.month, local.day, HOLIDAY_LEAD_DAYS);
    const holiday = holidayOnDate(targetYmd);
    if (!holiday) {
        summary.skipped = true;
        summary.reason = `No holiday on ${targetYmd}`;
        return summary;
    }

    const banners = await loadScheduledBanners(env);
    const covered = !!findCoveringBanner(banners, holiday.date);
    summary.holiday = {
        date: holiday.date,
        key: holiday.key,
        name: holiday.name,
        category: holiday.category,
        covered
    };

    // We DO email even if a banner is covered — the email copy adapts to confirm coverage.
    // This keeps staff in the loop ("a banner is already scheduled, here's a heads-up").
    // If you'd rather skip when covered, set skipIfCovered=true.
    const skipIfCovered = false;
    if (covered && skipIfCovered) {
        summary.skipped = true;
        summary.reason = 'Holiday already has a banner scheduled.';
        return summary;
    }

    const [users, muted] = await Promise.all([loadUsers(env), loadMutedRecipients(env)]);
    const recipients = buildRecipientList(users, muted, env.ADMIN_EMAILS);
    summary.recipients = recipients;

    if (recipients.length === 0) {
        summary.skipped = true;
        summary.reason = 'No recipients (all muted or none invited).';
        return summary;
    }

    summary.emailId = await sendHolidayResend(env, recipients, holiday, HOLIDAY_LEAD_DAYS, covered);
    return summary;
}

async function runCheck(env: Env, opts: { force?: boolean } = {}): Promise<RunSummary> {
    const now = new Date();
    const local = partsInZone(now, env.TZ_NAME);
    const summary: RunSummary = {
        ranAt: now.toISOString(),
        localHour: local.hour,
        skipped: false
    };

    if (!opts.force) {
        // Only fire at local 9am — drops the wrong-DST cron.
        if (local.hour !== 9) {
            summary.skipped = true;
            summary.reason = `Local hour is ${local.hour} (skipping wrong-DST cron)`;
            return summary;
        }
    }

    // Run both checks. Each is independently allowed to fail without taking
    // the other down.
    const [weekendResult, holidayResult] = await Promise.allSettled([
        runWeekendCheck(env, local, opts),
        runHolidayCheck(env, local, opts)
    ]);

    if (weekendResult.status === 'fulfilled') {
        summary.weekendCheck = weekendResult.value;
    } else {
        summary.weekendCheck = { skipped: true, reason: 'error: ' + (weekendResult.reason?.message || String(weekendResult.reason)) };
    }
    if (holidayResult.status === 'fulfilled') {
        summary.holidayCheck = holidayResult.value;
    } else {
        summary.holidayCheck = { skipped: true, reason: 'error: ' + (holidayResult.reason?.message || String(holidayResult.reason)) };
    }
    return summary;
}

/* ──────────────────────────────────────────────
   Admin actions: verify ID token + delete user
   ────────────────────────────────────────────── */

interface FirebaseJwtPayload {
    iss: string;
    aud: string;
    auth_time: number;
    user_id: string;
    sub: string;
    iat: number;
    exp: number;
    email?: string;
    email_verified?: boolean;
    firebase?: any;
}

// Cache Google's public signing certs for ID-token verification.
let cachedSigningKeys: { keys: Record<string, CryptoKey>; expiresAt: number } | null = null;

async function getFirebaseSigningKeys(): Promise<Record<string, CryptoKey>> {
    const now = Math.floor(Date.now() / 1000);
    if (cachedSigningKeys && cachedSigningKeys.expiresAt - 60 > now) {
        return cachedSigningKeys.keys;
    }

    const res = await fetch(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!res.ok) {
        throw new Error(`Failed to fetch Firebase signing keys (${res.status})`);
    }
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
    const certs = (await res.json()) as Record<string, string>;

    const keys: Record<string, CryptoKey> = {};
    for (const [kid, pem] of Object.entries(certs)) {
        try {
            const der = pemCertToDer(pem);
            const key = await crypto.subtle.importKey(
                'spki',
                der,
                { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
                false,
                ['verify']
            );
            keys[kid] = key;
        } catch (e) {
            // skip bad cert
        }
    }
    cachedSigningKeys = { keys, expiresAt: now + maxAge };
    return keys;
}

// Convert an X.509 PEM certificate to its SubjectPublicKeyInfo DER for crypto.subtle.importKey.
function pemCertToDer(pem: string): ArrayBuffer {
    const cleaned = pem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/[\r\n\s]+/g, '');
    const certBytes = base64ToBytes(cleaned);
    return extractSpkiFromCertificate(certBytes);
}

function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function base64UrlToBytes(b64url: string): Uint8Array {
    const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (b64url.length % 4)) % 4);
    return base64ToBytes(padded);
}

// Walk an X.509 certificate's DER to extract the SubjectPublicKeyInfo.
// X.509 structure: SEQUENCE { tbsCert SEQUENCE { ..., subjectPublicKeyInfo SEQUENCE {...} }, sigAlg, sigVal }
function extractSpkiFromCertificate(cert: Uint8Array): ArrayBuffer {
    let offset = 0;
    function readLen(): number {
        const first = cert[offset++];
        if ((first & 0x80) === 0) return first;
        const numBytes = first & 0x7f;
        let len = 0;
        for (let i = 0; i < numBytes; i++) len = (len << 8) | cert[offset++];
        return len;
    }
    function expect(tag: number) {
        if (cert[offset++] !== tag) throw new Error('Unexpected ASN.1 tag while parsing certificate');
    }
    expect(0x30); readLen(); // outer cert SEQUENCE
    expect(0x30); const tbsLen = readLen(); // tbsCertificate SEQUENCE
    const tbsEnd = offset + tbsLen;

    // Optional [0] EXPLICIT version
    if (cert[offset] === 0xa0) {
        offset++;
        const ctxLen = readLen();
        offset += ctxLen;
    }
    function skipField() {
        offset++; // tag
        const len = readLen();
        offset += len;
    }
    skipField(); // serialNumber (INTEGER)
    skipField(); // signature (AlgorithmIdentifier SEQUENCE)
    skipField(); // issuer (Name SEQUENCE)
    skipField(); // validity (SEQUENCE)
    skipField(); // subject (Name SEQUENCE)

    // subjectPublicKeyInfo
    if (cert[offset] !== 0x30) throw new Error('Expected subjectPublicKeyInfo SEQUENCE');
    const spkiStart = offset;
    offset++; // SEQUENCE tag
    const spkiContentLen = readLen();
    const spkiTotalLen = (offset - spkiStart) + spkiContentLen;
    const spki = cert.slice(spkiStart, spkiStart + spkiTotalLen);
    if (offset > tbsEnd) throw new Error('Cert parse overran tbsCertificate');
    return spki.buffer.slice(spki.byteOffset, spki.byteOffset + spki.byteLength) as ArrayBuffer;
}

async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<FirebaseJwtPayload> {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Malformed ID token');
    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerB64)));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64))) as FirebaseJwtPayload;

    if (header.alg !== 'RS256') throw new Error(`Unexpected alg: ${header.alg}`);
    if (!header.kid) throw new Error('ID token missing kid');

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) throw new Error('ID token expired');
    if (payload.iat > now + 60) throw new Error('ID token issued in the future');
    if (payload.aud !== projectId) throw new Error('ID token audience mismatch');
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('ID token issuer mismatch');
    if (!payload.sub) throw new Error('ID token has no sub');

    const keys = await getFirebaseSigningKeys();
    const key = keys[header.kid];
    if (!key) throw new Error('ID token signed with unknown kid');

    const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = base64UrlToBytes(sigB64);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, signed);
    if (!ok) throw new Error('ID token signature invalid');

    return payload;
}

async function deleteFirebaseUser(env: Env, uid: string): Promise<void> {
    const token = await getGoogleAccessToken(env);
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:delete`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ localId: uid })
        }
    );
    if (!res.ok && res.status !== 404) {
        const body = await res.text();
        throw new Error(`Auth delete failed (${res.status}): ${body}`);
    }
}

async function deleteFirestoreUserDoc(env: Env, uid: string): Promise<void> {
    const token = await getGoogleAccessToken(env);
    const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    if (!res.ok && res.status !== 404) {
        const body = await res.text();
        throw new Error(`Firestore user-doc delete failed (${res.status}): ${body}`);
    }
}

function corsHeaders(origin: string | null): Record<string, string> {
    // Allow any origin for the admin endpoint; the auth gate is the verified ID token.
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
}

async function handleDeleteUser(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin);
    const adminList = (env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    const authHeader = request.headers.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/.exec(authHeader);
    if (!match) {
        return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }
    const idToken = match[1].trim();

    let payload: FirebaseJwtPayload;
    try {
        payload = await verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID);
    } catch (e: any) {
        return new Response(JSON.stringify({ error: 'Invalid ID token: ' + (e?.message || String(e)) }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const callerEmail = (payload.email || '').trim().toLowerCase();
    if (!callerEmail || adminList.indexOf(callerEmail) < 0) {
        return new Response(JSON.stringify({ error: 'Caller is not an admin' }), {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    let body: { uid?: string; email?: string };
    try {
        body = (await request.json()) as { uid?: string; email?: string };
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const uid = (body.uid || '').trim();
    if (!uid) {
        return new Response(JSON.stringify({ error: 'Missing uid' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    // Belt + suspenders: don't let admins delete each other.
    const targetEmail = (body.email || '').trim().toLowerCase();
    if (targetEmail && adminList.indexOf(targetEmail) >= 0) {
        return new Response(JSON.stringify({ error: 'Cannot delete an admin account' }), {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    try {
        await deleteFirebaseUser(env, uid);
        await deleteFirestoreUserDoc(env, uid);
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ ok: true, uid }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
    });
}

async function handleSendReminder(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin);
    const adminList = (env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    const authHeader = request.headers.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/.exec(authHeader);
    if (!match) {
        return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    let payload: FirebaseJwtPayload;
    try {
        payload = await verifyFirebaseIdToken(match[1].trim(), env.FIREBASE_PROJECT_ID);
    } catch (e: any) {
        return new Response(JSON.stringify({ error: 'Invalid ID token: ' + (e?.message || String(e)) }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const callerEmail = (payload.email || '').trim().toLowerCase();
    if (!callerEmail || adminList.indexOf(callerEmail) < 0) {
        return new Response(JSON.stringify({ error: 'Caller is not an admin' }), {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    let body: { recipients?: string[] };
    try {
        body = (await request.json()) as { recipients?: string[] };
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const recipients = (Array.isArray(body.recipients) ? body.recipients : [])
        .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (recipients.length === 0) {
        return new Response(JSON.stringify({ error: 'Provide at least one valid recipient email' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }
    if (recipients.length > 50) {
        return new Response(JSON.stringify({ error: 'Too many recipients (max 50)' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    // Compute the upcoming Sat & Sun in the brand timezone, regardless of when
    // the admin presses the button — so the email content stays accurate.
    const now = new Date();
    const local = partsInZone(now, env.TZ_NAME);
    const todayWeekday = local.weekday;
    let daysUntilSat = (6 - todayWeekday + 7) % 7;
    if (daysUntilSat === 0) daysUntilSat = 0; // today is already Saturday — show today
    const saturdayYmd = addDaysYmd(local.year, local.month, local.day, daysUntilSat);
    const sundayYmd = addDaysYmd(local.year, local.month, local.day, daysUntilSat + 1);

    let satCovered = false;
    let sunCovered = false;
    try {
        const banners = await loadScheduledBanners(env);
        satCovered = !!findCoveringBanner(banners, saturdayYmd);
        sunCovered = !!findCoveringBanner(banners, sundayYmd);
    } catch (e) {
        // If Firestore is unreachable, default to "not covered" so the email
        // still goes out and admins know to check.
    }

    let emailId = '';
    try {
        emailId = await sendResend(
            env,
            recipients,
            { date: saturdayYmd, covered: satCovered },
            { date: sundayYmd, covered: sunCovered }
        );
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
        ok: true,
        emailId,
        recipients,
        saturday: { date: saturdayYmd, covered: satCovered },
        sunday: { date: sundayYmd, covered: sunCovered },
        sentBy: callerEmail
    }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
    });
}

async function handleSendHolidayReminder(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin);
    const adminList = (env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    const authHeader = request.headers.get('authorization') || '';
    const bearer = /^Bearer\s+(.+)$/.exec(authHeader);
    if (!bearer) {
        return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    let payload: FirebaseJwtPayload;
    try {
        payload = await verifyFirebaseIdToken(bearer[1].trim(), env.FIREBASE_PROJECT_ID);
    } catch (e: any) {
        return new Response(JSON.stringify({ error: 'Invalid ID token: ' + (e?.message || String(e)) }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const callerEmail = (payload.email || '').trim().toLowerCase();
    if (!callerEmail || adminList.indexOf(callerEmail) < 0) {
        return new Response(JSON.stringify({ error: 'Caller is not an admin' }), {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    let body: { recipients?: string[]; holidayKey?: string; date?: string };
    try {
        body = (await request.json()) as any;
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const recipients = (Array.isArray(body.recipients) ? body.recipients : [])
        .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (recipients.length === 0) {
        return new Response(JSON.stringify({ error: 'Provide at least one valid recipient email' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }
    if (recipients.length > 50) {
        return new Response(JSON.stringify({ error: 'Too many recipients (max 50)' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    // Pick the target holiday: explicit `date` wins, else the next holiday from now.
    const now = new Date();
    const local = partsInZone(now, env.TZ_NAME);
    let holiday: Holiday | null = null;
    let daysAway = 0;

    const explicitDate = typeof body.date === 'string' ? body.date.trim() : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
        holiday = holidayOnDate(explicitDate);
        if (!holiday) {
            return new Response(JSON.stringify({ error: `No known holiday on ${explicitDate}` }), {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' }
            });
        }
        const todayMs = Date.UTC(local.year, local.month - 1, local.day);
        const [hy, hm, hd] = explicitDate.split('-').map((s) => parseInt(s, 10));
        daysAway = Math.round((Date.UTC(hy, hm - 1, hd) - todayMs) / 86400000);
    } else {
        // Next upcoming holiday across the next 90 days.
        for (let i = 0; i < 90; i++) {
            const target = addDaysYmd(local.year, local.month, local.day, i);
            const h = holidayOnDate(target);
            if (h) { holiday = h; daysAway = i; break; }
        }
        if (!holiday) {
            return new Response(JSON.stringify({ error: 'No holiday found in the next 90 days.' }), {
                status: 404,
                headers: { ...cors, 'Content-Type': 'application/json' }
            });
        }
    }

    let covered = false;
    try {
        const banners = await loadScheduledBanners(env);
        covered = !!findCoveringBanner(banners, holiday.date);
    } catch (e) {
        // ignore — default to false
    }

    let emailId = '';
    try {
        emailId = await sendHolidayResend(env, recipients, holiday, daysAway, covered);
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
        ok: true,
        emailId,
        recipients,
        holiday: { date: holiday.date, key: holiday.key, name: holiday.name, category: holiday.category, covered, daysAway },
        sentBy: callerEmail
    }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
    });
}

async function handleListUsers(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin);
    const adminList = (env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    const authHeader = request.headers.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/.exec(authHeader);
    if (!match) {
        return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    let payload: FirebaseJwtPayload;
    try {
        payload = await verifyFirebaseIdToken(match[1].trim(), env.FIREBASE_PROJECT_ID);
    } catch (e: any) {
        return new Response(JSON.stringify({ error: 'Invalid ID token: ' + (e?.message || String(e)) }), {
            status: 401,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const callerEmail = (payload.email || '').trim().toLowerCase();
    if (!callerEmail || adminList.indexOf(callerEmail) < 0) {
        return new Response(JSON.stringify({ error: 'Caller is not an admin' }), {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    let authUsers: AuthUserRecord[] = [];
    try {
        authUsers = await listAuthUsers(env);
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    // Overlay Firestore-side metadata (invitedBy/invitedAt + admin-toggled disabled).
    const firestoreMeta = new Map<string, any>();
    try {
        const docs = await firestoreList(env, 'users');
        for (const d of docs) {
            const data = decodeFields(d.fields);
            const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
            if (email) {
                firestoreMeta.set(email, {
                    disabled: data.disabled === true,
                    invitedBy: data.invitedBy || null,
                    invitedAt: data.invitedAt || null
                });
            }
        }
    } catch (e) {
        // ignore — Firestore /users may not exist yet
    }

    const muted = await loadMutedRecipients(env);

    const users = authUsers.map((u) => {
        const meta = firestoreMeta.get(u.email) || {};
        return {
            uid: u.uid,
            email: u.email,
            disabled: u.disabled || meta.disabled === true,
            isAdmin: adminList.indexOf(u.email) >= 0,
            isMuted: muted.has(u.email),
            createdAt: u.createdAt || null,
            lastLoginAt: u.lastLoginAt || null,
            invitedBy: meta.invitedBy || null,
            invitedAt: meta.invitedAt || null
        };
    });

    users.sort((a, b) => a.email.localeCompare(b.email));

    return new Response(JSON.stringify({ ok: true, users, admins: adminList }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
    });
}

/* ──────────────────────────────────────────────
   Worker entry points
   ────────────────────────────────────────────── */

export default {
    async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil((async () => {
            try {
                const summary = await runCheck(env);
                console.log('[mmc-reminders] cron summary', JSON.stringify(summary));
            } catch (err) {
                console.error('[mmc-reminders] cron error', err);
            }
        })());
    },

    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // CORS preflight.
        if (request.method === 'OPTIONS' && (url.pathname.startsWith('/admin/') || url.pathname === '/holidays')) {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(request.headers.get('origin'))
            });
        }

        // POST /admin/delete-user — admin-only via verified Firebase ID token
        if (url.pathname === '/admin/delete-user' && request.method === 'POST') {
            return handleDeleteUser(request, env);
        }

        // GET /admin/list-users — admin-only roster of every Firebase Auth account
        if (url.pathname === '/admin/list-users' && request.method === 'GET') {
            return handleListUsers(request, env);
        }

        // POST /admin/send-reminder — admin-only manual reminder send
        if (url.pathname === '/admin/send-reminder' && request.method === 'POST') {
            return handleSendReminder(request, env);
        }

        // POST /admin/send-holiday-reminder — admin-only manual holiday reminder send
        if (url.pathname === '/admin/send-holiday-reminder' && request.method === 'POST') {
            return handleSendHolidayReminder(request, env);
        }

        // GET /holidays?from=YYYY-MM-DD&days=180 — public list of upcoming holidays.
        // Used by the Briefing Room UI to populate a dropdown. Read-only and not sensitive.
        if (url.pathname === '/holidays' && request.method === 'GET') {
            const from = url.searchParams.get('from') || '';
            const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '180', 10) || 180));
            const now = new Date();
            const local = partsInZone(now, env.TZ_NAME);
            let startYear = local.year, startMonth = local.month, startDay = local.day;
            if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
                const [y, m, d] = from.split('-').map((s) => parseInt(s, 10));
                startYear = y; startMonth = m; startDay = d;
            }
            const out: Holiday[] = [];
            for (let i = 0; i < days; i++) {
                const target = addDaysYmd(startYear, startMonth, startDay, i);
                const h = holidayOnDate(target);
                if (h) out.push(h);
            }
            return new Response(JSON.stringify({ holidays: out }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders(request.headers.get('origin'))
                }
            });
        }

        // GET / — quick health check
        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response('mmc-reminders ok', { status: 200 });
        }

        // POST /run?token=... — manual trigger for testing.
        // Uses the Resend API key as a shared secret to gate the endpoint, since
        // we don't want anyone on the internet triggering reminders.
        if (url.pathname === '/run' && request.method === 'POST') {
            const provided = url.searchParams.get('token') || request.headers.get('x-mmc-token') || '';
            if (!env.RESEND_API_KEY || provided !== env.RESEND_API_KEY) {
                return new Response('Unauthorized', { status: 401 });
            }
            const force = url.searchParams.get('force') === '1';
            try {
                const summary = await runCheck(env, { force });
                return new Response(JSON.stringify(summary, null, 2), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err: any) {
                return new Response(JSON.stringify({ error: err?.message || String(err) }, null, 2), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        return new Response('Not found', { status: 404 });
    }
};
