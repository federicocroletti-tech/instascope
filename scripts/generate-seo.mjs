import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const root = resolve('dist/instascope/browser');
const configuredUrl = process.env.NG_APP_SITE_URL ?? '';

if (!configuredUrl || configuredUrl.includes('.invalid')) {
  process.stdout.write('NG_APP_SITE_URL non configurato: canonical e sitemap non generati.\n');
  process.exit(0);
}

let site;
try {
  site = new URL(configuredUrl);
} catch {
  throw new Error('NG_APP_SITE_URL non è un URL valido.');
}
if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash) {
  throw new Error('NG_APP_SITE_URL deve essere un origin HTTPS senza path, query o fragment.');
}
const origin = site.origin;

for (const route of ['', 'demo']) {
  const file = resolve(root, route, 'index.html');
  let html = await readFile(file, 'utf8');
  const canonicalUrl = `${origin}/${route ? `${route}/` : ''}`;
  const canonical = `<link rel="canonical" href="${canonicalUrl}">`;
  if (/<link rel="canonical"[^>]*>/i.test(html)) {
    html = html.replace(/<link rel="canonical"[^>]*>/i, canonical);
  } else {
    html = html.replace('</head>', `  ${canonical}\n</head>`);
  }

  const ogUrl = `<meta property="og:url" content="${canonicalUrl}">`;
  if (/<meta property="og:url"[^>]*>/i.test(html)) {
    html = html.replace(/<meta property="og:url"[^>]*>/i, ogUrl);
  } else {
    html = html.replace('</head>', `  ${ogUrl}\n</head>`);
  }
  await writeFile(file, html, 'utf8');
}

const urls = ['', 'demo'].map(
  (route) => `  <url><loc>${origin}/${route ? `${route}/` : ''}</loc></url>`,
);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
await writeFile(resolve(root, 'sitemap.xml'), sitemap, 'utf8');

const robotsPath = resolve(root, 'robots.txt');
let robots = await readFile(robotsPath, 'utf8');
robots = robots.replace(/^Sitemap:.*(?:\r?\n)?/gim, '').trimEnd();
await writeFile(robotsPath, `${robots}\nSitemap: ${origin}/sitemap.xml\n`, 'utf8');
