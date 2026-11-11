# namegarage-sdk

Version 0.3.0 forwards the canonical SDK, including its typed UCP helpers.

Compatibility package for the official [@namegarage/sdk](https://github.com/namegarage/sdk).
Version 0.3.0 forwards that SDK's ESM, CommonJS and TypeScript exports and depends
only on `@namegarage/sdk@0.3.0`.

For new projects, install the scoped package directly:

```bash
npm install @namegarage/sdk@0.3.0
```

The client reads Namegarage's anonymous public domain catalog and search API.
Those HTTP reads need no account or API key. UCP catalog POST reads require the configured platform profile and a fresh ES256 HTTP message signature through a custom signing fetch transport. A null price means offer-only. It cannot buy or
reserve names, send messages, sign in, or read private portfolio data.

See the [quickstart](https://namegarage.com/docs/quickstart) and
[SDK documentation](https://github.com/namegarage/sdk) for usage and limits.

MIT. Copyright 2026 Namegarage.
