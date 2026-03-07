# Self-Host MkDocs Site On VPS (Multi-Service Ready)

## TL;DR
> **Summary**: Self-host the existing MkDocs+Material site on a VPS using Docker Compose + Caddy, with CI building static artifacts and deploying via atomic releases (symlink switch) for fast rollback.
> **Deliverables**: VPS baseline hardening + Caddy static hosting stack + CI deploy workflow to VPS + pinned Python deps + verification/rollback playbook.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Pin deps/build green -> VPS hardening + Docker/Caddy up -> CI deploy to releases+symlink -> external HTTP verification

## Context
### Original Request
- "我现在要上线这个网站，我需要怎么做？" -> User chooses: rent/use own server (self-host) and redeploy.

### Interview Summary
- Target: self-host on a VPS; also host other services later on the same server.
- Current public site exists on GitHub Pages: `https://jialedove.github.io/Jialedove/` (keep as rollback during cutover).
- User audience mainly China mainland; user currently has an overseas VPS offer/spec (2 vCPU / 1GB RAM / 20GB SSD / 1TB transfer).
- No domain yet; initial staging must work via IP over HTTP.

### Metis Review (gaps addressed)
- Ensure reproducible builds with pinned deps including `pymdown-extensions` + `mkdocs-obsidian-interactive-graph-plugin`.
- Use atomic deploy: rsync into `/srv/mkdocs/releases/<id>/` then `current` symlink switch; never rsync into `current`.
- Docker bind-mount gotcha: mount the parent directory and point Caddy root at `/srv/mkdocs/current`.
- Separate "build" from "serve": CI builds `site/`; VPS only serves static.
- Avoid scope creep (no k8s/CDN/observability stack in v1).

## Work Objectives
### Core Objective
- Serve this MkDocs site from a VPS reliably and securely, with a deployment mechanism that is safe (atomic + rollback) and a foundation suitable for hosting more services later.

### Deliverables
- `requirements.txt` (pinned) and updated CI installs to match `mkdocs.yml` plugins/extensions.
- New VPS deploy workflow that builds and syncs `site/` to the server (releases+symlink).
- Server-side Compose stack: Caddy as the single edge proxy serving the static site (HTTP on IP).
- Hardening checklist executed (non-root admin, SSH hardening, firewall, unattended upgrades).
- Rollback procedure and verification commands.

### Definition of Done (verifiable conditions with commands)
- Local/CI build succeeds with pinned deps: `pip install -r requirements.txt && mkdocs build --strict` exits 0.
- VPS serves homepage over HTTP (loopback on VPS): `curl -fsS http://127.0.0.1/ | grep -F "Dove's Digital Garden"` exits 0.
- VPS serves custom JS: `curl -fsSI http://127.0.0.1/javascripts/shortcuts.js | head -n 1` shows `200`.
- Search index exists and non-empty: `curl -fsS http://127.0.0.1/search/search_index.json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('docs',[])))"` prints `> 0`.
- Compression works: `curl -fsSI -H 'Accept-Encoding: gzip' http://127.0.0.1/ | tr -d '\r' | grep -i '^content-encoding: gzip'` exits 0.
- Atomic deploy invariant: `test -L /srv/mkdocs/current && readlink /srv/mkdocs/current | grep -E '^/srv/mkdocs/releases/'` exits 0.

### Must Have
- Keep GitHub Pages deploy available as rollback path.
- CI deploy uses a dedicated deploy user and a dedicated SSH key.
- No secrets committed.

### Must NOT Have (guardrails)
- No Kubernetes.
- No database setup.
- No HSTS before domain+TLS is stable.
- No "rsync --delete" against broad paths like `/srv/mkdocs/` (only within a release dir).

## Verification Strategy
- Test decision: tests-after via `mkdocs build --strict` (no separate test suite exists).
- QA policy: every task includes agent-executed scenarios (Bash + curl + ssh).
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.txt` (executor saves command outputs here).

## Execution Strategy
### Parallel Execution Waves
Wave 1 (repo/CI foundation): dependency pinning + build verification + CI workflow scaffolding.
Wave 2 (server foundation): provision/harden VPS + install Docker/Compose + bring up Caddy stack serving a placeholder dir.
Wave 3 (deploy integration): CI rsync releases + symlink switch + end-to-end verification + rollback drill.

### Dependency Matrix (full, all tasks)
- Task 1 blocks: 2, 3
- Task 2 blocks: none
- Task 3 blocks: 9
- Task 4 blocks: none
- Task 5 blocks: 6, 8
- Task 6 blocks: 7
- Task 7 blocks: 9
- Task 8 blocks: 9
- Task 9 blocks: 10
- Task 10 blocks: none
- Task 11 blocks: none (optional, post-v1)

### Agent Dispatch Summary
- Wave 1: 4 tasks (writing/quick/unspecified-high)
- Wave 2: 4 tasks (unspecified-high)
- Wave 3: 2 tasks (unspecified-high)

## TODOs
> Implementation + Test = ONE task. Never separate.

- [ ] 1. Pin Python dependencies for reproducible builds

  **What to do**:
  - Add `requirements.txt` with exact pins matching the currently working local environment (`.venv/lib/python3.14/site-packages/`):
    - `mkdocs==1.6.1`
    - `mkdocs-material==9.7.2`
    - `pymdown-extensions==10.21` (for `pymdownx.*` in `mkdocs.yml#L41-L52`)
    - `mkdocs-obsidian-interactive-graph-plugin==0.3.2` (for plugin `obsidian-interactive-graph` in `mkdocs.yml#L54-L58`)
  - Ensure local build instructions use `pip install -r requirements.txt`.
  - Do not rely on `.venv/` for CI; CI must install from `requirements.txt`.

  **Must NOT do**:
  - Do not introduce Poetry/UV unless explicitly requested.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: small, config/docs oriented.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 3 | Blocked By: none

  **References**:
  - Config: `mkdocs.yml#L41` - `pymdownx.*` extensions require `pymdown-extensions`.
  - Config: `mkdocs.yml#L54` - plugin `obsidian-interactive-graph` must be installed.
  - Workflow: `.github/workflows/PublishMySite.yml#L22` - currently installs only mkdocs+material.
  - Local env evidence: `.venv/lib/python3.14/site-packages/` - observed versions: `mkdocs==1.6.1`, `mkdocs-material==9.7.2`, `pymdown-extensions==10.21`, `mkdocs-obsidian-interactive-graph-plugin==0.3.2`.
  - External: `https://pypi.org/project/pymdown-extensions/` - package name.
  - External: `https://pypi.org/project/mkdocs-obsidian-interactive-graph-plugin/` - package name.
  - External: `https://squidfunk.github.io/mkdocs-material/setup/setting-up-tags/` - `tags` is built into Material (no separate pip package).

  **Acceptance Criteria**:
  - [ ] `python3 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -r requirements.txt && mkdocs build --strict` exits 0.
  - [ ] `python3 -c "import pkgutil,sys; sys.exit(0 if pkgutil.find_loader('mkdocs_obsidian_interactive_graph_plugin') else 1)"` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Clean build with pinned deps
    Tool: Bash
    Steps: Run the Acceptance Criteria commands in a clean workspace.
    Expected: No ModuleNotFoundError for pymdownx or obsidian graph plugin; build exits 0.
    Evidence: .sisyphus/evidence/task-1-pin-deps.txt

  Scenario: Plugin load regression guard
    Tool: Bash
    Steps: Run the Python one-liner loader check.
    Expected: exit code 0.
    Evidence: .sisyphus/evidence/task-1-plugin-load.txt
  ```

  **Commit**: YES | Message: `chore(deps): pin mkdocs build dependencies` | Files: `requirements.txt` (and optional lock)

- [ ] 2. Make GitHub Pages workflow reproducible and safe (no deploy on PR)

  **What to do**:
  - Update `.github/workflows/PublishMySite.yml` to:
    - Use `actions/setup-python` with an explicit version (pick `3.12`).
    - Install dependencies from `requirements.txt`.
    - Run `mkdocs build --strict` on PRs to `main`.
    - Run `mkdocs gh-deploy --clean --force` only on `push` to `main` (guard with `if: github.event_name == 'push'`).
  - Keep GitHub Pages as rollback path; do not delete the workflow.

  **Must NOT do**:
  - Do not deploy to `gh-pages` on PR events.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: single workflow edit.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: 1

  **References**:
  - Current workflow: `.github/workflows/PublishMySite.yml#L3-L30`.

  **Acceptance Criteria**:
  - [ ] Workflow still triggers on `push` and `pull_request` to `main`.
  - [ ] On PR event, deploy step is skipped (job logs show build ran, no `mkdocs gh-deploy`).
  - [ ] On `push` to `main`, deploy step runs successfully.

  **QA Scenarios**:
  ```
  Scenario: PR build-only
    Tool: Bash
    Steps: Create a PR in a test branch; observe Actions logs.
    Expected: `mkdocs build --strict` runs; `mkdocs gh-deploy` does not run.
    Evidence: .sisyphus/evidence/task-2-pr-build-only.txt

  Scenario: Main branch deploy
    Tool: Bash
    Steps: Merge PR to main; observe Actions logs.
    Expected: `mkdocs gh-deploy --clean --force` runs and pushes `gh-pages`.
    Evidence: .sisyphus/evidence/task-2-main-deploy.txt
  ```

  **Commit**: YES | Message: `ci(pages): build strict on PR and deploy on main only` | Files: `.github/workflows/PublishMySite.yml`

- [ ] 3. Add VPS deployment workflow (CI builds + rsync releases + symlink switch)

  **What to do**:
  - Add a new workflow (e.g. `.github/workflows/DeployVPS.yml`) that:
    - Triggers via `workflow_dispatch` (manual) for initial rollout.
    - Uses `actions/setup-python` with `python-version: '3.12'`.
    - Builds: `mkdocs build --strict`.
    - Rsyncs `site/` to `/srv/mkdocs/releases/$GITHUB_SHA/` on the VPS.
    - Switches `/srv/mkdocs/current` symlink to that release atomically.
    - Keeps at least 2 prior releases; prunes older ones (e.g. keep last 5).
  - Define required secrets (document names explicitly in the workflow):
    - `VPS_HOST`, `VPS_PORT` (default 22), `VPS_USER` (deploy user), `VPS_SSH_KEY` (private key), `VPS_KNOWN_HOSTS`.

  **Exact remote deploy commands (use in workflow)**:
  ```bash
  # On runner
  set -euo pipefail

  RELEASE="${GITHUB_SHA}"
  REMOTE_RELEASE_DIR="/srv/mkdocs/releases/${RELEASE}"

  # 1) Prepare release dir
  ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" \
    "mkdir -p '${REMOTE_RELEASE_DIR}'"

  # 2) Sync build output (only inside the release dir)
  rsync -az --delete \
    -e "ssh -p ${VPS_PORT}" \
    "site/" "${VPS_USER}@${VPS_HOST}:${REMOTE_RELEASE_DIR}/"

  # 3) Atomic switch + prune (run with a lock)
  ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" \
    "bash -lc 'set -euo pipefail; exec 9>/tmp/deploy-mkdocs.lock; flock -n 9; ln -sfn ${REMOTE_RELEASE_DIR} /srv/mkdocs/current; cd /srv/mkdocs/releases; ls -1dt ./* | tail -n +6 | xargs -r rm -rf --'"
  ```

  **Must NOT do**:
  - Do not rsync into `/srv/mkdocs/current`.
  - Do not run `sudo` on the VPS from CI.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: workflow + SSH+rsync correctness + safety.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 9 | Blocked By: 1

  **References**:
  - Existing workflow style: `.github/workflows/PublishMySite.yml`.

  **Acceptance Criteria**:
  - [ ] Running the workflow creates `/srv/mkdocs/releases/<sha>/` populated with static files.
  - [ ] `/srv/mkdocs/current` points at that release after deploy.
  - [ ] A second deploy preserves the prior release and allows switching back.

  **QA Scenarios**:
  ```
  Scenario: First manual deploy
    Tool: Bash
    Steps: Trigger `workflow_dispatch`; then SSH to VPS and check releases/current.
    Expected: Release dir exists; current symlink updated.
    Evidence: .sisyphus/evidence/task-3-first-deploy.txt

  Scenario: Deploy is atomic (no partial site)
    Tool: Bash
    Steps: While deploy runs, curl http://127.0.0.1/ repeatedly on VPS.
    Expected: Always returns valid HTML; never returns empty/partial.
    Evidence: .sisyphus/evidence/task-3-atomic.txt
  ```

  **Commit**: YES | Message: `ci(vps): add manual deploy workflow via rsync releases` | Files: `.github/workflows/DeployVPS.yml`

- [ ] 4. Add repo hygiene to avoid committing generated artifacts

  **What to do**:
  - Add a root `.gitignore` to ignore `site/` and common OS noise (`.DS_Store`).
  - Ensure `site/` remains untracked; it is generated output.

  **Must NOT do**:
  - Do not commit `site/`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small file add.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: none

  **References**:
  - Repo currently has untracked `site/` (generated) and tracked `.DS_Store` files (noise).

  **Acceptance Criteria**:
  - [ ] `git status --porcelain` does not show `site/` after a build.

  **QA Scenarios**:
  ```
  Scenario: Build does not dirty the repo with site/
    Tool: Bash
    Steps: Run `mkdocs build`, then `git status --porcelain`.
    Expected: No `?? site/`.
    Evidence: .sisyphus/evidence/task-4-gitignore.txt
  ```

  **Commit**: YES | Message: `chore(repo): ignore generated site output` | Files: `.gitignore`

- [ ] 5. Provision (or re-image) VPS to Ubuntu 24.04 LTS and apply baseline hardening

  **What to do**:
  - Use the existing overseas VPS if you can SSH in; otherwise re-image it to Ubuntu 24.04 LTS.
  - Given the VPS has 1GB RAM, add a small swapfile (e.g. 1-2GB) to reduce OOM risk as you add services later.
  - Baseline hardening (commands executed on VPS):
    - Create non-root admin user (sudo) and a separate `deploy` user (no sudo).
    - SSH hardening: disable root login and password auth; enable key auth only.
    - Firewall: allow only `22/tcp`, `80/tcp`, `443/tcp`.
    - Enable unattended security upgrades.
  - Record the server public IP and keep it as `VPS_HOST` for staging.

  **Exact command sequence (run on VPS as root during bootstrap)**:
  ```bash
  set -euo pipefail
  apt-get update
  apt-get -y upgrade

  # Baseline packages
  apt-get install -y \
    ca-certificates curl gnupg lsb-release \
    ufw unattended-upgrades rsync

  # Users
  id -u ops >/dev/null 2>&1 || adduser --disabled-password --gecos "" ops
  usermod -aG sudo ops

  id -u deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy

  # SSH keys (replace with your real public keys)
  install -d -m 700 -o ops -g ops /home/ops/.ssh
  install -d -m 700 -o deploy -g deploy /home/deploy/.ssh

  # Put your public keys here (one key per line):
  #   cat ~/.ssh/id_ed25519.pub
  cat >/home/ops/.ssh/authorized_keys <<'EOF'
  <OPS_SSH_PUBLIC_KEY>
  EOF
  cat >/home/deploy/.ssh/authorized_keys <<'EOF'
  <DEPLOY_SSH_PUBLIC_KEY>
  EOF

  chown ops:ops /home/ops/.ssh/authorized_keys
  chmod 600 /home/ops/.ssh/authorized_keys
  chown deploy:deploy /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys

  # SSH hardening via drop-in
  cat >/etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
  PasswordAuthentication no
  KbdInteractiveAuthentication no
  PermitRootLogin no
  PubkeyAuthentication yes
  EOF
  systemctl restart ssh

  # Firewall
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable

  # Unattended upgrades
  systemctl enable --now unattended-upgrades

  # Swap (2GB)
  if ! swapon --show | grep -q .; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  ```

  **Must NOT do**:
  - Do not expose Docker-published ports for future app containers (only Caddy should publish 80/443).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: security-sensitive infra work.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 7 | Blocked By: none

  **References**:
  - Oracle architecture: Docker Compose + Caddy, IP-only first; domain+TLS later.

  **Acceptance Criteria** (run on VPS):
  - [ ] `ss -lntp | egrep ':(22|80|443)\b'` shows only those ports are listening.
  - [ ] `sudo ufw status verbose` shows allows for 22/80/443 only.
  - [ ] `sudo sshd -T | egrep '^(passwordauthentication|permitrootlogin)\s'` shows password auth disabled and root login disabled.

  **QA Scenarios**:
  ```
  Scenario: Non-root SSH access works
    Tool: Bash
    Steps: SSH as the new admin user using key auth.
    Expected: Login succeeds; sudo works.
    Evidence: .sisyphus/evidence/task-5-ssh-admin.txt

  Scenario: Root login blocked
    Tool: Bash
    Steps: Attempt SSH as root.
    Expected: Access denied.
    Evidence: .sisyphus/evidence/task-5-root-blocked.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 6. Install Docker + Compose and prepare server directories for atomic releases

  **What to do**:
  - Install Docker Engine + Compose plugin on the VPS.
  - Create directories:
    - `/srv/mkdocs/releases/`
    - `/srv/mkdocs/current` (symlink target)
    - `/srv/caddy/data` and `/srv/caddy/config`
    - `/srv/caddy/Caddyfile`
  - Ensure ownership:
    - `deploy` owns `/srv/mkdocs`.
    - Caddy container can read `/srv/mkdocs/current`.

  **Exact Docker install (Ubuntu 24.04)**:
  ```bash
  set -euo pipefail

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  ```

  **Exact directory layout**:
  ```bash
  set -euo pipefail
  mkdir -p /srv/mkdocs/releases
  mkdir -p /srv/caddy/data /srv/caddy/config
  mkdir -p /srv/stack/mkdocs
  chown -R deploy:deploy /srv/mkdocs
  ```

  **Must NOT do**:
  - Do not mount a symlink path directly into Docker; mount `/srv/mkdocs` and use `/srv/mkdocs/current` inside.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: server runtime foundation.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 9 | Blocked By: 5

  **Acceptance Criteria** (run on VPS):
  - [ ] `docker --version` and `docker compose version` succeed.
  - [ ] `test -d /srv/mkdocs/releases` succeeds.

  **QA Scenarios**:
  ```
  Scenario: Docker can run
    Tool: Bash
    Steps: Run `docker run --rm hello-world`.
    Expected: Container runs and exits 0.
    Evidence: .sisyphus/evidence/task-6-docker-hello.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 7. Bring up Caddy (Compose) to serve static files over HTTP (IP-only)

  **What to do**:
  - Create a minimal Compose stack on the VPS with a single `caddy:2` container publishing `80:80`.
  - Caddyfile (IP-only):
    - Listener `:80`
    - `root * /srv/mkdocs/current`
    - `file_server`
    - `encode zstd gzip`
  - Create a bootstrap release directory and point `current` to it so the server can serve immediately.

  **Exact Compose file (save as `/srv/stack/mkdocs/compose.yaml`)**:
  ```yaml
  services:
    caddy:
      image: caddy:2
      restart: unless-stopped
      ports:
        - "80:80"
      volumes:
        - /srv/mkdocs:/srv/mkdocs:ro
        - /srv/stack/mkdocs/Caddyfile:/etc/caddy/Caddyfile:ro
        - /srv/caddy/data:/data
        - /srv/caddy/config:/config
  ```

  **Exact Caddyfile (save as `/srv/stack/mkdocs/Caddyfile`)**:
  ```caddy
  :80 {
    root * /srv/mkdocs/current
    file_server
    encode zstd gzip
  }
  ```

  **Exact bootstrap and start**:
  ```bash
  set -euo pipefail
  mkdir -p /srv/mkdocs/releases/bootstrap
  echo '<!doctype html><title>bootstrap</title><h1>bootstrap</h1>' > /srv/mkdocs/releases/bootstrap/index.html
  ln -sfn /srv/mkdocs/releases/bootstrap /srv/mkdocs/current

  cd /srv/stack/mkdocs
  docker compose up -d
  docker compose ps
  ```

  **Must NOT do**:
  - Do not attempt public HTTPS before a real domain points to the VPS.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: networking + containerization.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9 | Blocked By: 6

  **Acceptance Criteria** (run on VPS):
  - [ ] `curl -fsSI http://127.0.0.1/ | head -n 1` contains `200`.
  - [ ] `curl -fsS http://127.0.0.1/` returns non-empty HTML.

  **QA Scenarios**:
  ```
  Scenario: External reachability
    Tool: Bash
    Steps: From a non-VPS machine, run `curl -fsSI http://<VPS_IP>/ | head -n 1`.
    Expected: 200/304.
    Evidence: .sisyphus/evidence/task-7-external-http.txt

  Scenario: 404 remains correct
    Tool: Bash
    Steps: `curl -fsSI http://127.0.0.1/this-path-should-not-exist/ | head -n 1`.
    Expected: 404.
    Evidence: .sisyphus/evidence/task-7-404.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 8. Create a dedicated deploy key + restrict VPS deploy user

  **What to do**:
  - Generate an ED25519 keypair dedicated to CI deployments.
  - Add the public key to `~deploy/.ssh/authorized_keys` on the VPS.
  - Create and capture `known_hosts` entry for the VPS SSH host key.
  - Add GitHub Secrets for the deploy workflow:
    - `VPS_SSH_KEY` = private key
    - `VPS_KNOWN_HOSTS` = output of `ssh-keyscan -p <port> <host>` (reviewed)
    - `VPS_HOST`, `VPS_PORT`, `VPS_USER`

  **Exact key and known_hosts commands (run locally)**:
  ```bash
  set -euo pipefail

  # Create a dedicated deploy key
  ssh-keygen -t ed25519 -f "$HOME/.ssh/mkdocs_vps_deploy" -C "mkdocs vps deploy" -N ""

  # Print public key to paste into the VPS deploy user's authorized_keys
  cat "$HOME/.ssh/mkdocs_vps_deploy.pub"

  # Pin host key (review output)
  ssh-keyscan -p 22 -H <VPS_HOST> > vps_known_hosts
  cat vps_known_hosts
  ```

  **Must NOT do**:
  - Do not reuse personal SSH keys.
  - Do not grant `deploy` sudo.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: security + CI secrets.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9 | Blocked By: 5

  **Acceptance Criteria**:
  - [ ] From CI (or local), `ssh -o StrictHostKeyChecking=yes -p <port> <deploy>@<host> 'echo ok'` prints `ok`.

  **QA Scenarios**:
  ```
  Scenario: Host key pinning works
    Tool: Bash
    Steps: SSH with StrictHostKeyChecking enabled and the pinned known_hosts.
    Expected: No interactive prompt; exit 0.
    Evidence: .sisyphus/evidence/task-8-known-hosts.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 9. End-to-end deploy to VPS releases and verify site functionality

  **What to do**:
  - Run the new VPS deploy workflow and confirm it:
    - Builds with pinned deps.
    - Rsyncs into a new release directory.
    - Switches `/srv/mkdocs/current` to the new release.
  - On the VPS, run the Definition-of-Done verification commands (homepage, JS, search index, compression, symlink).

  **Must NOT do**:
  - Do not enable caching headers aggressively before verifying updates propagate.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: CI + server integration.
  - Skills: `[]`

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10 | Blocked By: 3, 6, 7, 8

  **References**:
  - Custom JS path: `mkdocs.yml#L58-L60` and `docs/javascripts/shortcuts.js`.
  - Site title string for grep: `mkdocs.yml#L1`.

  **Acceptance Criteria** (run on VPS unless noted):
  - [ ] `curl -fsS http://127.0.0.1/ | grep -F "Dove's Digital Garden"` exits 0.
  - [ ] `curl -fsSI http://127.0.0.1/javascripts/shortcuts.js | head -n 1` contains `200`.
  - [ ] `curl -fsS http://127.0.0.1/search/search_index.json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('docs',[])))"` prints `> 0`.
  - [ ] `curl -fsSI -H 'Accept-Encoding: gzip' http://127.0.0.1/ | tr -d '\r' | grep -i '^content-encoding: gzip'` exits 0.
  - [ ] `test -L /srv/mkdocs/current && readlink /srv/mkdocs/current | grep -E '^/srv/mkdocs/releases/'` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Site serves key pages
    Tool: Bash
    Steps: curl the homepage and a known doc path from outside the VPS.
    Expected: 200 and HTML content.
    Evidence: .sisyphus/evidence/task-9-external-pages.txt

  Scenario: Search index integrity
    Tool: Bash
    Steps: Fetch search_index.json and compute docs length.
    Expected: docs length > 0.
    Evidence: .sisyphus/evidence/task-9-search-index.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 10. Rollback drill and release retention policy

  **What to do**:
  - Perform a rollback by repointing `/srv/mkdocs/current` to the previous release.
  - Verify the homepage and a static asset still serve correctly after rollback.
  - Document a retention policy (keep last 5 releases; prune older).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: production safety.
  - Skills: `[]`

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: 9

  **Acceptance Criteria** (run on VPS):
  - [ ] `ls -1dt /srv/mkdocs/releases/* | sed -n '1,2p'` prints two different release directories.
  - [ ] After switching to the older release, `curl -fsS http://127.0.0.1/ | grep -F "Dove's Digital Garden"` still exits 0.

  **QA Scenarios**:
  ```
  Scenario: Rollback is fast
    Tool: Bash
    Steps: `ln -sfn <older_release> /srv/mkdocs/current` then curl homepage.
    Expected: homepage loads immediately; no rebuild required.
    Evidence: .sisyphus/evidence/task-10-rollback.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 11. (Optional) Buy a domain, enable HTTPS, and set a stable canonical `site_url`

  **What to do**:
  - Buy a domain and point `A` record(s) to the VPS public IP.
  - Update Caddyfile to serve:
    - `example.com` (static site)
    - `*.example.com` (future services)
    - Keep `:80` only as a redirect to HTTPS once TLS is working.
  - Update MkDocs canonical URL strategy:
    - Set `mkdocs.yml:site_url` to the new canonical (domain) URL, OR
    - Maintain two configs (`mkdocs.ghpages.yml` and `mkdocs.selfhost.yml`) if you want GH Pages to remain canonical too.
  - Verify TLS issuance (Let's Encrypt) and redirects.

  **Must NOT do**:
  - Do not enable HSTS until you've observed stable TLS and redirects for at least a week.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: DNS/TLS edge cases.
  - Skills: `[]`

  **Parallelization**: Can Parallel: YES | Wave Post-v1 | Blocks: none | Blocked By: 9

  **Acceptance Criteria**:
  - [ ] `dig +short A example.com` returns the VPS IP.
  - [ ] `curl -fsSI https://example.com/ | head -n 1` contains `200`.
  - [ ] `curl -fsSI http://example.com/ | tr -d '\r' | grep -i '^location: https://'` exits 0.

  **QA Scenarios**:
  ```
  Scenario: TLS certificate is valid
    Tool: Bash
    Steps: `openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -issuer -subject -dates`
    Expected: Not expired; issuer is Let's Encrypt.
    Evidence: .sisyphus/evidence/task-11-tls.txt
  ```

  **Commit**: MAYBE | Message: `chore(site): set canonical site_url for self-host` | Files: `mkdocs.yml` (or new config files)

## Commit Strategy
- Suggested sequence (atomic commits):
  - `chore(deps): pin mkdocs build dependencies`
  - `ci(pages): build strict on PR and deploy on main only`
  - `ci(vps): add manual deploy workflow via rsync releases`
  - `chore(repo): ignore generated site output`

## Success Criteria
- GitHub Pages deployment remains functional as rollback.
- VPS serves the site over HTTP by IP with correct assets/search/compression.
- Deployment is repeatable (pinned deps) and rollback is a symlink switch.
- Foundation supports future services: Caddy is the only published entrypoint (80/443) and other services can be added behind it.

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit - oracle
- [ ] F2. Code Quality Review - unspecified-high
- [ ] F3. Real Manual QA - unspecified-high (+ playwright only if adding UI flows)
- [ ] F4. Scope Fidelity Check - deep
