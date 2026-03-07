# Agent Instructions (mkdocs-site)

This repository is a MkDocs + mkdocs-material static site.
Deployment is handled by GitHub Actions (`.github/workflows/PublishMySite.yml`).

If you are an agent working here, prioritize:
- Keeping changes small and focused.
- Ensuring `mkdocs build` succeeds.
- Preserving the existing writing style (Chinese-first content).

## Existing Agent Rules

- Cursor rules: none found (no `.cursor/rules/` or `.cursorrules`).
- Copilot rules: none found (no `.github/copilot-instructions.md`).

If you add any later, reflect them here.

## Project Layout

- `mkdocs.yml`: site configuration (theme, nav, plugins).
- `docs/`: all Markdown content and client assets.
  - `docs/*.md`: pages referenced from `mkdocs.yml` `nav`.
  - `docs/javascripts/shortcuts.js`: extra JS loaded by MkDocs.
- `overrides/`: MkDocs Material overrides/assets.
  - `overrides/.icons/`: custom icons.

Note: `.DS_Store` files are present. Avoid adding more.

## Build / Lint / Test Commands

### Install (local)

This repo does not currently pin Python dependencies (no `requirements.txt` or `pyproject.toml`).
CI installs MkDocs directly via pip.

Recommended local setup (isolated venv):
- `python3 -m venv .venv`
- `source .venv/bin/activate`
- `python -m pip install -U pip`
- `pip install mkdocs mkdocs-material`

### Run locally (dev server)

- `mkdocs serve`
  - Serves the site with live reload.
  - Use this for validating a single page change.

Useful variants: `mkdocs serve -a 127.0.0.1:8000`, `mkdocs serve --dirtyreload`.

### Build

- `mkdocs build`
  - Outputs the static site to `site/` (by default).

Stricter local check (optional):
- `mkdocs build --strict`
  - Fails on warnings (useful before PRs; may be noisy).

### Deploy

CI deploy step runs:
- `mkdocs gh-deploy --clean --force`

Local deploy is possible, but avoid doing it unless explicitly asked:
- It writes and pushes to the `gh-pages` branch.

### Lint

No linters are configured. Use `mkdocs build` (or `mkdocs build --strict`) as validation.

### Tests

There is no unit/integration test suite.
Treat `mkdocs build` as the primary “test”.

**Single test equivalent**
- For a single page: run `mkdocs serve` and open that page.
- For a config change: run `mkdocs build` (or `--strict`).

If tests are added later, use `pytest path/to/test_file.py -k test_name`.

## Content & Code Style Guidelines

### Markdown (docs pages)

General:
- Use readable, consistent headings: start pages with `#` (H1), then `##`.
- Keep one blank line between blocks (headings, lists, paragraphs).
- Prefer relative links between docs pages: `[text](some-page.md)`.
- Prefer hyphen lists (`- item`) consistently.
- Avoid tab characters in Markdown (tabs can break list indentation).

File naming:
- Use `kebab-case.md` (matches existing pages like `atomic-notes.md`).
- Keep filenames stable because nav links depend on them.

Adding a new page:
- Create `docs/<new-page>.md`.
- Add it to `mkdocs.yml` under `nav` in the appropriate section.
- Keep `nav` indentation consistent and validate with `mkdocs build`.

### MkDocs config (mkdocs.yml)

Formatting:
- Use 2-space indentation.
- Do not use tabs.
- Keep comments concise and accurate.

Conventions:
- Update `nav` when adding/removing pages.
- Keep Chinese labels consistent with existing sections: `知识`, `文章`, `项目`.
- Be careful editing `extra.analytics.property` (it affects production).

Plugins/extensions: keep them minimal; prefer built-in MkDocs/Material features over custom JS.

### JavaScript (docs/javascripts)

Current JS is small and hooks into MkDocs Material keyboard handling.
When editing/adding scripts:
- Keep scripts minimal and dependency-free.
- Assume scripts run in the browser; avoid Node-only APIs.
- Guard against missing globals (e.g., check `typeof keyboard$ !== "undefined"`).
- Avoid noisy console logging in production.

Style:
- 2-space indentation.
- Prefer clear names over short names.
- Match existing semicolon-less style.

Error handling:
- Prefer defensive guards over throwing.
- If a feature is optional, fail silently (no hard crash for the whole site).

### Assets / Overrides

- Put custom icons under `overrides/.icons/`.
- Keep asset filenames stable (they may be referenced from Markdown/config).

### Localization / Writing

- Primary audience appears to be Chinese; keep tone consistent.
- If adding English content, keep it scoped (e.g., an English section/page)
  and avoid mixing languages mid-paragraph unless intentional.

## Hygiene & Safety

- Do not commit generated output (`site/`) unless explicitly requested.
  - Note: there is no `.gitignore` currently; be careful with `git status`.
- Avoid committing OS/editor artifacts (`.DS_Store`).
- Don’t add secrets. The Google Analytics property ID is public, but treat any
  tokens/keys as secrets and keep them out of the repo.

## Suggested PR/Change Checklist

- `mkdocs build` succeeds locally.
- New pages are reachable via `mkdocs.yml` nav.
- Links between pages are relative and correct.
- JS changes are guarded and don’t break page load.
