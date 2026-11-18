import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

const stage = process.argv[2];
const output = process.argv[3];
const stages = ['01-first','02-repeat','03-price','04-disappear','05-same-name','06-rename','07-owner-link'];
if (!stages.includes(stage) || !output) {
  console.error('Usage: node render.mjs <' + stages.join('|') + '> <output-directory>');
  process.exitCode = 2;
} else {
  const s = stages.indexOf(stage);
  const dir = resolve(output);
  if (dir === '/' || dir === process.cwd()) throw new Error('Refusing unsafe output path');
  await rm(dir, { recursive: true, force: true });
  await mkdir(join(dir, 'projects'), { recursive: true });
  const pages = [
    { externalId: 'R6-A-001', slug: 'alpha', name: s >= 5 ? 'Сосновый берег Северный' : 'Сосновый берег', city: 'Краснодар', location: 'Краснодарский край, Краснодар', price: s >= 2 ? 13000000 : 12500000 },
    { externalId: 'R6-B-001', slug: 'beta', name: s >= 4 ? 'Сосновый берег' : 'Лазурная долина', city: 'Сочи', location: 'Краснодарский край, Сочи', price: 17800000 },
    { externalId: 'R6-C-001', slug: 'offer', name: 'Горная терраса', city: 'Краснодар', location: 'Краснодарский край, Краснодар', price: 9800000 },
  ];
  const visible = s >= 3 ? pages.slice(0, 2) : pages;
  const esc = (v) => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const html = (title, body) => '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>'+esc(title)+'</title></head><body><main>'+body+'</main></body></html>\n';
  const list = '<h1>Контролируемый источник ResortOS R-6</h1>\n<ul data-r6-inventory>\n' +
    visible.map((p)=>'<li><a href="'+p.slug+'.html" data-r6-inventory-id="'+p.externalId+'">'+esc(p.name)+'</a></li>').join('\n') + '\n</ul>';
  await writeFile(join(dir,'projects','index.html'), html('Каталог технических объектов',list), 'utf8');
  for (const p of visible) {
    const content = [
      '<article data-r6-external-id="'+p.externalId+'" data-r6-synthetic="true">',
      '<h1 data-field="project.name">'+esc(p.name)+'</h1>',
      '<p data-field="project.externalId">'+p.externalId+'</p>',
      '<p data-field="project.location">'+esc(p.location)+'</p>',
      '<p data-field="project.city">'+esc(p.city)+'</p>',
      '<p data-field="project.offer.price" data-currency="RUB">'+p.price+'</p>',
      '</article>'
    ].join('\n');
    await writeFile(join(dir,'projects',p.slug+'.html'),html(p.name,content),'utf8');
  }
  // The target must be real public HTTPS DNS; robots are never bypassed.
  await writeFile(join(dir,'robots.txt'),'User-agent: *\nAllow: /projects/\n','utf8');
  await writeFile(join(dir,'index.html'),html('R-6 технический источник','<h1>Синтетические тестовые данные</h1><a href="projects/index.html">Каталог</a>'),'utf8');
  // Published stage proof is deliberately distinct from unchanged item bytes.
  // Stages 01 and 02 must return identical /projects/* pages, not identical
  // stage metadata. A client can verify the deployed stage before each crawl.
  await writeFile(join(dir, 'stage.txt'), stage + '\n', 'utf8');
  const publicFiles = [
    'robots.txt', 'index.html', 'projects/index.html',
    ...visible.map((p) => 'projects/' + p.slug + '.html'),
  ];
  const sha256 = {};
  for (const file of publicFiles) {
    const bytes = await readFile(join(dir, file));
    sha256['/' + file] = createHash('sha256').update(bytes).digest('hex');
  }
  const manifest = {
    schema: 'resortos-r6-controlled-source-v1',
    stage,
    controlledSyntheticSource: true,
    pageCount: visible.length,
    pages: visible.map((p) => ({
      externalId: p.externalId,
      relativeUrl: '/projects/' + p.slug + '.html',
      name: p.name,
      city: p.city,
      price: p.price,
      currency: 'RUB',
    })),
    missingRelativePaths: s >= 3 ? ['/projects/offer.html'] : [],
    sha256,
  };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

}
