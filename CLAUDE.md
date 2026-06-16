# MMC (mmccare.com) — Project Notes

Static marketing site for Montgomery Medical Clinic. Plain HTML/CSS/JS, Tailwind
(compiled to `css/tailwind.css`), no build framework. Homepage is `index.html`.

## Deployment — READ THIS BEFORE DEPLOYING

The live site **mmccare.com** is served by a **Cloudflare Pages** project named
`mmccare` (domains: `mmccare.pages.dev`, `mmccare.com`, `www.mmccare.com`). It is
Git-connected to `https://github.com/MMC-MD/MMC.git` and auto-builds on push to `main`.

**The `wrangler.jsonc` / `mmc-main` Worker in this repo does NOT serve the live site.**
Running `wrangler deploy` (or `npm run deploy`) deploys the `mmc-main` Worker, which
only lives at `mmc-main.efikess.workers.dev` and is a dead end — it has zero effect on
mmccare.com. Do not use it to publish site changes.

### Two gotchas that have bitten us

1. **Wrong Cloudflare account.** There are TWO Cloudflare accounts on this machine:
   - `helloman696@gmail.com` (account `880525208bdc647e35209379e29a28e5`) — WRONG, not the site.
   - `efikess@gmail.com` (account `f9f97955e7133d94264ef345bfa96e69`) — **CORRECT, owns the `mmccare` Pages project.**

   Before any deploy, confirm the active account:
   ```bash
   npx wrangler whoami
   ```
   If it is not `efikess@gmail.com` / `f9f9...`, fix it:
   ```bash
   npx wrangler logout
   npx wrangler login   # opens browser — sign in as efikess@gmail.com
   ```

2. **Production alias can get pinned to an old build.** Pushing to GitHub triggers a
   Pages build, but the production deployment (what mmccare.com actually serves) can be
   stuck on an older deployment even after newer builds succeed (e.g. after a manual
   rollback in the dashboard). Pushing more commits will NOT unstick it.

### How to publish site changes (the reliable way)

```bash
# 1. Commit + push (also keeps GitHub in sync)
git push

# 2. Confirm the right account
npx wrangler whoami        # must be efikess@gmail.com / f9f9...

# 3. Deploy current files straight to the Pages project as a fresh production deploy
npx wrangler pages deploy . --project-name mmccare --branch main --commit-dirty=true

# 4. VERIFY the live domain actually serves the new content (don't trust "Success")
curl -s https://mmccare.com/ | grep -o '<some unique string from your change>'
```

Always verify against `https://mmccare.com/` itself, not just the `*.mmccare.pages.dev`
preview URL — the preview can be correct while the custom-domain alias is stale.

## Misc

- Bilingual: most text carries `data-en` / `data-es` attributes; update both when
  editing copy (see `js/lang-toggle.js`).
- Header/footer are injected from `includes/` via `js/header-footer-loader.js`.
- Brand colors (`css/style.css`): `--medical-blue #0d47a1`, `--medical-orange #ff8f00`.
  `.btn-primary` = blue, `.btn-secondary` = orange.
