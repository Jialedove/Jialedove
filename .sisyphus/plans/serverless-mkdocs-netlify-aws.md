# Serverless Deploy: MkDocs on Netlify (AWS optional)

## TL;DR
> Summary: Make the MkDocs site deploy to Netlify (static hosting) with reproducible builds, while keeping GitHub Pages intact as rollback. AWS Lambda + DynamoDB is explicitly deferred until a real backend feature exists.
> Deliverables: pinned Python deps + clean CI build + Netlify config (build/publish/headers) + verification + rollback posture.
> Effort: Short
> Parallel: YES - 2 waves
> Critical Path: pin deps -> strict build green -> Netlify deploy config -> Netlify deploy + HTTP verification

## Context
### Original Request
- User wants to scrap the VPS self-host plan and use a modern serverless route:
  - Frontend: Vercel/Netlify hosting ($0 tier target)
  - Backend: AWS Lambda compute + DynamoDB storage ($0 tier target)

### Interview Summary
- Backend feature scope: none for now; do not build backend yet.
- AWS region preference (if/when used): ap-northeast-1 (Tokyo).
- API entrypoint preference (if/when used): Lambda Function URL first.
- Audience: China mainland primarily; no custom domain yet.
- Keep GitHub Pages deployment as rollback during cutover.

### Research Findings
- Site is a static MkDocs Material project; no backend API calls found in tracked source.
- `mkdocs.yml` currently sets `site_url` to GitHub Pages and uses `pymdownx.*` + `obsidian-interactive-graph`.
- Local `.venv` indicates a working dependency set:
  - mkdocs==1.6.1
  - mkdocs-material==9.7.2
  - pymdown-extensions==10.21
  - mkdocs-obsidian-interactive-graph-plugin==0.3.2
- AWS Lambda pricing states the Lambda free tier includes 1M requests/month and 400,000 GB-seconds/month: https://aws.amazon.com/lambda/pricing/
- AWS Free Tier program details (credits/free plan + always-free concepts): https://aws.amazon.com/free/

### Metis Review (gaps addressed)
- Canonical/indexing guardrail: avoid two public hosts both indexable; set one as canonical and set the other to noindex until domain decision.
- China constraints: Netlify/Vercel/GitHub Pages can be slow/unstable; reduce reliance on blocked third parties as a later milestone.
- Reproducibility: pin deps + lock Python runtime for Netlify builds.
- Rollback: do not assume the existing GH Pages workflow is correct; verify/build-only on PR and deploy only on main.

## Work Objectives
### Core Objective
- Deploy the site to Netlify as the primary static host with reproducible builds, while preserving a working GitHub Pages rollback.

### Deliverables
- `requirements.txt` pinned to known-working versions.
- Root `.gitignore` to avoid committing generated output.
- GitHub Actions GH Pages workflow: strict build on PR; deploy only on push to main; installs from requirements.
- Netlify config (`netlify.toml`) for build + publish + default headers.
- Netlify deployment runbook + verification commands.

### Definition of Done (agent-verifiable)
- `python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && mkdocs build --strict` exits 0.
- Netlify production URL returns HTTP 200 for `/` and a known asset path.
- Non-canonical host is not indexable (X-Robots-Tag: noindex or meta robots) until you decide a canonical domain.

### Cost Reality Check (important)
- Lambda free tier statement (1M requests + 400,000 GB-seconds per month) is from AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/
- API Gateway free tier is not necessarily always-free; the API Gateway pricing page describes a 12-month free tier for new customers: https://aws.amazon.com/api-gateway/pricing/
- DynamoDB free tier details vary by plan/account status; do not assume "$0 forever" without verifying your account's Free Plan / Paid Plan status on https://aws.amazon.com/free/
- Guardrails when AWS is later enabled:
  - Create AWS Budgets (actual + forecast) and alerts.
  - Keep Lambda out of VPC.
  - Set CloudWatch log retention.

### Must Have
- No long-lived AWS keys committed; prefer GitHub Actions OIDC when AWS is enabled.
- Netlify deploy does not require committing `site/`.

### Must NOT Have
- Do not provision AWS resources (Lambda/DynamoDB/API Gateway) until a real backend feature is defined.
- Do not introduce VPC/NAT for Lambda (breaks $0 assumptions quickly).

## Verification Strategy
- Test policy: `mkdocs build --strict` is the primary test.
- QA evidence files: `.sisyphus/evidence/task-{N}-{slug}.txt`

## Execution Strategy
### Parallel Execution Waves
Wave 1: repo changes for reproducible build + GH Pages safety.
Wave 2: Netlify deploy config + deploy + HTTP verification (+ optional noindex).

### Dependency Matrix
- Task 1 blocks: 2, 3, 4
- Task 2 blocks: none
- Task 3 blocks: 5
- Task 4 blocks: 5
- Task 5 blocks: none
- Task 6 blocks: none (optional)
- Task 7 blocks: none (optional)

### Agent Dispatch Summary
- Wave 1: Tasks 1-3 (repo/CI)
- Wave 2: Tasks 4-5 (Netlify)
- Post-cutover optional: Task 6 (canonical switch)
- Optional AWS prep: Task 7 (budgets/guardrails)

## TODOs
> Implementation + Test in one task.

- [x] 1. Pin Python dependencies for reproducible MkDocs builds

  What to do:
  - Add `requirements.txt` pinned to the observed working local versions:
    - mkdocs==1.6.1
    - mkdocs-material==9.7.2
    - pymdown-extensions==10.21
    - mkdocs-obsidian-interactive-graph-plugin==0.3.2
  - Document local build command (for Netlify parity): `pip install -r requirements.txt && mkdocs build --strict`.

  Must NOT do:
  - Do not rely on `.venv/` in CI.

  Recommended Agent Profile:
  - Category: writing
  - Skills: []

  Parallelization: Can Parallel: YES | Wave 1 | Blocks: 2, 3, 4 | Blocked By: none

  References:
  - `mkdocs.yml` (plugins/extensions used)
  - `.venv/lib/python3.14/site-packages/` (observed versions)
  - https://aws.amazon.com/lambda/pricing/ (free tier statement, for later AWS optional)

  Acceptance Criteria:
  - [ ] `python3 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -r requirements.txt && mkdocs build --strict` exits 0.

  QA Scenarios:
  ```
  Scenario: Clean strict build works
    Tool: Bash
    Steps: Run the Acceptance Criteria command in a clean environment.
    Expected: Build exits 0; no missing plugin/extension errors.
    Evidence: .sisyphus/evidence/task-1-requirements-build.txt
  ```

  Commit: YES | Message: chore(deps): pin mkdocs build dependencies | Files: requirements.txt

- [x] 2. Add root .gitignore to keep the repo clean

  What to do:
  - Add a root `.gitignore` that ignores at least:
    - `site/` (generated output)
    - `.venv/`
    - `.DS_Store`
    - `__pycache__/`

  Must NOT do:
  - Do not commit `site/`.

  Recommended Agent Profile:
  - Category: quick
  - Skills: []

  Parallelization: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: none

  References:
  - Repo currently shows untracked `site/` and tracked `.DS_Store` noise.

  Acceptance Criteria:
  - [ ] After `mkdocs build`, `git status --porcelain` does not show `?? site/`.

  QA Scenarios:
  ```
  Scenario: Build output stays untracked
    Tool: Bash
    Steps: Run `mkdocs build` then `git status --porcelain`.
    Expected: No untracked `site/` directory.
    Evidence: .sisyphus/evidence/task-2-gitignore.txt
  ```

  Commit: YES | Message: chore(repo): ignore generated site and venv | Files: .gitignore

- [x] 3. Make GitHub Pages workflow build-only on PR and deploy-only on main

  What to do:
  - Update `.github/workflows/PublishMySite.yml`:
    - Install from `requirements.txt` (not ad-hoc pip installs).
    - Use an explicit Python version (3.12).
    - Run `mkdocs build --strict` on pull_request.
    - Run `mkdocs gh-deploy --clean --force` only on push to `main`.

  Must NOT do:
  - Do not run `mkdocs gh-deploy` on PR events.

  Recommended Agent Profile:
  - Category: quick
  - Skills: []

  Parallelization: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: 1

  References:
  - `.github/workflows/PublishMySite.yml`
  - `mkdocs.yml` (requires non-default plugins/extensions)

  Acceptance Criteria:
  - [ ] On PR: workflow logs show strict build; no deploy step executes.
  - [ ] On main push: deploy step executes and updates `gh-pages`.

  QA Scenarios:
  ```
  Scenario: PR does not deploy
    Tool: Bash
    Steps: Open a PR; check workflow logs.
    Expected: mkdocs build runs; gh-deploy is skipped.
    Evidence: .sisyphus/evidence/task-3-pr-no-deploy.txt

  Scenario: Main deploy still works
    Tool: Bash
    Steps: Merge to main; check workflow logs.
    Expected: gh-deploy runs successfully.
    Evidence: .sisyphus/evidence/task-3-main-deploy.txt
  ```

  Commit: YES | Message: ci(pages): strict build on PR, deploy on main | Files: .github/workflows/PublishMySite.yml

- [x] 4. Add Netlify config for MkDocs build + publish + noindex guardrail

  What to do:
  - Add `netlify.toml` at repo root with:
    - Build command: `python -m pip install -U pip && pip install -r requirements.txt && mkdocs build --strict`
    - Publish directory: `site`
    - Environment: pin `PYTHON_VERSION` (3.12) in Netlify build environment.
  - Implement a safe default indexing posture while you have no custom domain:
    - Set `X-Robots-Tag: noindex` for all paths on Netlify (via `[[headers]]` in netlify.toml).
    - Rationale: avoid having two public hosts (Netlify and GitHub Pages) both indexable.
  - Document how to remove `noindex` later when you decide the canonical host.

  Must NOT do:
  - Do not commit `site/`.

  Recommended Agent Profile:
  - Category: writing
  - Skills: []

  Parallelization: Can Parallel: YES | Wave 2 | Blocks: 5 | Blocked By: 1

  References:
  - Netlify build config docs: https://docs.netlify.com/configure-builds/get-started/

  Acceptance Criteria:
  - [ ] Netlify build completes and publishes `site/` output.
  - [ ] `curl -sSI https://<NETLIFY_SITE>.netlify.app/ | tr -d '\r' | grep -i '^x-robots-tag: noindex'` exits 0.

  QA Scenarios:
  ```
  Scenario: Netlify build succeeds
    Tool: Bash
    Steps: Trigger a Netlify production deploy from main.
    Expected: Build command runs; publish dir is site; deploy succeeds.
    Evidence: .sisyphus/evidence/task-4-netlify-build.txt

  Scenario: Non-canonical host is noindex
    Tool: Bash
    Steps: curl -I the Netlify production URL.
    Expected: X-Robots-Tag: noindex present.
    Evidence: .sisyphus/evidence/task-4-noindex.txt
  ```

  Commit: YES | Message: ci(netlify): add mkdocs build config and noindex guardrail | Files: netlify.toml

- [x] 5. Deploy to Netlify and verify from the internet (no domain required)

  What to do:
  - Create a Netlify site and connect it to the GitHub repo (Netlify Git integration is preferred to avoid storing deploy tokens in GitHub).
  - Configure build settings (should auto-pick from `netlify.toml`).
  - Trigger a production deploy from the main branch.
  - Verify key pages and assets over HTTPS.

  Inputs required:
  - A Netlify account (and permission to create a site).
  - The final Netlify production URL: `https://<NETLIFY_SITE>.netlify.app`.

  Recommended Agent Profile:
  - Category: unspecified-high
  - Skills: [playwright] (only if doing dashboard automation)

  Parallelization: Can Parallel: NO | Wave 2 | Blocks: none | Blocked By: 3, 4

  Acceptance Criteria:
  - [ ] `curl -fsSI https://<NETLIFY_SITE>.netlify.app/ | head -n 1` contains `200`.
  - [ ] `curl -fsSI https://<NETLIFY_SITE>.netlify.app/javascripts/shortcuts.js | head -n 1` contains `200`.
  - [ ] `curl -fsSI https://<NETLIFY_SITE>.netlify.app/search/search_index.json | head -n 1` contains `200`.

  QA Scenarios:
  ```
  Scenario: Homepage loads
    Tool: Bash
    Steps: curl -I the Netlify homepage.
    Expected: 200.
    Evidence: .sisyphus/evidence/task-5-home.txt

  Scenario: Asset paths are correct
    Tool: Bash
    Steps: curl -I a known JS asset and search index.
    Expected: both 200.
    Evidence: .sisyphus/evidence/task-5-assets.txt
  ```

  Commit: NO | Message: n/a | Files: n/a

- [ ] 6. (Optional) Switch canonical host to Netlify/domain and remove noindex

  When to do this:
  - Only after you decide Netlify (or your custom domain pointing to Netlify) is the canonical public site.

  What to do:
  - Remove the global `X-Robots-Tag: noindex` header from `netlify.toml`.
  - Update `mkdocs.yml:site_url` to the new canonical URL:
    - If using Netlify default domain: `https://<NETLIFY_SITE>.netlify.app/`
    - If using a custom domain: `https://example.com/`
  - Re-deploy to Netlify.
  - Ensure GitHub Pages is treated as rollback-only (it may now have non-canonical URLs).

  Must NOT do:
  - Do not enable HSTS at this stage.

  Recommended Agent Profile:
  - Category: writing
  - Skills: []

  Parallelization: Can Parallel: YES | Wave Post-cutover | Blocks: none | Blocked By: 5

  Acceptance Criteria:
  - [ ] `mkdocs build` output contains canonical links with the new base URL:
    - `mkdocs build --strict && grep -R "rel=\"canonical\"" -n site/ | head -n 5` shows the expected domain.
  - [ ] `curl -sSI https://<NETLIFY_SITE>.netlify.app/ | tr -d '\r' | grep -i '^x-robots-tag:'` has no `noindex` value.

  QA Scenarios:
  ```
  Scenario: Canonical URL is updated
    Tool: Bash
    Steps: Build and grep for rel="canonical".
    Expected: canonical href base matches the chosen host.
    Evidence: .sisyphus/evidence/task-6-canonical.txt
  ```

  Commit: MAYBE | Message: chore(site): switch canonical site_url to netlify | Files: mkdocs.yml, netlify.toml

- [ ] 7. (Optional) AWS account guardrails (no resources yet)

  Goal:
  - Keep the "$0" intent realistic by preventing surprise bills when you later enable Lambda/DynamoDB.

  What to do:
  - In the AWS account you will use for this project:
    - Set AWS Budgets alerts (actual + forecast) for a very low monthly cap.
    - Ensure CloudWatch log retention defaults are not "never expire".
  - Do not create Lambda/DynamoDB until a backend feature is defined.

  References:
  - AWS Free Tier: https://aws.amazon.com/free/
  - Lambda pricing/free tier statement: https://aws.amazon.com/lambda/pricing/

  Acceptance Criteria:
  - [ ] A budget exists and will email on threshold breach.

  QA Scenarios:
  ```
  Scenario: Budget configured
    Tool: Playwright (or AWS Console) / Bash (if using AWS CLI)
    Steps: Verify budget exists and notifications are configured.
    Expected: Budget visible; notifications set.
    Evidence: .sisyphus/evidence/task-7-budgets.txt
  ```

  Commit: NO | Message: n/a | Files: n/a

## Final Verification Wave (4 parallel agents, ALL must approve)
- [ ] F1. Plan Compliance Audit - oracle
- [ ] F2. Code Quality Review - unspecified-high
- [ ] F3. Real Manual QA - unspecified-high
- [ ] F4. Scope Fidelity Check - deep

## Commit Strategy
Suggested atomic commits:
- chore(deps): pin mkdocs build dependencies
- chore(repo): ignore generated site and venv
- ci(pages): strict build on PR, deploy on main
- ci(netlify): add mkdocs build config and noindex guardrail

## Success Criteria
- Netlify deploy URL is live and serves the site correctly.
- GitHub Pages remains deployable as rollback.
- Builds are reproducible and strict.
