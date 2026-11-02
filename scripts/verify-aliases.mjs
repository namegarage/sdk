import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const npm=join(dirname(process.execPath),'npm');
const names=['namegarage','namegarage-sdk'];
const archives=[];
for(const name of names){
 const dir=join(root,'aliases',name);
 const manifest=JSON.parse(await readFile(join(dir,'package.json')));
 assert.deepEqual(manifest.dependencies,{'@namegarage/sdk':'0.3.0'});
 if(process.env.NAMEGARAGE_CANONICAL_ARCHIVE){
  const canonicalBytes=await readFile(process.env.NAMEGARAGE_CANONICAL_ARCHIVE);
  const lock=JSON.parse(await readFile(join(dir,'package-lock.json')));
  assert.equal(lock.packages['node_modules/@namegarage/sdk'].integrity,'sha512-'+createHash('sha512').update(canonicalBytes).digest('base64'),'Alias lock must match the exact canonical archive');
 }
 assert.equal(manifest.version,'0.3.0');assert.equal(manifest.license,'MIT');
 assert.equal(manifest.scripts,undefined);
 const packed=JSON.parse(execFileSync(npm,['pack','--ignore-scripts','--json'],{cwd:dir,encoding:'utf8'}))[0];
 assert.deepEqual(packed.files.map(x=>x.path).sort(),['LICENSE','README.md','index.cjs','index.d.cts','index.d.ts','index.js','package.json'].sort());
 const path=join(dir,packed.filename);const bytes=await readFile(path);
 archives.push({name,path,bytes:bytes.length,integrity:'sha512-'+createHash('sha512').update(bytes).digest('base64')});
}
const consumer=await mkdtemp(join(tmpdir(),'namegarage-alias-consumer-'));
await writeFile(join(consumer,'package.json'),JSON.stringify({private:true,type:'module'}));
execFileSync(npm,['install',...(process.env.NAMEGARAGE_CANONICAL_ARCHIVE?[process.env.NAMEGARAGE_CANONICAL_ARCHIVE]:[]),...archives.map(x=>x.path),'--ignore-scripts','--no-audit','--no-fund','--cache=/private/tmp/namegarage-alias-npm-cache'],{cwd:consumer,stdio:'pipe'});
const canonical=JSON.parse(await readFile(join(consumer,'node_modules/@namegarage/sdk/package.json')));
assert.equal(canonical.version,'0.3.0');assert.equal(Object.keys(canonical.dependencies||{}).length,0);
await writeFile(join(consumer,'runtime.mjs'),`import assert from 'node:assert/strict';
const canonical=await import('@namegarage/sdk');
for(const name of ${JSON.stringify(names)}){
 const alias=await import(name);assert.deepEqual(Object.keys(alias),Object.keys(canonical));
 for(const key of Object.keys(canonical))assert.strictEqual(alias[key],canonical[key]);
 const client=new alias.Namegarage({fetch:async(input,init)=>{
  assert.equal(new URL(input).pathname,'/domains.json');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
  return Response.json({brand:'Namegarage',base_url:'https://namegarage.com',count:0,traffic_max_stale_days:30,domains:[]});
 }});assert.equal((await client.getCatalog()).count,0);
}`);
execFileSync(process.execPath,['runtime.mjs'],{cwd:consumer,stdio:'pipe'});
execFileSync(process.execPath,['-e',`const assert=require('node:assert/strict');const canonical=require('@namegarage/sdk');for(const name of ${JSON.stringify(names)}){const alias=require(name);assert.deepEqual(Object.keys(alias),Object.keys(canonical));for(const key of Object.keys(canonical))assert.strictEqual(alias[key],canonical[key]);}`],{cwd:consumer,stdio:'pipe'});
const bundles={};
for(const name of names){
 for(const ext of ['mts','cts']){
  const source=`import {Namegarage,NamegarageApiError,type DomainResponse, type PurchaseDomain, type AlternativesResponse, type UcpBusinessProfile, type UcpSearchResponse, type SearchResponse} from '${name}';const client=new Namegarage();const pending:Promise<SearchResponse>=client.searchDomains('meal plan',{maxPrice:5000,limit:3});const detail:Promise<DomainResponse>=client.getDomain('example.invalid');const payments:Promise<DomainResponse<PurchaseDomain>>=client.getPurchaseOptions('example.invalid');const alternatives:Promise<AlternativesResponse>=client.suggestAlternatives('example.invalid',{limit:3});const ucp:Promise<UcpSearchResponse>=client.searchUcpCatalog({query:'synthetic'},{platformProfile:'https://platform.example/.well-known/ucp'});const link=(profile:UcpBusinessProfile)=>client.createPurchaseLink('example.invalid',profile);void ucp;void link;void detail;void payments;void alternatives;void pending;void NamegarageApiError;`;
  const file=join(consumer,`${name}.${ext}`);await writeFile(file,source);
  execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:consumer,stdio:'pipe'});
 }
 const result=await build({absWorkingDir:consumer,stdin:{contents:`import {Namegarage} from '${name}';globalThis.ExampleSDK=Namegarage;`,resolveDir:consumer},bundle:true,platform:'browser',format:'iife',write:false,metafile:true});
 assert(!Object.keys(result.metafile.inputs).some(x=>x.startsWith('node:')));
 bundles[name]=result.outputFiles[0].contents.length;
}
const report={status:'passed',archives,consumer,esm:true,commonjs:true,typescriptESM:true,typescriptCJS:true,fakeFetchOnly:true,browserBundleBytes:bundles,canonicalVersion:'0.3.0',canonicalRuntimeDependencies:0};
await mkdir(join(root,'output'),{recursive:true});
await writeFile(join(root,'output/alias-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
