/**
 * MMC weekend-schedule reminder Worker.
 *
 * Cron: Wednesdays, Thursdays, and Fridays at 9:00 AM America/New_York.
 * Two cron triggers (13:00 UTC and 14:00 UTC) cover EDT and EST. We pick the
 * one that lands on local hour 9 and skip the other.
 *
 * For each fire, we look at the upcoming Saturday and Sunday and check whether
 * Firestore's `scheduledBanners` covers each day. If either Sat or Sun is
 * uncovered, we email the user roster (minus muted recipients) via Resend.
 */

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
    saturday?: { date: string; covered: boolean; bannerId?: string };
    sunday?: { date: string; covered: boolean; bannerId?: string };
    recipients?: string[];
    emailId?: string;
    error?: string;
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
        scope: 'https://www.googleapis.com/auth/datastore',
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

async function loadUsers(env: Env): Promise<UserRecord[]> {
    let docs: any[] = [];
    try {
        docs = await firestoreList(env, 'users');
    } catch (e) {
        // Collection may not exist yet — treat as empty.
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

    return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#0071e3;">MMC Briefing Room</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;letter-spacing:-0.02em;line-height:1.25;">Weekend schedule needs to be set</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 4px;font-size:15px;line-height:1.55;color:#1d1d1f;">
              <p style="margin:0 0 12px;">Hi team —</p>
              <p style="margin:0 0 12px;">Heads up: <strong>${missingLine}</strong> ${missing.length === 2 ? 'have' : 'has'} no scheduled banner yet. Patients visiting the website won't see the weekend hours until someone publishes one.</p>
              <p style="margin:0 0 20px;">Please pop into the Briefing Room when you have a moment and add the weekend banner.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <a href="${siteUrl}" style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:10px;">Open the Briefing Room</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;font-size:13px;color:#86868b;line-height:1.55;border-top:1px solid #f0f0f3;">
              <p style="margin:14px 0 4px;">You're receiving this because you have edit access to the MMC website.</p>
              <p style="margin:0;">An admin can mute these reminders for you in the Briefing Room → <em>Email Mute List</em>.</p>
              <p style="margin:14px 0 0;"><a href="${publicSiteUrl}" style="color:#0071e3;text-decoration:none;">${publicSiteUrl}</a></p>
            </td>
          </tr>
        </table>
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
   Main check
   ────────────────────────────────────────────── */

async function runCheck(env: Env, opts: { force?: boolean } = {}): Promise<RunSummary> {
    const now = new Date();
    const local = partsInZone(now, env.TZ_NAME);
    const summary: RunSummary = {
        ranAt: now.toISOString(),
        localHour: local.hour,
        skipped: false
    };

    if (!opts.force) {
        // Only fire at local 9am on Wed/Thu/Fri.
        if (local.hour !== 9) {
            summary.skipped = true;
            summary.reason = `Local hour is ${local.hour} (skipping wrong-DST cron)`;
            return summary;
        }
        if (local.weekday !== 3 && local.weekday !== 4 && local.weekday !== 5) {
            summary.skipped = true;
            summary.reason = `Local weekday is ${local.weekday} (not Wed/Thu/Fri)`;
            return summary;
        }
    }

    // Compute upcoming Sat & Sun *local* dates.
    // weekday 3=Wed, 4=Thu, 5=Fri → Sat is in (6 - weekday) days, Sun the day after.
    const todayWeekday = local.weekday;
    const daysUntilSat = (6 - todayWeekday + 7) % 7 || 7; // never 0 on Wed/Thu/Fri
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // CORS preflight for the admin endpoint.
        if (request.method === 'OPTIONS' && url.pathname === '/admin/delete-user') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(request.headers.get('origin'))
            });
        }

        // POST /admin/delete-user — admin-only via verified Firebase ID token
        if (url.pathname === '/admin/delete-user' && request.method === 'POST') {
            return handleDeleteUser(request, env);
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
