#!/usr/bin/env bash
# Regenerate worker/src/jewish-holidays.ts from hebcal.com.
# Run from the worker/ directory. Edit START/END to expand the year range.

set -euo pipefail
cd "$(dirname "$0")/.."

START=2026
END=2040

CACHE=$(mktemp -d)
trap 'rm -rf "$CACHE"' EXIT

echo "Fetching $START–$END from hebcal.com…"
for y in $(seq "$START" "$END"); do
  curl -fsSL "https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=off&nx=off&year=${y}&month=x&ss=off&mf=off&c=off&geo=none" \
    > "$CACHE/${y}.json"
done

python3 - "$CACHE" > src/jewish-holidays.ts <<'PY'
import json, glob, sys, re, os

cache = sys.argv[1]
WANTED = [
    (r'^Rosh Hashana \d',      'rosh-hashanah',     'Rosh Hashanah'),
    (r'^Yom Kippur(?: |$)',    'yom-kippur',        'Yom Kippur'),
    (r'^Sukkot I(?: |$)',      'sukkot',            'Sukkot'),
    (r'^Shmini Atzeret(?: |$)','shmini-atzeret',    'Shmini Atzeret'),
    (r'^Pesach I(?: |$)',      'passover-day-1',    'Passover'),
    (r'^Pesach VII(?: |$)',    'passover-day-7',    'Passover (Last Day)'),
    (r'^Shavuot I(?: |$)',     'shavuot',           'Shavuot'),
]
patterns = [(re.compile(p), k, n) for p, k, n in WANTED]

rows = []
for path in sorted(glob.glob(os.path.join(cache, '*.json'))):
    with open(path) as f:
        data = json.load(f)
    for it in data.get('items', []):
        if it.get('category') != 'holiday':
            continue
        title = it.get('title', '')
        date = it.get('date', '')
        for pat, key, name in patterns:
            if pat.match(title):
                rows.append((date, key, name))
                break

seen = set()
uniq = []
for r in rows:
    if r in seen: continue
    seen.add(r)
    uniq.append(r)
uniq.sort()

years = sorted({r[0][:4] for r in uniq})
print('// AUTO-GENERATED. Do not edit by hand.')
print('// Source: hebcal.com (Diaspora dates, current Jewish calendar rules).')
print(f'// Covers Gregorian years {years[0]}-{years[-1]}.')
print('// Refresh after coverage runs out by re-running scripts/gen-jewish-holidays.sh.')
print()
print('export interface JewishHolidayEntry {')
print('    date: string;')
print('    key: string;')
print('    name: string;')
print('}')
print()
print('export const JEWISH_HOLIDAYS: JewishHolidayEntry[] = [')
for date, key, name in uniq:
    print(f"    {{ date: '{date}', key: '{key}', name: '{name}' }},")
print('];')

expected = len(WANTED)
for y in years:
    n = sum(1 for r in uniq if r[0].startswith(y))
    if n != expected:
        print(f'# WARN year {y}: {n}/{expected}', file=sys.stderr)
PY

echo "Wrote src/jewish-holidays.ts."
