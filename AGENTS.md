# Namegarage SDK

This public package wraps only the anonymous catalog and search APIs. Never publish private portfolio data, operator code, credentials or cross-site references. Preserve null prices, wire response fields and the distinction between catalog snapshots and current search results. Do not add purchase, reservation, message or account operations.

The canonical SDK has no runtime dependencies. Compatibility packages under aliases/ depend only on one exact published @namegarage/sdk version and forward its exports; do not add other runtime dependencies or lifecycle scripts. Pin build dependencies to exact versions and commit package-lock.json. Public configuration defaults belong in src/config.ts. Maintain ESM, CommonJS and TypeScript entry points.

Run npm run check, npm test and archive/clean-consumer checks for a release. Tests use injected fetch or local fake providers. Live search acceptance requires the site's supported signed operator rehearsal and verified test markers; no ordinary production provider calls.

Use signed Conventional Commits and a codex/ feature branch after the initial empty repository seed. Muse Code reviews the complete release change before pushing. Keep GitHub Actions disabled. Record actual local checks and review evidence; do not claim npm provenance for a local build.
