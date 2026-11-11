# Changelog

## 0.3.0 — 2026-11-10

Adds typed UCP discovery, catalog search, batch and product lookup, and a local-only browser handoff helper. Existing HTTP reads remain compatible. The buyer completes checkout on Namegarage. Use the custom fetch transport for signed UCP catalog requests. Both compatibility aliases pin SDK 0.3.0.


## 0.2.0 — 2026-10-27

- Add typed `getDomain`, `getPurchaseOptions` and `suggestAlternatives` GET methods.
- Preserve existing catalog/search methods and anonymous, read-only behavior.
- Add coordinated release metadata, repository rules and exact compatibility pins.

## 0.1.0 — 2026-10-26

- Publish the dependency-free catalog/search client with ESM, CommonJS and TypeScript support.
