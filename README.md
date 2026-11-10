# InstaScope

Applicazione Angular local-first per esplorare export JSON/ZIP di Instagram. Il progetto è in sviluppo e pubblicato su [Vercel](https://instascope-theta.vercel.app); non è collegato a un account Instagram.

> **Privacy:** Progettato secondo principi di privacy by design e data minimization. La conformità finale dipende dalla configurazione e dall’utilizzo effettivo.

## Funzionalità presenti

- Landing e demo pubblica con dati sintetici dichiarati.
- Dashboard, confronti, relazioni, richieste pendenti, suggerimenti esplicabili e limiti delle metriche.
- Interfaccia disponibile in italiano e inglese, con date formattate per la lingua selezionata.
- Grafici e tabelle esportabili in CSV; l’export protegge le celle da formula injection.
- Parser JSON/ZIP locale in Web Worker, hash SHA-256, controlli su dimensione, numero entry, decompressione e path traversal.
- Anteprima con categorie presenti/assenti e record non validi; import in memoria oppure cifrato in
  IndexedDB con AES-GCM. Tre modalità (sostituisci, integra solo nuovi, unisci e aggiorna) operano
  sulla vista corrente; gli snapshot originali restano immutabili.
- Passphrase non persistita; eliminazione singolo snapshot e cancellazione totale.
- Percorso locale disponibile senza account in `/local/import`, con guida per scaricare l'export, confronto Unfollow tra snapshot storici in `/local/unfollow` e gestione/sblocco dei dati in `/local/privacy`; lo sblocco richiede la passphrase scelta per l'archivio cifrato.
- Guida pubblica bilingue `/guida-export` con passaggi Meta, file necessari e collegamenti alle sezioni; `/import` rimanda al percorso locale.
- Risultati locali senza account anche in `/local/pending-requests`, `/local/relationships`, `/local/recent`, `/local/recommendations` e `/local/insights`, usando gli stessi snapshot e controlli dei percorsi privati.
- Revisione manuale degli unfollower ancora seguiti: selezione singola/totale, link profilo e CSV dei selezionati. La selezione resta in memoria e si azzera cambiando gli snapshot confrontati; nessuna azione automatica su Instagram.
- Route area privata `/app` ancora chiuse senza Supabase configurato e ruolo owner verificato; le route locali e private sono `noindex`.

Non esegue scraping, non chiede credenziali Instagram, non contatta API Instagram e non invia export o record a Supabase, Vercel o analytics. La demo non carica file.

## Stack

Angular 22 standalone, TypeScript strict, Signals, Angular Router lazy, Angular Material, Tailwind CSS, Apache ECharts, JSZip, Dexie, Web Crypto API, Supabase Auth opzionale, Vitest/Angular test runner e Playwright.

Questo repository standalone è la sorgente del deploy Vercel. Il portfolio contiene anche una copia in `instascope/`: un merge nel portfolio non pubblica automaticamente questa applicazione. Usa pnpm 12.18.0 e un lockfile dedicato.

## Avvio locale

Prerequisiti: Node.js 22.22.3 o compatibile e Corepack disponibile.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm start
```

La demo e il percorso locale `/local` funzionano senza account o variabili d'ambiente. Il percorso locale analizza ZIP/JSON nel browser e salva gli snapshot in IndexedDB cifrati con la passphrase scelta dall'utente. Per testare le route riservate `/app`, configura un progetto Supabase e policy appropriate; non inserire credenziali reali nel repository. Copia `.env.example` in `.env`, sostituisci i placeholder solo con valori autorizzati e validi. `.env` è ignorato da Git. Senza configurazione Supabase, l'accesso privato resta negato.

La password d'accesso è scelta manualmente dall'utente di test nel sistema di autenticazione; il README non contiene password. La passphrase di cifratura è inserita manualmente e non viene salvata dal prodotto.

## Comandi

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm audit
corepack pnpm run build
```

La configurazione del parser e i dati sintetici sono in `src/app/core/import/` e `src/app/features/demo/demo-data.ts`. Non aggiungere ZIP o export Instagram reali a fixture, screenshot o repository.

## Stato delle verifiche

Verifiche locali dell'integrazione: lint, 36 test unitari e 17 test E2E Playwright passati; build di produzione completata con tre route prerenderizzate. I test browser coprono navigazione mobile, lingua e temi, guida export, download CSV dei selezionati, reset della revisione cambiando confronto, importazione, salvataggio/sblocco cifrato e accesso locale senza indebolire le route private.

L’ultimo `pnpm audit --audit-level high` non ha rilevato vulnerabilità note.

## Privacy e sicurezza

Leggi [Privacy](docs/PRIVACY.md), [Security](docs/SECURITY.md), [Data flow](docs/DATA-FLOW.md), [Threat model](docs/THREAT-MODEL.md), [retention](docs/DATA-RETENTION.md), [cookie policy](docs/COOKIE-POLICY.md) e [Vercel deployment](docs/VERCEL-DEPLOYMENT.md).

La route guard e il controllo `app_metadata.role` sono controlli client. **Non sono autorizzazione server-side.** Poiché l'archivio è locale, un utente che controlla il browser può ispezionare IndexedDB o il runtime: cifratura e passphrase limitano l'accesso casuale ai payload, non proteggono da un endpoint compromesso, XSS o accesso al dispositivo sbloccato. Non abilitare l'area privata in produzione senza verificare enforcement e configurazione.

## SEO e deploy

Landing, demo sintetica e guida export sono prerenderizzate e indicizzabili. `NG_APP_SITE_URL` deve essere confermato prima di generare canonical e sitemap; senza valore valido il build li omette invece di pubblicare URL inventati. Le route locali e riservate non entrano nella sitemap e hanno `noindex`/header configurati.

Vercel pubblica il branch `main` di `federicocroletti-tech/instascope`, con root directory del repository (`.`), non la cartella del portfolio. `vercel.json` configura build, rewrite di refresh e security headers, mantenendo gli hash CSP degli script inline Angular. Il dominio di produzione è https://instascope-theta.vercel.app. Per il rilascio e i controlli consulta [Vercel deployment](docs/VERCEL-DEPLOYMENT.md).

## Design e stato

Il design usa una palette cromatica ispirata ai colori di Instagram, mantenendo componenti, layout e interazioni originali e senza riprodurre widget o template Instagram. Non include avatar, logo, fotografia o dati del portfolio. I font locali non sono copiati perché la licenza d’uso non è stata trovata. Il design system e i limiti sono in [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md). Storybook è rimandato per mantenere lo scope sostenibile.

Stato: **In sviluppo**. Repository: https://github.com/federicocroletti-tech/instascope. Nessuna licenza del nuovo progetto è stata scelta.
