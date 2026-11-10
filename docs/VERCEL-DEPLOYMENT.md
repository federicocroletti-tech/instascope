# Deployment Vercel

## Sorgente di produzione

- Repository: https://github.com/federicocroletti-tech/instascope
- Branch di produzione: `main`.
- Progetto Vercel: `instascope`.
- URL: https://instascope-theta.vercel.app
- Root directory: `.` (repository standalone), non `instascope`.
- Preset Angular, Node 22.x, installazione `pnpm install --frozen-lockfile`,
  build `pnpm run build`, output `dist/instascope/browser`.

La copia in `federico-croletti-site/instascope` non alimenta questo deploy.
Per pubblicare modifiche sviluppate nel portfolio, portarle in questo repository
conservando workflow CI, lockfile, test di produzione e hash CSP.

## Rilascio

1. Aprire una PR verso `main` e verificare test unitari, lint, formattazione,
   build e test browser sul bundle di produzione.
2. Controllare che la preview Vercel sia pronta e che gli script Angular non
   siano bloccati dalla Content-Security-Policy. Non abilitare `unsafe-inline`
   per gli script; aggiornare solo gli hash esatti se il build li modifica.
3. Dopo il merge, attendere lo stato Vercel `success` sul commit di `main`.
4. Verificare sul dominio di produzione homepage, guida export, refresh su
   `/local/import`, import di un archivio sintetico, risultati e confronto
   follower. `/import` deve aprire il percorso locale; `/app` deve ancora
   richiedere l'accesso.
5. Controllare `X-Robots-Tag: noindex, nofollow, noarchive` e
   `Cache-Control: no-store` sui percorsi locali. Gli archivi devono restare
   nel browser, senza richieste a servizi esterni.

Non ripristinare i precedenti redirect da `/local` alla homepage: impedirebbero
l'accesso al flusso senza account.

Per ripetere i test sul deploy, senza avviare un server locale:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://instascope-theta.vercel.app'
corepack pnpm test:e2e --workers=2
Remove-Item Env:\PLAYWRIGHT_BASE_URL
```

Le fixture sono sintetiche; il salvataggio dei test usa soltanto il browser
temporaneo di Playwright. Il test sugli hash CSP verifica anche il bundle locale
di produzione: eseguire prima `corepack pnpm run build`.

## Configurazione

`NG_APP_SITE_URL` deve usare il dominio autorizzato sopra; senza valore il build
omette canonical e sitemap. Non aggiungere domini o credenziali placeholder.
Supabase rimane opzionale per l'area privata e non riceve gli archivi.
Non inserire service-role key nelle variabili client o nel repository.
`NG_APP_SUPABASE_ANON_KEY` è pubblica per definizione: l'accesso privato richiede
comunque policy server-side appropriate, non soltanto controlli UI.
