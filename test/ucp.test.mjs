import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Namegarage,NamegarageApiError,NamegarageResponseError} from '../dist/index.js';
const origin='https://namegarage.com',version='2026-08-25',platform='https://platform.example/.well-known/ucp';
const profile={ucp:{version,services:{'dev.ucp.shopping':[{version,transport:'rest',schema:'https://ucp.dev/'+version+'/services/shopping/rest.openapi.json',endpoint:origin+'/api/ucp'}]},capabilities:{'dev.ucp.shopping.catalog.search':[{version}],'dev.ucp.shopping.catalog.lookup':[{version}],'dev.ucp.shopping.permalink':[{version,config:{endpoint:origin+'/ucp/buy'}}]},payment_handlers:{}}};
const product={id:'example.invalid',title:'example.invalid',description:{plain:'Synthetic'},url:origin+'/domain/example.invalid',price_range:{min:{currency:'USD',amount:123400},max:{currency:'USD',amount:123400}},variants:[{id:'example.invalid',title:'example.invalid',description:{plain:'Synthetic'},price:{currency:'USD',amount:123400},availability:{available:true,status:'in_stock'}}]};
const ucp={version,status:'success',capabilities:profile.ucp.capabilities};
test('UCP client discovers the service and makes only catalog read requests',async()=>{
 const requests=[];const client=new Namegarage({fetch:async(url,init)=>{requests.push([new URL(url).pathname,init]);assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');if(init.method==='GET')return Response.json(profile);assert.equal(init.headers['UCP-Agent'],`profile="${platform}"`);assert.equal(init.headers['Content-Type'],'application/json');const path=new URL(url).pathname;return Response.json(path.endsWith('/product')?{ucp,product}:{ucp,products:[path.endsWith('/lookup')?{...product,variants:product.variants.map(v=>({...v,inputs:[{id:'example.invalid',match:'exact'}]}))}:product],...(path.endsWith('/search')?{pagination:{has_next_page:false}}:{})});}});
 assert.equal(typeof client.searchUcpCatalog,'function','typed UCP reads must exist');
 const actual=await client.getUcpProfile();assert.equal(actual.ucp.version,version);
 assert.equal((await client.searchUcpCatalog({query:'example'}, {platformProfile:platform})).products[0].id,product.id);
 assert.equal((await client.lookupUcpCatalog({ids:['example.invalid']},{platformProfile:platform})).products[0].id,product.id);
 assert.equal((await client.getUcpProduct({id:'example.invalid'},{platformProfile:platform})).product.id,product.id);
 const before=requests.length;assert.equal(client.createPurchaseLink('example.invalid',actual),origin+'/ucp/buy/example.invalid:1');assert.equal(client.createPurchaseLink('café.invalid',actual),origin+'/ucp/buy/xn--caf-dma.invalid:1');assert.equal(requests.length,before,'link generation is local');
 assert.ok(requests.every(([path])=>['/.well-known/ucp','/api/ucp/catalog/search','/api/ucp/catalog/lookup','/api/ucp/catalog/product'].includes(path)));
 for(const name of ['https://evil.invalid','x.invalid?buyer_email=x','x.invalid:2','x.invalid/y'])assert.throws(()=>client.createPurchaseLink(name,actual));
 assert.throws(()=>client.createPurchaseLink('example.invalid',{ucp:{...profile.ucp,capabilities:{...profile.ucp.capabilities,'dev.ucp.shopping.permalink':[{version,config:{endpoint:'https://evil.invalid/buy'}}]}}}));
});
test('UCP errors include HTTP 200 negotiation errors and are not retried',async()=>{
 let reads=0;const client=new Namegarage({fetch:async(url,init)=>{if(init.method==='GET')return Response.json(profile);reads++;return Response.json({ucp:{version,status:'error'},code:'capabilities_incompatible',messages:[],continue_url:origin});}});
 await assert.rejects(client.searchUcpCatalog({}, {platformProfile:platform}),e=>e instanceof NamegarageApiError&&e.status===200&&e.code==='capabilities_incompatible');assert.equal(reads,1);
});
test('UCP clients reject unsafe profiles, body bounds and malformed success responses',async()=>{
 const client=new Namegarage({fetch:async()=>Response.json(profile)});
 assert.throws(()=>client.searchUcpCatalog({}, {platformProfile:'http://127.0.0.1/.well-known/ucp'}));
 assert.throws(()=>client.lookupUcpCatalog({ids:Array(21).fill('example.invalid')},{platformProfile:platform}));
 assert.throws(()=>client.searchUcpCatalog({filters:{price:{max:1.5}}},{platformProfile:platform}));
 const bad=new Namegarage({fetch:async(url,init)=>Response.json(init.method==='GET'?profile:{ucp,products:[{...product,variants:[{...product.variants[0],price:{currency:'USD',amount:NaN}}]}],pagination:{has_next_page:false}})});
 await assert.rejects(bad.searchUcpCatalog({}, {platformProfile:platform}),NamegarageResponseError);
 const endpoint=new Namegarage({fetch:async()=>Response.json({ucp:{...profile.ucp,services:{'dev.ucp.shopping':[{version,transport:'rest',endpoint:origin+'/api/buy'}]}}})});
 await assert.rejects(endpoint.searchUcpCatalog({}, {platformProfile:platform}),NamegarageResponseError);
});

test('UCP batch lookup requires protocol correlation metadata',async()=>{
 const client=new Namegarage({fetch:async(url,init)=>Response.json(init.method==='GET'?profile:{ucp,products:[product]})});
 await assert.rejects(client.lookupUcpCatalog({ids:['example.invalid']},{platformProfile:platform}),NamegarageResponseError);
});
