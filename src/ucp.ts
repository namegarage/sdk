import {defaults} from './config.js';
export interface UcpEntity {version:string; schema?:string; spec?:string; config?:{endpoint?:string}}
export interface UcpMetadata {version:string; status?:'success'|'error'; capabilities:Record<string,UcpEntity[]>}
export interface UcpBusinessProfile {ucp:UcpMetadata & {services:Record<string,(UcpEntity & {transport:string; endpoint:string})[]>; payment_handlers:Record<string,unknown[]>}}
export interface UcpPrice {amount:number; currency:'USD'}
export interface UcpProduct {
  id:string; title:string; description:{plain?:string;html?:string;markdown?:string}; url?:string;
  price_range:{min:UcpPrice;max:UcpPrice};
  variants:{id:string;title:string;description:UcpProduct['description'];price:UcpPrice;url?:string;availability?:{available?:boolean;status?:string};inputs?:{id:string;match?:string}[]}[];
}
export interface UcpMessage {type:'error'|'warning'|'info';code?:string;content:string;severity?:string}
export interface UcpSearchRequest {
  query?:string;filters?:{price?:{min?:number;max?:number};categories?:string[]};
  context?:{currency?:string;language?:string;eligibility?:string[]};pagination?:{limit?:number;cursor?:string};
}
export interface UcpLookupRequest extends Omit<UcpSearchRequest,'query'|'pagination'> {ids:string[]}
export interface UcpProductRequest extends Omit<UcpSearchRequest,'query'|'pagination'> {id:string}
export interface UcpSearchResponse {ucp:UcpMetadata;products:UcpProduct[];pagination:{has_next_page:boolean;cursor?:string};messages?:UcpMessage[]}
export interface UcpLookupProduct extends Omit<UcpProduct,'variants'> {variants:(UcpProduct['variants'][number] & {inputs:{id:string;match?:string}[]})[]}
export interface UcpLookupResponse {ucp:UcpMetadata;products:UcpLookupProduct[];messages?:UcpMessage[]}
export interface UcpProductResponse {ucp:UcpMetadata;product:UcpProduct;messages?:UcpMessage[]}
export interface UcpRequestOptions {platformProfile:string;signal?:AbortSignal}
const object=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(x:unknown):x is string=>typeof x==='string';
const safe=(x:unknown):x is number=>Number.isSafeInteger(x)&&(x as number)>=0;
const metadata=(x:unknown):boolean=>object(x)&&x.version===defaults.ucp.version&&x.status!=='error'&&object(x.capabilities);
const description=(x:unknown):boolean=>object(x)&&Object.values(x).some(text);
const price=(x:unknown):boolean=>object(x)&&x.currency==='USD'&&safe(x.amount)&&x.amount>0;
const product=(x:unknown):boolean=>object(x)&&text(x.id)&&text(x.title)&&description(x.description)&&object(x.price_range)&&price(x.price_range.min)&&price(x.price_range.max)
  &&Array.isArray(x.variants)&&x.variants.length>0&&x.variants.every(v=>object(v)&&text(v.id)&&text(v.title)&&description(v.description)&&price(v.price));
export function ucpProfile(x:unknown):x is UcpBusinessProfile {
  return object(x)&&object(x.ucp)&&metadata(x.ucp)&&object(x.ucp.services)&&object(x.ucp.payment_handlers)
    &&Array.isArray(x.ucp.services['dev.ucp.shopping'])&&x.ucp.services['dev.ucp.shopping'].some(s=>object(s)&&s.version===defaults.ucp.version&&s.transport==='rest'&&text(s.endpoint));
}
export function ucpSearch(x:unknown):x is UcpSearchResponse {return catalogResult(x)&&object(x)&&object(x.pagination)&&typeof x.pagination.has_next_page==='boolean'&&(!x.pagination.has_next_page||text(x.pagination.cursor));}
function catalogResult(x:unknown):x is Record<string,unknown> & {products:UcpProduct[]} {return object(x)&&metadata(x.ucp)&&Array.isArray(x.products)&&x.products.every(product);}
export function ucpLookup(x:unknown):x is UcpLookupResponse {return catalogResult(x)&&x.products.every(p=>p.variants.every(v=>Array.isArray(v.inputs)&&v.inputs.length>0&&v.inputs.every(input=>object(input)&&text(input.id)&&(input.match===undefined||text(input.match)))));}
export function ucpProduct(x:unknown):x is UcpProductResponse {return object(x)&&metadata(x.ucp)&&product(x.product);}
export function ucpId(value:string):string {
  if(typeof value!=='string'||value.length>253||!value||/[\s\x00-\x1f\x7f/:?#%@\\]/u.test(value))throw new TypeError('Use a domain ID without URL fields');
  const id=new URL('https://'+value.normalize('NFC').toLowerCase()).hostname;
  if(!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(id)||id.length>253||id.split('.').some(v=>v.length>63))throw new TypeError('Invalid domain ID');
  return id;
}
export function ucpBody(body:UcpSearchRequest|UcpLookupRequest|UcpProductRequest,kind:'search'|'lookup'|'product',platform:string):string {
  const url=new URL(platform);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port||url.pathname!==defaults.ucp.profile||url.href!==platform)throw new TypeError('Use an exact HTTPS UCP platform profile URL');
  if(!object(body))throw new TypeError('Use a UCP request object');
  const b=body as UcpSearchRequest;
  if(b.query!==undefined&&(!text(b.query)||[...b.query].length>defaults.ucp.maxQueryChars))throw new RangeError('Query is too long');
  if(b.pagination?.limit!==undefined&&(!safe(b.pagination.limit)||b.pagination.limit<1||b.pagination.limit>defaults.ucp.maxPageSize))throw new RangeError('Invalid page size');
  for(const amount of [b.filters?.price?.min,b.filters?.price?.max])if(amount!==undefined&&!safe(amount))throw new RangeError('Price filters use safe integer minor units');
  if(kind==='lookup'){const ids=body.ids;if(!Array.isArray(ids)||!ids.length||ids.length>defaults.ucp.maxLookupIds)throw new RangeError('Invalid lookup batch');ids.forEach(id=>{if(typeof id!=='string')throw new TypeError('Invalid domain ID');ucpId(id);});}
  if(kind==='product'){if(typeof body.id!=='string')throw new TypeError('Invalid domain ID');ucpId(body.id);}
  const serialized=JSON.stringify(body);if(new TextEncoder().encode(serialized).length>defaults.ucp.maxBodyBytes)throw new RangeError('UCP request is too large');return serialized;
}
