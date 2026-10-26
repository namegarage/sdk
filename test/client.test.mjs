import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Namegarage, NamegarageApiError, NamegarageResponseError } from '../dist/index.js';
const hit = {name:'example.invalid',url:'https://namegarage.com/domain/example.invalid',tier:null,price_usd:null,match:'keyword',fits:null};
const search = {query:'meal plan',priced_at:123,meaning:'unavailable',count:1,results:[hit]};
const domain = {name:'example.invalid',sld:'example',tld:'invalid',path:'/domain/example.invalid',tier:'',buy_now:null,categories:[],low:null};
const catalog = {brand:'Namegarage',base_url:'https://namegarage.com',count:1,traffic_max_stale_days:30,domains:[domain]};
const json = body => async () => Response.json(body);
test('encodes queries and filters without forwarding credentials or retrying', async () => {
  const requests=[];
  const client=new Namegarage({fetch:async (url,init)=>{requests.push({url,init});return Response.json(search);}});
  const result=await client.searchDomains('餐饮 & meal=plan',{maxPrice:5000,tier:'Gold',tld:'co.uk',maxLength:12,limit:3});
  assert.equal(requests.length,1);
  const {url,init}=requests[0];
  assert.equal(url.origin,'https://namegarage.com');assert.equal(url.pathname,'/api/search');
  assert.deepEqual(Object.fromEntries(url.searchParams),{q:'餐饮 & meal=plan',max_price:'5000',limit:'3',max_length:'12',tier:'Gold',tld:'co.uk'});
  assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
  assert.deepEqual(init.headers,{Accept:'application/json'});assert.equal(result.results[0].price_usd,null);
  assert.equal(result.meaning,'unavailable');assert.equal(result.results[0].match,'keyword');
});
test('returns a catalog snapshot with offer-only prices and untiered domains intact',async()=>{
  const client=new Namegarage({fetch:async url=>{assert.equal(url.pathname,'/domains.json');return Response.json(catalog);}});
  assert.deepEqual(await client.getCatalog(),catalog);
});
test('preserves HTTP error status, machine code, body and Retry-After with no retry',async()=>{
  let calls=0;
  const client=new Namegarage({fetch:async()=>{calls++;return Response.json({error:'busy'},{status:429,headers:{'retry-after':'60'}});}});
  await assert.rejects(client.searchDomains('meal'),e=>e instanceof NamegarageApiError && e.status===429 && e.code==='busy' && e.retryAfter==='60' && e.retryAfterSeconds===60);
  assert.equal(calls,1);
});
test('handles non-JSON edge refusals and HTTP-date retry headers',async()=>{
  const tomorrow=new Date(Date.now()+60_000).toUTCString();
  const client=new Namegarage({fetch:async()=>new Response('Access denied',{status:403,headers:{'retry-after':tomorrow}})});
  await assert.rejects(client.getCatalog(),e=>e instanceof NamegarageApiError && e.status===403 && e.code===null && e.body==='Access denied' && e.retryAfterSeconds>0 && e.retryAfterSeconds<=60);
});
test('rejects malformed successful responses, missing and invalid price values',async()=>{
  for(const response of [()=>new Response('<html>challenge</html>'),()=>Response.json({}),()=>Response.json({...search,results:[{...hit,price_usd:undefined}]}),()=>Response.json({...search,results:[{...hit,price_usd:'500'}]}),()=>Response.json({...search,results:[{...hit,price_usd:50.5}]}),()=>Response.json({...search,count:2})])
    await assert.rejects(new Namegarage({fetch:async()=>response()}).searchDomains('meal'),NamegarageResponseError);
});
test('validates configuration and numeric options before network access',()=>{
  for(const baseUrl of ['http://example.com','https://a.test/private','https://user:pass@a.test','https://a.test/?secret=1','https://a.test/#x'])assert.throws(()=>new Namegarage({baseUrl}),TypeError);
  for(const timeoutMs of [0,-1,Infinity,2**31])assert.throws(()=>new Namegarage({timeoutMs}),RangeError);
  for(const options of [{maxPrice:0},{maxPrice:50.5},{limit:51},{maxLength:64}])assert.throws(()=>new Namegarage().searchDomains('meal',options),RangeError);
  assert.throws(()=>new Namegarage().searchDomains('meal',{tier:'Diamond'}),TypeError);
});
test('supports isolated loopback origins',async()=>{
  await new Namegarage({baseUrl:'http://127.0.0.1:12345',fetch:async url=>{assert.equal(url.origin,'http://127.0.0.1:12345');return Response.json(catalog);}}).getCatalog();
});
test('does not fetch an already cancelled request',async()=>{
  let calls=0;const controller=new AbortController();controller.abort();
  const client=new Namegarage({fetch:async()=>{calls++;return Response.json(catalog);}});
  await assert.rejects(client.getCatalog({signal:controller.signal}),e=>e.name==='AbortError');assert.equal(calls,0);
});
test('cancels in-flight requests and enforces the configured timeout',async()=>{
  const pending=async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
  await assert.rejects(new Namegarage({timeoutMs:10,fetch:pending}).getCatalog(),e=>e.name==='TimeoutError');
  const controller=new AbortController();const promise=new Namegarage({fetch:pending}).getCatalog({signal:controller.signal});controller.abort();
  await assert.rejects(promise,e=>e.name==='AbortError');
});
test('exports equivalent CommonJS and ESM interfaces',async()=>{
  const {createRequire}=await import('node:module');const common=createRequire(import.meta.url)('../dist/index.cjs');
  assert.equal(typeof common.Namegarage,'function');assert.deepEqual(await new common.Namegarage({fetch:json(catalog)}).getCatalog(),catalog);
});
