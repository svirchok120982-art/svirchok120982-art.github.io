import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';

const stages = ['01-first','02-repeat','03-price','04-disappear','05-same-name','06-rename','07-owner-link'];
const dirInput = process.argv[2], stage = process.argv[3];
if (!dirInput || !stages.includes(stage)) {
  console.error('Usage: node verify-site.mjs <generated-directory> <R6_STAGE>');
  process.exitCode = 2;
} else {
  const dir = resolve(dirInput);
  const read = (file) => readFile(join(dir, file));
  const manifest = JSON.parse((await read('manifest.json')).toString('utf8'));
  assert.equal(manifest.schema, 'resortos-r6-controlled-source-v1');
  assert.equal(manifest.controlledSyntheticSource, true);
  assert.equal(manifest.stage, stage);
  assert.equal((await read('stage.txt')).toString('utf8'), stage + '\n');
  assert.equal(manifest.pageCount, manifest.pages.length);
  assert.equal(manifest.pageCount, stages.indexOf(stage) >= 3 ? 2 : 3);
  assert.equal((await read('robots.txt')).toString('utf8'),'User-agent: *\nAllow: /projects/\n');
  const urls = Object.keys(manifest.sha256);
  const expected = ['/robots.txt','/index.html','/projects/index.html',...manifest.pages.map(p=>p.relativeUrl)];
  assert.deepEqual(urls.sort(), expected.sort());
  for (const url of urls) {
    assert.match(url, /^\/(?:robots\.txt|index\.html|projects\/[a-z0-9-]+\.html)$/);
    const filePath = resolve(dir, '.' + url);
    assert.ok(filePath.startsWith(dir + sep), 'no path traversal');
    const bytes = await readFile(filePath);
    assert.match(manifest.sha256[url], /^[0-9a-f]{64}$/);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256[url]);
  }
  const offer = join(dir,'projects/offer.html');
  if (stages.indexOf(stage) >= 3) {
    await assert.rejects(stat(offer), {code:'ENOENT'});
    assert.deepEqual(manifest.missingRelativePaths,['/projects/offer.html']);
  } else {
    assert.equal((await stat(offer)).isFile(),true);
    assert.deepEqual(manifest.missingRelativePaths,[]);
  }
  console.log('R-6 Pages synthetic output verified:',stage,'pages=',manifest.pageCount,'files=',urls.length);
}
