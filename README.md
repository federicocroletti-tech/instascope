# InstaScope

Applicazione Angular local-first per esplorare export JSON/ZIP di Instagram. Questo repository contiene l'app InstaScope in modo autonomo; non è collegata a un account Instagram né invia gli archivi ai nostri server.

[Repository GitHub](https://github.com/federicocroletti-tech/instascope)
[Demo online](https://instascope-theta.vercel.app)

> **Privacy:** Progettato secondo principi di privacy by design e data minimization. La conformità finale dipende dalla configurazione e dall'utilizzo effettivo.

## Funzionalità presenti

- Landing e demo pubblica con dati sintetici dichiarati.
- Dashboard, confronti, relazioni, richieste pendenti, suggerimenti esplicabili e limiti delle metriche.
- Parser JSON/ZIP locale in Web Worker, hash SHA-256, controlli su dimensione, numero entry, decompressione e path traversal.
- Preview prima del salvataggio; import in memoria oppure snapshot cifrato in IndexedDB con AES-GCM.
- Passphrase non persistita; eliminazione singolo snapshot e cancellazione totale.
- Route area privata chiuse senza Supabase configurato e ruolo owner verificato; le route private sono client-side e `noindex`.

Non esegue scraping, non chiede credenziali Instagram, non contatta API Instagram e non invia export o record a Supabase, Vercel o analytics. La demo non carica file.

## Stack

Angular 22 standalone, TypeScript strict, Signals, Angular Router lazy, Angular Material, Tailwind CSS, Apache ECharts, JSZip, Dexie, Web Crypto API, Supabase Auth opzionale, Vitest/Angular test runner e Playwright.

Il progetto è mantenuto e distribuito separatamente dal sito portfolio. Usa pnpm 12.18.0 e il proprio lockfile.

## Avvio locale

Prerequisiti: Node.js 22.22.3 o compatibile e Corepack disponibile.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm start
```

La demo funziona senza account o variabili d'ambiente. Per testare la route privata, configura un progetto Supabase e policy appropriate; non inserire credenziali reali nel repository. Copia `.env.example` in `.env`, sostituisci i placeholder solo con valori autorizzati e validi. `.env` è ignorato da Git. Senza configurazione Supabase, l'accesso privato resta negato.

La password d'accesso è scelta manualmente dall'utente di test nel sistema di autenticazione; il README non contiene password. La passphrase di cifratura è inserita manualmente e non viene salvata dal prodotto.

## Comandi

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm audit
corepack pnpm run build
corepack pnpm run screenshots:demo
```

La configurazione del parser e i dati sintetici sono in `src/app/core/import/` e `src/app/features/demo/demo-data.ts`. Non aggiungere ZIP o export Instagram reali a fixture, screenshot o repository.

## Stato delle verifiche

La suite locale ha superato 17 test unitari, 5 test Playwright E2E, scansioni axe sulle 11 route pubbliche/demo, lint, formattazione, type-check, build di produzione e audit dipendenze con soglia MEDIUM. Il workflow autonomo esegue questi controlli, Gitleaks e CodeQL per ogni push e pull request.

Le anteprime sintetiche desktop, tablet e mobile sono disponibili in `public/assets/previews/`; rigenerale con `corepack pnpm run screenshots:demo`. Non usare export Instagram o dati reali in fixture, screenshot o repository.

## Privacy e sicurezza

Leggi [Privacy](docs/PRIVACY.md), [Security](docs/SECURITY.md), [Data flow](docs/DATA-FLOW.md), [Threat model](docs/THREAT-MODEL.md), [retention](docs/DATA-RETENTION.md), [cookie policy](docs/COOKIE-POLICY.md) e [Vercel deployment](docs/VERCEL-DEPLOYMENT.md).

La route guard e il controllo `app_metadata.role` sono controlli client. **Non sono autorizzazione server-side.** Poiché l'archivio è locale, un utente che controlla il browser può ispezionare IndexedDB o il runtime: cifratura e passphrase limitano l'accesso casuale ai payload, non proteggono da un endpoint compromesso, XSS o accesso al dispositivo sbloccato. Non abilitare l'area privata in produzione senza verificare enforcement e configurazione.

## SEO e deploy

Le sole route previste per prerendering e indicizzazione sono landing e demo sintetica. `NG_APP_SITE_URL` deve essere impostato con l'URL Vercel effettivamente assegnato prima di generare canonical e sitemap; senza valore valido il build li omette invece di pubblicare URL inventati. Le route private non entrano nella sitemap e hanno `noindex`/header configurati.

`vercel.json` configura la build, i rewrite per il refresh delle route e gli header di sicurezza. Per il deploy Vercel, collega questo repository come progetto autonomo con root directory `.`; consulta [Vercel deployment](docs/VERCEL-DEPLOYMENT.md). Non configurare Supabase né variabili d'ambiente non necessarie: la demo pubblica usa dati sintetici e non richiede account.

## Design e stato

Il design riusa i token cromatici verificati del sito personale; non include avatar, logo, fotografia o dati del portfolio. I font locali non sono copiati perché la licenza d'uso non è stata trovata. Il design system e i limiti sono in [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md). Storybook è rimandato per mantenere lo scope sostenibile.

Stato: **progetto autonomo**. Le route private restano disabilitate senza configurazione Supabase e autorizzazione server-side verificata.
