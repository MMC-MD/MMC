# mmc-reminders Worker

Sends a weekend-schedule reminder email via Resend on Wed/Thu/Fri at 9 AM
America/New_York if the upcoming Saturday or Sunday isn't covered by a
banner in Firestore's `scheduledBanners` collection.

## One-time setup

### 1. Generate a Firebase service-account key

The Worker reads Firestore using a service account (so it can read
`users` and `mutedRecipients`, which are admin-only).

1. Go to [Firebase Console → Project settings → Service accounts](https://console.firebase.google.com/project/mmcblog-6573f/settings/serviceaccounts/adminsdk).
2. Click **Generate new private key**. Save the JSON file somewhere safe — *don't commit it*.
3. Open it. You need two fields:
   - `client_email` — looks like `firebase-adminsdk-XXXXX@mmcblog-6573f.iam.gserviceaccount.com`
   - `private_key` — a multi-line string starting with `-----BEGIN PRIVATE KEY-----`

### 2. Install Wrangler & log in

```bash
cd worker
npm install
npx wrangler login
```

### 3. Set the secrets

Run each of these from the `worker/` directory. Wrangler will prompt for the value:

```bash
npx wrangler secret put RESEND_API_KEY
# paste your Resend API key

npx wrangler secret put FIREBASE_PROJECT_ID
# paste: mmcblog-6573f

npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_EMAIL
# paste the client_email from the JSON file

npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
# paste the entire private_key value INCLUDING the -----BEGIN/END----- lines.
# Wrangler accepts multi-line input — paste the literal newlines exactly as
# they appear in the JSON file (the value in the JSON has \n escapes; the
# code handles either real newlines or literal \n).
```

### 4. Deploy

```bash
npm run deploy
```

(or `npx wrangler deploy --config wrangler.toml` directly).

> **Note:** the parent repo has its own `wrangler.jsonc` for the public
> Cloudflare Pages site. Always pass `--config wrangler.toml` (or use
> `npm run deploy`) so wrangler picks up *this* Worker's config rather
> than walking up to the parent and trying to upload the entire repo
> as static assets.

Wrangler prints the Worker URL. Save it.

## Verify it works

Hit the health endpoint:

```bash
curl https://mmc-reminders.<your-subdomain>.workers.dev/health
# → mmc-reminders ok
```

Trigger a manual check (uses your Resend key as a shared secret):

```bash
# Dry-ish run: only sends if today is Wed/Thu/Fri at 9am ET
curl -X POST "https://mmc-reminders.<your-subdomain>.workers.dev/run?token=<RESEND_API_KEY>"

# Force a run regardless of day/time (good for end-to-end test):
curl -X POST "https://mmc-reminders.<your-subdomain>.workers.dev/run?token=<RESEND_API_KEY>&force=1"
```

The response is JSON describing what happened: which Saturday/Sunday it
checked, whether they were covered, the recipient list, and the Resend
email ID if one was sent.

## How the schedule works

The cron in `wrangler.toml` is:

```
0 13 * * 3,4,5
0 14 * * 3,4,5
```

Cloudflare cron runs in UTC and isn't DST-aware. 13:00 UTC is 9:00 AM EDT
(summer); 14:00 UTC is 9:00 AM EST (winter). The Worker checks the actual
local hour using `Intl.DateTimeFormat` and skips the run if it isn't 9.
Net effect: exactly one fire per day, year-round.

## Watching logs

```bash
npx wrangler tail
```

## Updating

After editing `src/index.ts` or `wrangler.toml`:

```bash
npx wrangler deploy
```

Secrets persist across deploys.

## Admin endpoint: `/admin/delete-user`

Stage 3 added `POST /admin/delete-user`, which:

1. Verifies a Firebase ID token from the calling user.
2. Confirms the caller's email is in `ADMIN_EMAILS`.
3. Deletes the target user's Firebase Auth account via the Identity Toolkit
   `accounts:delete` REST endpoint, then drops the `users/{uid}` Firestore doc.

Refuses to delete admin accounts.

The Briefing Room's "Remove" button calls this directly from the browser.

### One-time IAM grant for the service account

The service account that the Worker runs as needs permission to delete
Firebase Auth users. The auto-created Firebase Admin SDK service account
already has the **Firebase Authentication Admin** role by default, so usually
no extra IAM is needed.

If you see `PERMISSION_DENIED` errors when deleting, give the service account
the role manually:

1. Go to [Google Cloud IAM](https://console.cloud.google.com/iam-admin/iam?project=mmcblog-6573f).
2. Find the row for `firebase-adminsdk-…@mmcblog-6573f.iam.gserviceaccount.com`.
3. Click the pencil → **Add another role** → search for
   **Firebase Authentication Admin** → Save.
