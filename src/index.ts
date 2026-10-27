import { defaults } from './config.js';

export type Tier = 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Bargain';
export interface CatalogDomain {
  name: string;
  sld: string;
  tld: string;
  path: string;
  display?: string;
  tier: Tier | '';
  /** Whole USD; null means offer-only, never free. */
  buy_now: number | null;
  regular_price?: number | null;
  categories: string[];
  low: number | null;
  promotion?: {
    price: number | null;
    kind: 'regular' | 'weekly' | 'price_drop';
    minimum: number | null;
    ends: string | null;
    next: { starts: string; price: number } | null;
    version: string;
  };
  deal?: { price: number; starts: string; ends: string };
  visits?: number;
  visits_through?: string;
}
export interface CatalogResponse {
  brand: string;
  base_url: string;
  count: number;
  traffic_max_stale_days: number;
  priced_at?: number;
  domains: CatalogDomain[];
}
export interface SearchResult {
  name: string;
  display?: string;
  url: string;
  tier: Tier | null;
  /** Current whole USD price, including an active deal; null means offer-only. */
  price_usd: number | null;
  regular_price_usd?: number;
  match: 'exact' | 'keyword' | 'meaning';
  fits: string | null;
}
export interface SearchResponse {
  query: string;
  priced_at: number;
  meaning: 'available' | 'unavailable';
  count: number;
  results: SearchResult[];
}
export interface DomainDetails extends SearchResult {
  /** Published copy, when supplied by the server; empty values can mean withheld. */
  description?: string;
  use_cases?: string[];
}
export interface DomainResponse<T extends SearchResult = DomainDetails> {
  name: string;
  priced_at: number;
  found: boolean;
  domain: T | null;
}
export interface LeasePlan {
  months: number;
  down_payment_usd: number;
  first_payment_usd: number;
  monthly_payment_usd: number;
  final_payment_usd: number;
  total_usd: number;
  extra_cost_vs_buy_outright_usd: number;
}
export interface PurchaseOptions {
  currency: 'USD';
  buy_outright: {total_usd: number} | null;
  lease_base_price_usd: number | null;
  lease_to_own: LeasePlan[];
}
export interface PurchaseDomain extends SearchResult { purchase_options: PurchaseOptions }
export interface AlternativesResponse extends SearchResponse { name: string }
export interface AlternativesOptions extends RequestOptions { query?: string; maxPrice?: number; limit?: number }
export interface RequestOptions { signal?: AbortSignal }
export interface SearchOptions extends RequestOptions {
  maxPrice?: number;
  tier?: Tier;
  tld?: string;
  maxLength?: number;
  limit?: number;
}
export interface ClientOptions {
  /** HTTPS origin, or an HTTP loopback origin for local rehearsals. */
  baseUrl?: string;
  timeoutMs?: number;
  /** Inject a fetch implementation for isolated tests or another runtime. */
  fetch?: typeof globalThis.fetch;
}

/** A non-success HTTP response, including non-JSON Cloudflare refusals. */
export class NamegarageApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly retryAfter: string | null;
  readonly retryAfterSeconds: number | null;
  readonly body: unknown;
  constructor(status: number, body: unknown, retryAfter: string | null) {
    const code = object(body) && typeof body.error === 'string' ? body.error : null;
    super(`Namegarage request failed: HTTP ${status}${code ? ` (${code})` : ''}`);
    this.name = 'NamegarageApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.retryAfterSeconds = retrySeconds(retryAfter);
    this.body = body;
  }
}
/** A success response whose body does not satisfy the public API contract. */
export class NamegarageResponseError extends Error {
  constructor() {
    super('Namegarage returned an invalid API response');
    this.name = 'NamegarageResponseError';
  }
}

const tiers: readonly string[] = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Bargain'];
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const integer = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const nullablePrice = (x: unknown): x is number | null => x === null || integer(x);
const optional = (x: Record<string, unknown>, key: string, check: (value: unknown) => boolean) => x[key] === undefined || check(x[key]);
const text = (x: unknown): x is string => typeof x === 'string';
const nullableText = (x: unknown) => x === null || text(x);
const tier = (x: unknown) => text(x) && tiers.includes(x);
function promotion(x: unknown): boolean {
  return object(x) && nullablePrice(x.price) && text(x.kind) && ['regular', 'weekly', 'price_drop'].includes(x.kind)
    && nullablePrice(x.minimum) && nullableText(x.ends) && text(x.version)
    && (x.next === null || (object(x.next) && text(x.next.starts) && integer(x.next.price)));
}
function catalogDomain(x: unknown): boolean {
  return object(x) && ['name', 'sld', 'tld', 'path'].every(key => text(x[key]))
    && (x.tier === '' || tier(x.tier)) && nullablePrice(x.buy_now) && nullablePrice(x.low)
    && Array.isArray(x.categories) && x.categories.every(text)
    && optional(x, 'display', text) && optional(x, 'regular_price', nullablePrice)
    && optional(x, 'promotion', promotion) && optional(x, 'visits', integer)
    && optional(x, 'visits_through', text) && optional(x, 'deal', d => object(d)
      && integer(d.price) && text(d.starts) && text(d.ends));
}
function catalog(x: unknown): x is CatalogResponse {
  return object(x) && text(x.brand) && text(x.base_url) && integer(x.count)
    && integer(x.traffic_max_stale_days) && optional(x, 'priced_at', integer)
    && Array.isArray(x.domains) && x.domains.every(catalogDomain) && x.count === x.domains.length;
}
function searchResult(x: unknown): boolean {
  return object(x) && text(x.name) && text(x.url) && (x.tier === null || tier(x.tier))
    && nullablePrice(x.price_usd) && nullableText(x.fits)
    && text(x.match) && ['exact', 'keyword', 'meaning'].includes(x.match)
    && optional(x, 'display', text) && optional(x, 'regular_price_usd', integer);
}
function search(x: unknown): x is SearchResponse {
  return object(x) && text(x.query) && integer(x.priced_at) && integer(x.count)
    && text(x.meaning) && ['available', 'unavailable'].includes(x.meaning)
    && Array.isArray(x.results) && x.results.every(searchResult) && x.count === x.results.length;
}
function lookup(x: unknown): x is DomainResponse {
  return object(x) && text(x.name) && integer(x.priced_at) && typeof x.found === 'boolean'
    && (x.found ? searchResult(x.domain) && object(x.domain) && x.domain.match === 'exact'
      && optional(x.domain, 'description', text)
      && optional(x.domain, 'use_cases', value => Array.isArray(value) && value.every(text)) : x.domain === null);
}
function paymentLookup(x: unknown): x is DomainResponse<PurchaseDomain> {
  if (!lookup(x)) return false;
  if (!x.found) return true;
  const row = x.domain;
  if (!object(row) || !object(row.purchase_options)) return false;
  const p = row.purchase_options;
  if (p.currency !== 'USD' || !nullablePrice(p.lease_base_price_usd) || !Array.isArray(p.lease_to_own)) return false;
  if (row.price_usd === null) return p.buy_outright === null && p.lease_base_price_usd === null && p.lease_to_own.length === 0;
  if (!object(p.buy_outright) || !integer(p.buy_outright.total_usd) || p.buy_outright.total_usd !== row.price_usd
      || !integer(p.lease_base_price_usd) || p.lease_base_price_usd < 1) return false;
  return p.lease_to_own.every(plan => object(plan) && integer(plan.months) && plan.months >= 2
    && plan.down_payment_usd === 0 && integer(plan.first_payment_usd) && plan.first_payment_usd > 0
    && plan.first_payment_usd === plan.monthly_payment_usd && integer(plan.monthly_payment_usd)
    && integer(plan.final_payment_usd) && plan.final_payment_usd > 0
    && integer(plan.total_usd) && integer(plan.extra_cost_vs_buy_outright_usd));
}
function alternatives(x: unknown): x is AlternativesResponse {
  return search(x) && object(x) && text(x.name);
}
function nameParams(name: string): URLSearchParams {
  if (typeof name !== 'string' || [...name].length > 200 || !/^[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}-]*[\p{L}\p{N}\p{M}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}-]*[\p{L}\p{N}\p{M}])?)+$/u.test(name.trim().normalize('NFC')))
    throw new TypeError('name must be a complete domain name without a URL, path, query or fragment');
  return new URLSearchParams({name});
}

function retrySeconds(value: string | null): number | null {
  if (value === null) return null;
  if (/^\d+$/.test(value.trim())) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : null;
}
function positiveInteger(value: number, name: string, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max)
    throw new RangeError(`${name} must be a positive safe integer${max === Number.MAX_SAFE_INTEGER ? '' : ` no greater than ${max}`}`);
}

/** Anonymous, read-only client. Requests are never retried automatically. */
export class Namegarage {
  readonly #origin: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof globalThis.fetch;
  constructor(options: ClientOptions = {}) {
    const url = new URL(options.baseUrl ?? defaults.baseUrl);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
        || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
      throw new TypeError('baseUrl must be an HTTPS origin or an HTTP loopback origin, without credentials, path, query or fragment');
    this.#origin = url.origin;
    this.#timeoutMs = options.timeoutMs ?? defaults.timeoutMs;
    positiveInteger(this.#timeoutMs, 'timeoutMs', 2_147_483_647);
    const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (typeof fetcher !== 'function') throw new TypeError('A fetch implementation is required');
    this.#fetch = fetcher;
  }
  getCatalog(options: RequestOptions = {}): Promise<CatalogResponse> {
    return this.#request(defaults.routes.catalog, catalog, options.signal);
  }
  searchDomains(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    if (typeof query !== 'string') throw new TypeError('query must be a string');
    const params = new URLSearchParams({ q: query });
    if (options.maxPrice !== undefined) {
      positiveInteger(options.maxPrice, 'maxPrice'); params.set('max_price', String(options.maxPrice));
    }
    if (options.limit !== undefined) {
      positiveInteger(options.limit, 'limit', 50); params.set('limit', String(options.limit));
    }
    if (options.maxLength !== undefined) {
      positiveInteger(options.maxLength, 'maxLength', 63); params.set('max_length', String(options.maxLength));
    }
    if (options.tier !== undefined) {
      if (!tier(options.tier)) throw new TypeError('tier must be a published Namegarage tier');
      params.set('tier', options.tier);
    }
    if (options.tld !== undefined) {
      if (typeof options.tld !== 'string') throw new TypeError('tld must be a string');
      params.set('tld', options.tld);
    }
    return this.#request(`${defaults.routes.search}?${params}`, search, options.signal);
  }
  getDomain(name: string, options: RequestOptions = {}): Promise<DomainResponse> {
    return this.#request(`${defaults.routes.domain}?${nameParams(name)}`, lookup, options.signal);
  }
  getPurchaseOptions(name: string, options: RequestOptions = {}): Promise<DomainResponse<PurchaseDomain>> {
    return this.#request(`${defaults.routes.purchaseOptions}?${nameParams(name)}`, paymentLookup, options.signal);
  }
  suggestAlternatives(name: string, options: AlternativesOptions = {}): Promise<AlternativesResponse> {
    const params = nameParams(name);
    if (options.query !== undefined) {
      if (typeof options.query !== 'string' || [...options.query].length < 2 || [...options.query].length > 200)
        throw new TypeError('query must contain 2 to 200 characters');
      params.set('query', options.query);
    }
    if (options.maxPrice !== undefined) { positiveInteger(options.maxPrice, 'maxPrice'); params.set('max_price', String(options.maxPrice)); }
    if (options.limit !== undefined) { positiveInteger(options.limit, 'limit', 50); params.set('limit', String(options.limit)); }
    return this.#request(`${defaults.routes.alternatives}?${params}`, alternatives, options.signal);
  }
  async #request<T>(path: string, validate: (value: unknown) => value is T, signal?: AbortSignal): Promise<T> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new DOMException('Namegarage request timed out', 'TimeoutError')), this.#timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
    try {
      combined.throwIfAborted();
      const response = await this.#fetch(new URL(path, this.#origin), {
        method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit',
        redirect: 'error', signal: combined,
      });
      const raw = await response.text();
      combined.throwIfAborted();
      let body: unknown;
      try { body = JSON.parse(raw); }
      catch {
        if (response.ok) throw new NamegarageResponseError();
        body = raw;
      }
      if (!response.ok) throw new NamegarageApiError(response.status, body, response.headers.get('retry-after'));
      if (!validate(body)) throw new NamegarageResponseError();
      return body;
    } finally { clearTimeout(timer); }
  }
}
