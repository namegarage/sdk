/** Public configuration defaults; constructor options can override origin/timeout. */
export const defaults = {
  baseUrl: 'https://namegarage.com',
  timeoutMs: 10_000,
  routes: {catalog:'/domains.json', search:'/api/search', domain:'/api/domain', purchaseOptions:'/api/purchase-options', alternatives:'/api/alternatives'},
} as const;
