# ResortOS R-6 — synthetic controlled source only

This public repository is intentionally separate from the private ResortOS application.
It may contain **only** `README.md`, `.gitignore`, `.github/workflows/r6-pages.yml` and the four scripts in `tools/r6-controlled-source/`.
No real project data, API tokens, CI secrets, owners' personal data, backend code, or deployment keys are allowed.

**Required repo name:** `<GITHUB_ACCOUNT>/<GITHUB_ACCOUNT>.github.io` (public user/org Pages root site). Do not use a project repository named `r6-fixtures`: the ResortOS crawler requests `https://HOST/robots.txt`, not `https://HOST/r6-fixtures/robots.txt`.

1. Create the public Pages root repository under a controlled account with no existing root Pages site. Choose its default branch `main`. Commit the sanitized files from `export-pages.mjs`.
2. As repository admin, open **Settings → Pages → Build and deployment → Source: GitHub Actions**. Pages deployment environment `github-pages` is scoped to `main`. Configure protections so only `main` can deploy. Make sure the repo owner account permits Pages and Actions.
3. Under **Actions → R6 Synthetic Source — Manual GitHub Pages Stage → Run workflow**, select stage `01-first`. There is NO push/PR/schedule trigger. A workflow must be on the default branch to expose Run workflow.
4. After its Pages deployment succeeds, retrieve the **real** root URL via Settings → Pages. Then check the actual public bytes from a trusted machine:
   `node tools/r6-controlled-source/check-published.mjs https://ACCOUNT.github.io/ 01-first`.
5. Run ONLY the authorized WEB connector against `https://ACCOUNT.github.io/projects/index.html` with `allowedHosts=[ACCOUNT.github.io]` and `allowedPathPrefixes=['/projects/']`. Before each run, check `stage.txt`, `manifest.json` and `robots.txt`. Use existing configured User-Agent; do not invent one. Store run ID, immutable HTML/S3 checksum, staging/revision/price evidence and any explicit Owner link decision.
6. Publish the next stage **manually**, confirm the new marker and hashes, and repeat sequentially. Page disappearance must produce HTTP 404, not assumed SOLD. After stage 07, keep or unpublish only as approved by owner.

GitHub Pages CDN response caching cannot be disabled using a Render-style `Cache-Control: no-store` configuration. The validator adds a cache-busting query and, more importantly, fails closed if published stage or SHA-256 checksums do not match. Wait for confirmed propagation before calling the importer.

The site is publicly accessible even though this project originated in a private repository. Do not treat it as an approved real source or 07.10 acceptance. Do not claim a live URL until a deployment succeeded and the origin/robots/page checks passed.
