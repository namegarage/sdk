# Changelog

## 0.3.2 — upcoming

Package patch for the installed service under the distinct release ID `2026-11-17-installed-service-packaging`. Bundled metadata now records the installed component contract, including UCP adapter 1.0.0, and the exact current catalog skill and SDK pins. Public methods, types, dependencies and runtime code are unchanged. Both compatibility packages use 0.3.2 and pin SDK 0.3.2 exactly. Published 0.3.0 and 0.3.1 archives remain immutable.

## 0.3.1 — 2026-11-16 (npm publication)

Updates bundled coordination metadata for the Bitcoin release. Public methods, types and runtime code are unchanged. Both compatibility packages use 0.3.1 and pin SDK 0.3.1 exactly. Published 0.3.0 archives remain immutable. SDK 0.3.1 and both compatibility packages were published on npm; the coordinated release recorded in their metadata did not complete, and its remaining checks continue under 0.3.2.

## 0.3.0 — 2026-11-10

Adds typed UCP discovery, catalog search, batch and product lookup, and a local-only browser handoff helper. Existing HTTP reads remain compatible. The buyer completes checkout on Namegarage. Use the custom fetch transport for signed UCP catalog requests. Both compatibility aliases pin SDK 0.3.0.


## 0.2.0 — 2026-10-27

- Add typed `getDomain`, `getPurchaseOptions` and `suggestAlternatives` GET methods.
- Preserve existing catalog/search methods and anonymous, read-only behavior.
- Add coordinated release metadata, repository rules and exact compatibility pins.

## 0.1.0 — 2026-10-26

- Publish the dependency-free catalog/search client with ESM, CommonJS and TypeScript support.
