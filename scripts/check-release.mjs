import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Namegarage} from '../dist/index.js';
const root=new URL('../',import.meta.url);
const pkg=JSON.parse(await readFile(new URL('package.json',root)));
const release=JSON.parse(await readFile(new URL('release.json',root)));
assert.equal(pkg.version,release.components.sdk,'Coordinate the SDK version with the release manifest');
const methods=Object.getOwnPropertyNames(Namegarage.prototype).filter(name=>name!=='constructor');
assert.deepEqual(methods.sort(),['getCatalog',...release.capabilities.map(c=>c.sdk),...(release.ucp?['getUcpProfile','createPurchaseLink',...release.ucp.operations.map(o=>o.sdk)]:[])].sort(),'Public SDK methods need coordinated capability metadata');
assert((await readFile(new URL('CHANGELOG.md',root),'utf8')).includes(`## ${pkg.version} `),'A release needs its changelog entry');
for(const alias of ['namegarage','namegarage-sdk']){
 const manifest=JSON.parse(await readFile(new URL(`aliases/${alias}/package.json`,root)));
 assert.equal(manifest.dependencies['@namegarage/sdk'],pkg.version,'Update exact alias pins');
 const lock=JSON.parse(await readFile(new URL(`aliases/${alias}/package-lock.json`,root)));
 assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].dependencies['@namegarage/sdk'],pkg.version);assert.equal(lock.packages['node_modules/@namegarage/sdk'].version,pkg.version);
}
console.log(`SDK release coordination passed: ${release.id}`);
