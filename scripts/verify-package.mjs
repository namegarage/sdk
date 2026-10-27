import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
const npm=join(dirname(process.execPath),'npm');
const packed=JSON.parse(execFileSync(npm,['pack','--json','--ignore-scripts'],{cwd:root,encoding:'utf8'}))[0];
const names=packed.files.map(f=>f.path);
for(const name of ['dist/index.js','dist/index.cjs','dist/index.d.ts','dist/index.d.cts','README.md','LICENSE'])assert.ok(names.includes(name),name);
assert.ok(names.every(n=>n.startsWith('dist/')||['README.md','LICENSE','package.json','CHANGELOG.md','release.json'].includes(n)),names);
const consumer=await mkdtemp(join(tmpdir(),'namegarage-sdk-consumer-'));
await writeFile(join(consumer,'package.json'),JSON.stringify({private:true,type:'module'}));
execFileSync(npm,['install',join(root,packed.filename),'--ignore-scripts','--no-audit','--no-fund','--cache=/private/tmp/namegarage-sdk-npm-cache'],{cwd:consumer,stdio:'pipe'});
const packageJson=JSON.parse(await readFile(join(consumer,'node_modules/@namegarage/sdk/package.json')));
assert.equal(packageJson.version,'0.2.0');assert.equal(Object.keys(packageJson.dependencies||{}).length,0);
for(const ext of ['mts','cts']) {
 const source=`import { Namegarage, NamegarageApiError, type DomainResponse, type PurchaseDomain, type AlternativesResponse, type SearchResponse } from '@namegarage/sdk';\nconst client = new Namegarage();\nconst pending: Promise<SearchResponse> = client.searchDomains('meal plan', {maxPrice: 5000, limit: 3});\nconst detail:Promise<DomainResponse>=client.getDomain('example.invalid');const payments:Promise<DomainResponse<PurchaseDomain>>=client.getPurchaseOptions('example.invalid');const alternatives:Promise<AlternativesResponse>=client.suggestAlternatives('example.invalid',{limit:3});void detail;void payments;void alternatives;void pending; void NamegarageApiError;\n`;
 await writeFile(join(consumer,`consumer.${ext}`),source);
 execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',join(consumer,`consumer.${ext}`)],{cwd:consumer,stdio:'pipe'});
}
await writeFile(join(consumer,'runtime.mjs'),`import assert from 'node:assert/strict';import {Namegarage} from '@namegarage/sdk';const c=new Namegarage({fetch:async()=>Response.json({brand:'Namegarage',base_url:'https://namegarage.com',count:0,traffic_max_stale_days:30,domains:[]})});assert.equal((await c.getCatalog()).count,0);`);
execFileSync(process.execPath,['runtime.mjs'],{cwd:consumer,stdio:'pipe'});
execFileSync(process.execPath,['-e',"if(typeof require('@namegarage/sdk').Namegarage!=='function')process.exit(1)"],{cwd:consumer,stdio:'pipe'});
const bundle=await build({absWorkingDir:consumer,stdin:{contents:"import {Namegarage} from '@namegarage/sdk';globalThis.ExampleSDK=Namegarage;",resolveDir:consumer},bundle:true,platform:'browser',format:'iife',write:false,metafile:true});
assert.ok(!Object.keys(bundle.metafile.inputs).some(k=>k.startsWith('node:')));
console.log(JSON.stringify({status:'passed',package:packed.filename,files:names,consumer,esm:true,commonjs:true,typescriptESM:true,typescriptCJS:true,browserBundleBytes:bundle.outputFiles[0].contents.length,runtimeDependencies:0},null,2));
