# Sicurezza — InstaScope

## Confini e dati

- L'archivio ZIP/JSON non deve essere inviato via HTTP, analytics, telemetria, logging o error tracking.
- Parser nel Web Worker; controlli central-directory prima della decompressione; 50 MB per file, massimo 2.000 entry, 150 MB decompressione totale, massimo 100:1, JSON entry limitata e timeout di 20 secondi.
- Path assoluti, traversal, ZIP64/multi-volume, cifratura ZIP e metodi di compressione non supportati sono rifiutati.
- Snapshot in IndexedDB cifrati con AES-GCM 256, IV random da Web Crypto e chiave derivata con PBKDF2/SHA-256 da passphrase e salt random. La passphrase non è salvata; verificare il costo KDF su dispositivi lenti prima del rilascio.
- Nessun log del contenuto importato; gli errori mostrati non includono record o username.
- CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options e `frame-ancestors` sono predisposti in `vercel.json`; la risposta del deploy non è stata verificata.

## Autenticazione e autorizzazione

Supabase Auth è opzionale e disabilitato finché URL e chiave pubblica non sono configurati tramite variabili d'ambiente. Guard client-side richiede che `getUser()` confermi il ruolo `app_metadata.role === "owner"`. Questo non fornisce enforcement del server sui contenuti locali. La route privata resta bloccata senza configurazione e la presenza di un ruolo nel browser non è un confine sufficiente contro manipolazione del client.

Non salvare service-role key, password, chiavi di cifratura o dati Instagram in Git, `localStorage`, URL, log o bundle. La chiave anonima Supabase, se mai configurata, è un identificatore client pubblico, non una chiave server; non abilita da sola una policy owner.

## Residui

- XSS/browser extension/accesso al profilo browser possono leggere dati mostrati o in memoria.
- Un dispositivo sbloccato o un archivio esportato fuori dal browser non è protetto dall'app.
- IndexedDB può essere rimosso dal browser o incluso in backup non controllati.
- La configurazione CSP deve essere testata con ogni feature e autentica URL Supabase.
- Nessun penetration test, deploy, verifica di header reali o revisione legale è stata eseguita.

## Audit dipendenze

Verifica locale del 2026-11-07: `pnpm audit --audit-level high` termina con successo, ma l'audit completo segnala un advisory MEDIUM per `minimatch` 10.2.6, dipendenza transitiva di ESLint (range vulnerabile `>=7.0.0 <11.0.1`, versione corretta indicata `>=11.0.1`). È una dipendenza di sviluppo e non compare nel bundle di produzione; rivalutare e aggiornare la catena prima del rilascio, senza interpretare il passaggio della soglia HIGH come audit privo di rilievi.

Segnalazioni security: contatto dedicato **NON DISPONIBILE**. Procedura in [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md).
