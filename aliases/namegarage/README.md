# namegarage

Compatibility package for the official [@namegarage/sdk](https://github.com/namegarage/sdk).
Version 0.1.0 forwards that SDK's ESM, CommonJS and TypeScript exports and depends
only on `@namegarage/sdk@0.1.0`.

For new projects, install the scoped package directly:

```bash
npm install @namegarage/sdk@0.1.0
```

The client reads Namegarage's anonymous public domain catalog and search API.
It needs no account or API key. A null price means offer-only. It cannot buy or
reserve names, send messages, sign in, or read private portfolio data.

See the [quickstart](https://namegarage.com/docs/quickstart) and
[SDK documentation](https://github.com/namegarage/sdk) for usage and limits.

MIT. Copyright 2026 Namegarage.
