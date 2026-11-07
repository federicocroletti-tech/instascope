import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteUrl = process.env.NG_APP_SITE_URL ?? '';
const supabaseUrl = process.env.NG_APP_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY ?? '';

function requireHttps(value, name) {
  if (!value || value.includes('.invalid')) {
    return '';
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} non è un URL valido.`);
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error(`${name} deve usare HTTPS.`);
  }
  return url.origin;
}

const config = {
  siteUrl: requireHttps(siteUrl, 'NG_APP_SITE_URL'),
  supabaseUrl: requireHttps(supabaseUrl, 'NG_APP_SUPABASE_URL'),
  supabaseAnonKey:
    supabaseUrl.includes('.invalid') || supabaseAnonKey.startsWith('PLACEHOLDER_')
      ? ''
      : supabaseAnonKey,
};

await writeFile(
  resolve('public/runtime-config.js'),
  `window.__INSTASCOPE_CONFIG__ = ${JSON.stringify(config)};\n`,
  { encoding: 'utf8', mode: 0o600 },
);
