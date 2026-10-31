/** Public configuration defaults; constructor options can override origin/timeout. */
export const defaults = {
  baseUrl: 'https://namegarage.com',
  timeoutMs: 10_000,
  ucp: {version:"2026-08-25",profile:"/.well-known/ucp",restBase:"/api/ucp",permalink:"/ucp/buy",maxPageSize:20,maxLookupIds:20,maxQueryChars:200,maxBodyBytes:16384},
  routes: {catalog:'/domains.json', search:'/api/search', domain:'/api/domain', purchaseOptions:'/api/purchase-options', alternatives:'/api/alternatives'},
} as const;
