import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const urlArg = process.argv[2], expected = process.argv[3];
const stages = ['01-first','02-repeat','03-price','04-disappear','05-same-name','06-rename','07-owner-link'];
if (!urlArg || !stages.includes(expected)) {
  console.error('Usage: node check-published.mjs https://ACCOUNT.github.io/ <stage>');
  process.exitCode = 2;
} else {
  const base = new URL(urlArg);
  // Root Pages site is essential: importer requests origin + '/robots.txt'.
  assert.equal(base.protocol,'https:','HTTPS required');
  assert.match(base.hostname,/^[a-z0-9-]+\.github\.io$/i, 'GitHub Pages user-site only');
  assert.equal(base.pathname,'/','do not use /project/ URL; robots.txt must be at origin root');
  assert.equal(base.search,'');
  assert.equal(base.hash,'');
  assert.equal(base.username,'');
  assert.equal(base.password,'');
  assert.equal(base.port,'');
  const cacheNonce = Date.now() + '-' + Math.random().toString(36).slice(2);
  async function request(path) {
    const url = new URL(path, base);
    url.searchParams.set('r6verify',cacheNonce);
    return fetch(url, {redirect:'manual',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
  }
  async function read200(path) {
    const response = await request(path);
    assert.equal(response.status,200,path+': expected 200, got '+response.status);
    return Buffer.from(await response.arrayBuffer());
  }
  const remoteStage=(await read200('/stage.txt')).toString('utf8').trim();
  assert.equal(remoteStage,expected,'wrong published stage: possible CDN/Actions delay');
  const manifest=JSON.parse((await read200('/manifest.json')).toString('utf8'));
  assert.equal(manifest.stage,expected);
  assert.equal(manifest.controlledSyntheticSource,true);
  for (const [path, checksum] of Object.entries(manifest.sha256)) {
    assert.match(path,/^\/(?:robots\.txt|index\.html|projects\/[a-z0-9-]+\.html)$/);
    const body=await read200(path);
    assert.equal(createHash('sha256').update(body).digest('hex'),checksum,
      'actual HTTPS bytes differ from signed-in GitHub Pages manifest at '+path);
  }
  assert.equal((await read200('/robots.txt')).toString('utf8'),'User-agent: *\nAllow: /projects/\n');
  for(const path of manifest.missingRelativePaths) {
    assert.match(path,/^\/projects\/[a-z0-9-]+\.html$/);
    const response=await request(path);
    assert.equal(response.status,404, path+' disappeared: missing page must return actual HTTP 404');
  }
  console.log(JSON.stringify({site:base.origin,stage:remoteStage,verifiedBytes:true,verifiedFiles:Object.keys(manifest.sha256).length,missing404:manifest.missingRelativePaths},null,2));
}
