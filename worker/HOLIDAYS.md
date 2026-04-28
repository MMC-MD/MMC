# Holiday calendar logic

The reminder Worker sends a heads-up email **2 days before** each of the
holidays listed below. Cron runs daily at 9 AM America/New_York; on every
fire it looks 2 days into the future and emails if a known holiday lands
there.

## What the system tracks

### Federal holidays (deterministic — never need updating)

| Holiday | Rule |
|---|---|
| New Year's Day | January 1 (shifts to Friday/Monday if on weekend) |
| Martin Luther King Jr. Day | 3rd Monday in January |
| Presidents' Day | 3rd Monday in February |
| Memorial Day | Last Monday in May |
| Juneteenth | June 19 (with weekend shift) |
| Independence Day | July 4 (with weekend shift) |
| Labor Day | 1st Monday in September |
| Veterans Day | November 11 (with weekend shift) |
| Thanksgiving | 4th Thursday in November |
| Christmas Day | December 25 (with weekend shift) |

### Office observances (deterministic)

| Holiday | Rule |
|---|---|
| Good Friday | 2 days before Easter Sunday (Anonymous Gregorian / Meeus algorithm) |
| Day After Thanksgiving | Day after the 4th Thursday in November |
| Christmas Eve | December 24 |
| New Year's Eve | December 31 |

### Skipped on purpose

- **Columbus / Indigenous Peoples' Day** — most clinics don't observe.
- **Mother's Day, Father's Day, Halloween** — not closure days.
- **Easter Sunday** — always a Sunday, office already closed.
- **Hanukkah, Purim, minor Jewish holidays** — work isn't traditionally restricted.

### Jewish holidays (table-based)

The Hebrew calendar is lunisolar and can't be computed from a simple "Nth weekday"
rule. Dates come from a **generated table** in
[`src/jewish-holidays.ts`](src/jewish-holidays.ts), built from
[hebcal.com](https://www.hebcal.com)'s Diaspora-rules JSON feed.

Currently covers **2026–2040**.

| Holiday | What we send |
|---|---|
| Rosh Hashanah | First day only |
| Yom Kippur | The day |
| Sukkot | First day only |
| Shmini Atzeret / Simchat Torah | The day |
| Passover (Pesach I) | First seder day |
| Passover (Pesach VII) | Final "no work" day |
| Shavuot | First day only |

To extend coverage past 2040, run:

```bash
cd worker
./scripts/gen-jewish-holidays.sh
```

This regenerates `src/jewish-holidays.ts` from hebcal. Adjust `START` and
`END` at the top of the script to change the year range.

## Email behavior

- **2 days out**: email goes to admins + active invited users (minus muted).
- **If a banner is already scheduled** for the holiday: email still sends, but
  with copy that says "a banner is on the calendar — here's a heads-up to
  review it." Set `skipIfCovered = true` in `runHolidayCheck` to suppress
  the email when coverage exists.
- **Manual force-send**: `POST /admin/send-holiday-reminder` with a verified
  Firebase ID token (admin-gated). Body: `{ recipients: [...], date?: "YYYY-MM-DD" }`.
  If `date` is omitted, picks the next upcoming holiday in the next 90 days.

## Testing

Force a run regardless of date:

```bash
curl -X POST "https://mmc-reminders.efikess.workers.dev/run?token=$RESEND_API_KEY&force=1"
```

The response includes both `weekendCheck` and `holidayCheck` summaries.

List upcoming holidays:

```bash
curl "https://mmc-reminders.efikess.workers.dev/holidays?days=180"
```
