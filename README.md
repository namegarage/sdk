# @namegarage/sdk

TypeScript and JavaScript client for Namegarage's anonymous public domain catalog and search APIs. The package has no runtime dependencies. It supports ESM and CommonJS in Node.js and can be bundled for browsers.

## Install

```bash
npm install @namegarage/sdk@0.2.0
```

Use a runtime with native `fetch`, `AbortController`, `AbortSignal.any` and `DOMException`, such as Node.js 22 or later or a modern browser. You can supply your own `fetch` implementation.

## Search for domains

```ts
import { Namegarage } from '@namegarage/sdk';

const client = new Namegarage();
const matches = await client.searchDomains('meal-planning app', {
  maxPrice: 5000,
  limit: 3,
});

for (const domain of matches.results) {
  console.log(domain.name, domain.price_usd, domain.url);
}
```

No account, API key, bearer token or browser cookie is required. Requests omit credentials. The client only makes GET requests to the documented catalog, search, domain lookup, purchase-option and alternatives routes.

Search options are `maxPrice` (positive whole USD), `tier` (`Platinum`, `Gold`, `Silver`, `Bronze`, `Bargain`), `tld` (such as `com` or `co.uk`), `maxLength` (1–63), and `limit` (1–50). Responses retain the API's field names.

A null `price_usd` means offer-only, never zero. `meaning: "unavailable"` can still include keyword matches. A result does not reserve a domain or guarantee later availability. Follow its returned URL to review the current purchase options.

## Read the catalog

```ts
const catalog = await client.getCatalog();
console.log(catalog.count);
```

The catalog is a published snapshot. Its `buy_now` field and promotion dates require interpretation; use search for prices resolved against current availability. The SDK does not calculate prices, start checkout, buy domains or manage accounts.

## Handle refusals

```ts
import { NamegarageApiError } from '@namegarage/sdk';

try {
  await client.searchDomains('meal-planning app');
} catch (error) {
  if (error instanceof NamegarageApiError) {
    console.error(error.status, error.code, error.retryAfterSeconds);
  } else {
    throw error;
  }
}
```

The client never retries automatically. Honor `Retry-After` on HTTP 429 or 503. `NamegarageApiError` exposes `status`, `code`, `body`, the raw `retryAfter`, and parsed `retryAfterSeconds` (null when unavailable). Non-JSON edge refusals retain their HTTP status and text body.

Malformed successful responses throw `NamegarageResponseError`. Native network errors, abort reasons and timeout errors propagate. You can cancel either method with `{ signal }`; the default timeout is 10 seconds and includes reading the response body.

## Configure the client

```ts
const client = new Namegarage({
  timeoutMs: 15_000,
  // baseUrl: 'http://127.0.0.1:8788', // Local fake-provider rehearsal.
  // fetch: yourFetchImplementation,
});
```

`baseUrl` accepts an HTTPS origin or an HTTP loopback origin, without a path, credentials, query or fragment. Configuration cannot select private API routes. Redirects are refused.

## Develop and release

```bash
npm ci --ignore-scripts
npm run check
npm test
npm run test:package
```

Tests use synthetic `.invalid` domains and injected fetch implementations. Do not run acceptance examples against live search: it may call providers and spend the shared request allowance. Hosted acceptance must use Namegarage's verified signed operator rehearsal with fake providers and test markers.

Release from a clean, reviewed, signed commit. Inspect the package archive, install it into a clean temporary consumer, and test both entry points and declaration files before `npm publish --access public`. Keep hosted Actions disabled; local evidence and release records document what actually ran. npm provenance requires a supported hosted builder and is not claimed for a local release.

[API documentation](https://namegarage.com/docs/) · [OpenAPI](https://namegarage.com/openapi.json) · [Source and issues](https://github.com/namegarage/sdk)

## Compatibility package sources

`aliases/namegarage` and `aliases/namegarage-sdk` contain thin compatibility
packages pinned to the published `@namegarage/sdk@0.2.0`. New projects should use
the scoped package. Run `npm run test:aliases` to check their archives, clean
consumer installs, both module/type entry points and browser bundles.

## License

MIT. Copyright 2026 Namegarage.

## Domain details, payment options and alternatives

```ts
const domain = await client.getDomain('example.invalid');
const options = await client.getPurchaseOptions('example.invalid');
const alternatives = await client.suggestAlternatives('example.invalid', {
  query: 'meal-planning app', maxPrice: 3000, limit: 5,
});
```

The `.invalid` name is fictional. `getDomain()` and `getPurchaseOptions()` return
`{name, priced_at, found, domain}`; an absent listing is `found: false` with
`domain: null`, not proof of registration availability. Published description
and use-case fields are preserved when the server supplies them; do not invent
withheld copy. Alternatives exclude the reference before limiting and may use
its first label when no project query is supplied.

Payment values come from `domain.purchase_options`: USD outright price, lease
principal and standard zero-down schedules. Compare monthly and final payments,
total and extra cost versus cash. A cash-only discount may not reduce the lease
principal. Null outright price means offer-only; an empty plan list means no
standard standalone plan is published. Follow the returned domain URL for current
terms, other payment choices and additional checkout fees. These methods do not
create quotes, holds, checkout sessions, messages, purchases or accounts.

Search descriptions are sent to Namegarage; omit confidential project details.
All methods support cancellation and the same timeout/refusal handling. The
[developer changelog](https://namegarage.com/developers/changelog/) and bundled
`release.json` record coordinated component versions.

## A2A compatibility

Namegarage's [A2A domain-selection concierge](https://namegarage.com/docs/a2a)
is a separate anonymous protocol adapter over the same public catalog search.
This SDK keeps version 0.2.0 and its existing methods; it does not add an A2A
transport or require authentication. Both compatibility packages keep their exact
`@namegarage/sdk@0.2.0` dependency.

The source `release.json` tracks the latest coordinated release. Published npm
archives and the immutable v0.2.0 tag retain the original catalog-parity metadata;
they remain compatible and are reused without republishing their version.


## OpenAPI media-type release coordination

The source release record tracks `2026-10-28-openapi-media-type`. API 1.2.1 makes
every RFC 9727 catalog link to `/openapi.json` advertise `application/json`,
matching the document's existing response type. Published SDK 0.2.0 packages
and the skill 1.2.0 artifact retain their immutable versions and bytes. Catalog
methods, response schemas, skill instructions and exact dependency pins stay
unchanged. Website 1.1.0 remains a staged newsletter component; its public
activation and verification are pending. The combined release also retains the
inherited skills.sh listing-preview gap in the
[central changelog](https://namegarage.com/developers/changelog/).
