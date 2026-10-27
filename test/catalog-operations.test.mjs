import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Namegarage,NamegarageResponseError,NamegarageApiError} from '../dist/index.js';
const hit={name:'example.invalid',url:'https://namegarage.com/domain/example.invalid',tier:'Gold',price_usd:1000,match:'exact',fits:null};
const found={name:'example.invalid',priced_at:123,found:true,domain:hit};
const offer={currency:'USD',buy_outright:null,lease_base_price_usd:null,lease_to_own:[]};
const purchase={currency:'USD',buy_outright:{total_usd:1000},lease_base_price_usd:1200,lease_to_own:[{months:3,down_payment_usd:0,first_payment_usd:400,monthly_payment_usd:400,final_payment_usd:400,total_usd:1200,extra_cost_vs_buy_outright_usd:200}]};
const alternatives={name:'reference.invalid',query:'meal planning',priced_at:123,meaning:'unavailable',count:1,results:[hit]};
const methods=[['getDomain','/api/domain',found],['getPurchaseOptions','/api/purchase-options',{...found,domain:{...hit,purchase_options:purchase}}],['suggestAlternatives','/api/alternatives',alternatives]];
for(const [method,path,body] of methods){
 test(`${method} uses an anonymous encoded GET and preserves server fields`,async()=>{
  const calls=[];const client=new Namegarage({fetch:async(url,init)=>{calls.push([url,init]);return Response.json(body);}});
  assert.deepEqual(await client[method]('example.invalid',method==='suggestAlternatives'?{query:'meal planning',maxPrice:3000,limit:2}:{}),body);
  assert.equal(calls.length,1);const [url,init]=calls[0];assert.equal(url.pathname,path);assert.equal(url.searchParams.get('name'),'example.invalid');assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
  if(method==='suggestAlternatives')assert.deepEqual(Object.fromEntries(url.searchParams),{name:'example.invalid',query:'meal planning',max_price:'3000',limit:'2'});
 });
 test(`${method} propagates refusal metadata and cancellation without retry`,async()=>{
  let calls=0;const client=new Namegarage({fetch:async()=>{calls++;return Response.json({error:'busy'},{status:429,headers:{'retry-after':'12'}});}});
  await assert.rejects(client[method]('x.invalid'),e=>e instanceof NamegarageApiError&&e.status===429&&e.retryAfterSeconds===12);assert.equal(calls,1);
  const controller=new AbortController();controller.abort();await assert.rejects(client[method]('x.invalid',{signal:controller.signal}),e=>e.name==='AbortError');assert.equal(calls,1);
 });
 test(`${method} rejects invalid names before fetching`,()=>{
  const client=new Namegarage({fetch:()=>{throw Error('must not fetch');}});
  for(const name of ['', 'https://example.invalid', 'x.invalid/path', 'a..invalid', 'x.invalid?token=x',null])assert.throws(()=>client[method](name),TypeError);
 });
}
test('not-found and offer-only lookups preserve null values',async()=>{
 const missing={name:'missing.invalid',priced_at:123,found:false,domain:null};
 assert.deepEqual(await new Namegarage({fetch:async()=>Response.json(missing)}).getDomain('missing.invalid'),missing);
 const body={...found,domain:{...hit,price_usd:null,purchase_options:offer}};
 assert.deepEqual(await new Namegarage({fetch:async()=>Response.json(body)}).getPurchaseOptions('example.invalid'),body);
});
test('rejects inconsistent success envelopes and missing payment amounts',async()=>{
 for(const body of [{...found,found:false},{...found,domain:null},{...found,priced_at:'123'},{...found,domain:{...hit,price_usd:1.5}}])await assert.rejects(new Namegarage({fetch:async()=>Response.json(body)}).getDomain('example.invalid'),NamegarageResponseError);
 for(const options of [undefined,{...purchase,currency:'EUR'},{...purchase,lease_to_own:[{...purchase.lease_to_own[0],final_payment_usd:undefined}]},{...purchase,buy_outright:{total_usd:'1000'}}])await assert.rejects(new Namegarage({fetch:async()=>Response.json({...found,domain:{...hit,purchase_options:options}})}).getPurchaseOptions('example.invalid'),NamegarageResponseError);
 await assert.rejects(new Namegarage({fetch:async()=>Response.json({...alternatives,count:2})}).suggestAlternatives('reference.invalid'),NamegarageResponseError);
});
test('validates alternatives options before fetching',()=>{
 const client=new Namegarage({fetch:()=>{throw Error('must not fetch');}});
 for(const options of [{maxPrice:0},{maxPrice:1.5},{limit:0},{limit:51}])assert.throws(()=>client.suggestAlternatives('x.invalid',options),RangeError);
 for(const query of ['', 'x', 'x'.repeat(201)])assert.throws(()=>client.suggestAlternatives('x.invalid',{query}),TypeError);
});
