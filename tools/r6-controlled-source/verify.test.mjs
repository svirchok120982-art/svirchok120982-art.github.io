import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import test from 'node:test';

const fixture = resolve(import.meta.dirname,'render.mjs');
const stages = ['01-first','02-repeat','03-price','04-disappear','05-same-name','06-rename','07-owner-link'];

test('seven immutable publish states model identity, price, absence and explicit linking', async () => {
  const workspace = await mkdtemp(join(tmpdir(),'r6-source-'));
  try {
    const snapshots = [];
    for (const [i,stage] of stages.entries()) {
      const dir = join(workspace,'stage-'+i);
      const run = spawnSync(process.execPath,[fixture,stage,dir],{encoding:'utf8'});
      assert.equal(run.status,0,run.stderr);
      const read = async (path) => readFile(join(dir,path),'utf8');
      const files = await readdir(join(dir,'projects'));
      assert.ok(files.length>=3,'at least listing plus two project pages');
      assert.equal(await read('robots.txt'),'User-agent: *\nAllow: /projects/\n');

      const manifest = JSON.parse(await read('manifest.json'));
      assert.equal((await read('stage.txt')).trim(), stage);
      assert.equal(manifest.schema, 'resortos-r6-controlled-source-v1');
      assert.equal(manifest.controlledSyntheticSource, true);
      assert.equal(manifest.stage, stage);
      assert.equal(manifest.pageCount, i >= 3 ? 2 : 3);
      assert.deepEqual(manifest.missingRelativePaths, i >= 3 ? ['/projects/offer.html'] : []);
      assert.equal(manifest.pages.length, manifest.pageCount);
      for (const [url, checksum] of Object.entries(manifest.sha256)) {
        assert.match(checksum, /^[0-9a-f]{64}$/);
        const bytes = await readFile(join(dir, url.slice(1)));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), checksum,
          stage + ': ' + url + ' must be byte-faithful to manifest');
      }
      const verify = spawnSync(process.execPath, [resolve(import.meta.dirname, 'verify-site.mjs'), dir, stage], {encoding:'utf8'});
      assert.equal(verify.status, 0, verify.stderr);
      const inventory = await read('projects/index.html');
      assert.match(inventory, /href="alpha\.html"/);
      assert.doesNotMatch(inventory, /href="\/projects\//);
      assert.match(await read('index.html'), /href="projects\/index\.html"/);

      const alpha = await read('projects/alpha.html'), beta = await read('projects/beta.html');
      snapshots.push({inventory,alpha,beta,files,offer:files.includes('offer.html')?await read('projects/offer.html'):null});
    }
    assert.deepEqual(snapshots[0],snapshots[1],'repeat must be byte-identical');
    assert.match(snapshots[0].alpha,/>12500000</);
    assert.match(snapshots[2].alpha,/>13000000</);
    assert.match(snapshots[2].alpha,/R6-A-001/);
    assert.match(snapshots[0].inventory,/R6-C-001/);
    assert.doesNotMatch(snapshots[3].inventory,/R6-C-001/);
    assert.equal(snapshots[3].offer,null,'disappearing offer no longer served');
    for(const snapshot of snapshots) assert.doesNotMatch(JSON.stringify(snapshot),/продан|sold|sale completed/i,'absence is not a sale');
    assert.match(snapshots[4].alpha,/Сосновый берег/);
    assert.match(snapshots[4].beta,/Сосновый берег/);
    assert.match(snapshots[4].alpha,/Краснодар/);
    assert.match(snapshots[4].beta,/Сочи/);
    assert.match(snapshots[5].alpha,/Сосновый берег Северный/);
    assert.match(snapshots[5].alpha,/R6-A-001/);
    assert.deepEqual(snapshots[5],snapshots[6],'linking requires an Owner API action, not a page change');
  } finally {
    await rm(workspace,{recursive:true,force:true});
  }
});

test('Pages publication is manual, pinned and restricted to a dedicated root user site', async () => {
  const template = resolve(import.meta.dirname, 'github-pages/publish-pages.yml');
  const exported = resolve(import.meta.dirname, '../../.github/workflows/r6-pages.yml');
  const workflow = await readFile(existsSync(template) ? template : exported, 'utf8');
  assert.match(workflow, /^\s+workflow_dispatch:\s*$/m);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /github\.event\.repository\.name/);
  assert.match(workflow, /github-pages/);
  assert.match(workflow, /actions\/upload-pages-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/deploy-pages@[0-9a-f]{40}/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule|workflow_run):\s*$/m);
  assert.doesNotMatch(workflow, /(?<![a-z])(?:render\.com|onrender\.com)/i);
});
