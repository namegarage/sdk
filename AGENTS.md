# Namegarage SDK

This public package wraps only the anonymous catalog read APIs. Never publish private portfolio data, operator code, credentials or cross-site references. Preserve null prices, wire response fields and the distinction between catalog snapshots and current search results. Read-only purchase-option comparisons are supported; do not add purchases, reservations, messages, account actions or private operations.

The canonical SDK has no runtime dependencies. Compatibility packages under aliases/ depend only on one exact published @namegarage/sdk version and forward its exports; do not add other runtime dependencies or lifecycle scripts. Pin build dependencies to exact versions and commit package-lock.json. Public configuration defaults belong in src/config.ts. Maintain ESM, CommonJS and TypeScript entry points.

Run npm run check, npm test and archive/clean-consumer checks for a release. Tests use injected fetch or local fake providers. Live search acceptance requires the site's supported signed operator rehearsal and verified test markers; no ordinary production provider calls.

Use signed Conventional Commits and a codex/ feature branch after the initial empty repository seed. Muse Code reviews the complete release change before pushing. Keep GitHub Actions disabled. Record actual local checks and review evidence; do not claim npm provenance for a local build.

Keep the public HTTP/OpenAPI, MCP, SDK and skills coordinated. Every new capability
or behavior change requires an impact check in nikolay/liquidate, namegarage/sdk
and namegarage/skills, matching release.json metadata, component semantic-version
decisions, exact alias pins, a separate Developers changelog entry and an engineering
Dev blog post. Update each affected repository; record compatibility reasons for
unchanged components. Run the central tools/check_public_release.py with explicit
local source paths. Treat publication as pending until the service, npm packages,
ClawHub scan/install and skills.sh listing/install are verified. Never rewrite old
versions or claim an unverified surface is released. Preserve MIT and existing
read-only, fake-provider test and review boundaries.
