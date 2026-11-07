# Deploy su Vercel

Il progetto è un repository autonomo; la root directory Vercel è `.`. `vercel.json` definisce già preset Angular, comando di build, output statico, rewrite delle route e security headers.

## Configurazione progetto

- Importa il repository GitHub `federicocroletti-tech/instascope`.
- Imposta la root directory su `.`.
- Usa Node.js 22.x, `pnpm install --frozen-lockfile`, `pnpm run build` e output `dist/instascope/browser`.
- Non servono variabili d'ambiente per la demo pubblica.
- Imposta `NG_APP_SITE_URL` solo con l'URL Vercel effettivamente assegnato. Senza questa variabile il build non inventa canonical o sitemap.

Non aggiungere chiavi Supabase finché URL, anon key e policy di autorizzazione server-side non sono verificati. Non inserire mai una service-role key nel bundle client o nel repository. La route guard client-side non sostituisce l'autorizzazione server-side.

## Verifica prima della pubblicazione

Controlla il deploy preview e i refresh su `/demo`, `/demo/relationships`, `/local/import`, `/app/dashboard` e `/login`, oltre a canonical/sitemap, `Content-Security-Policy`, `X-Robots-Tag`, referrer e MIME headers. La demo pubblica usa dati sintetici e non carica file; l'import locale accetta un file solo nel browser senza inviarlo ai server dell'app.
