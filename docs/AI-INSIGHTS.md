# AI insights

## Ambito

Domande singole contestuali sugli ultimi due snapshot in `/app/insights`.
Calcoli deterministici nel browser; il modello spiega solo aggregati e limiti.
Nessuna memoria conversazionale, accesso Meta, azione automatica o valutazione
delle persone. Risposte non garantite: verificare sempre i conteggi.

La demo `/demo/insights` mostra un esempio deterministico, non una risposta AI.
Il percorso `/local/insights` non contatta endpoint AI, anche con Auth configurato.
Non servono account o servizi cloud per importazione e analisi locali.

## Configurazione

1. Configurare Supabase Auth con i valori pubblici `NG_APP_SUPABASE_URL` e
   `NG_APP_SUPABASE_ANON_KEY`; assegnare `app_metadata.role=owner` lato admin.
   Non usare `user_metadata` per autorizzare. Non aggiungere service-role key.
2. Sul progetto Vercel personale impostare `OPENAI_API_KEY` e
   `INSTASCOPE_AI_MODEL` (un modello disponibile che supporti Chat Completions
   e `max_completion_tokens`). Entrambe sono variabili server, mai `NG_APP_*`.
3. Configurare limiti di spesa/quote sul progetto OpenAI e verificare termini,
   conservazione, trasferimenti e accordi privacy. Solo dopo, ridistribuire.
4. Accedere come owner, aprire `/app/insights`, controllare il payload, scrivere
   una domanda senza dati personali e dare consenso per ogni invio.

Senza una configurazione completa l'AI resta disabilitata. `pnpm start` e il
server statico non eseguono funzioni Vercel: per provare il cloud usare una
preview Vercel autorizzata o Vercel CLI con `vercel dev`. Le chiavi reali devono
essere inserite direttamente dall'operatore, mai in chat, fixture o repository.

## Contratto e protezioni

`GET /api/insights` restituisce solo `{ enabled: boolean }`.
`POST /api/insights` richiede JSON e bearer token verificato con Supabase
`/auth/v1/user`. Solo `app_metadata.role=owner` e autorizzato sul server.
Corpo: `consent: true`, `language: it|en`, `question` (1-600 caratteri), `summary`.

Il riepilogo ammette esclusivamente `currentDate`, `previousDate`, `followers`,
`following`, `pendingRequests`, `newFollowers`, `lostFollowers`, `nonReciprocal`.
I conteggi assenti sono `null`, non zero. Le date sono date snapshot/import,
non osservazioni continue. Nessun username, hash, URL, file o ID snapshot.
La domanda e testo libero: il suo contenuto viene trasmesso come scritto.

Payload massimo 4096 byte; massimo 700 token di completamento; timeout Auth
10 secondi e provider 25 secondi. Nessun log del payload, nessuna persistenza
applicativa, risposte HTTP `no-store`, provider `store: false`. Quest'ultimo
parametro non equivale a zero retention presso OpenAI o l'hosting.

Limiti per istanza: 5 richieste/minuto e 50/giorno, contando anche errori provider.
Non sono quote distribuite: cold start, restart e istanze multiple li azzerano
o moltiplicano. Non aprire l'endpoint a utenti generici senza una quota atomica
condivisa. Anche owner e sessioni possono essere compromessi: il limite di spesa
del provider e necessario. Aggregati client e consenso non sono attestazioni.

Prompt injection e allucinazioni restano possibili. Nessun tool viene esposto;
risposte renderizzate come testo, non HTML. Cambio snapshot o uscita dalla pagina
annullano la richiesta client e cancellano la risposta; un provider gia contattato
potrebbe comunque completare e fatturare la generazione.

## Verifica

- `corepack pnpm test`: suite Angular piu test Node dell'endpoint.
- `corepack pnpm run test:api`: contratto, owner, consenso, rate limit ed errori.
- `corepack pnpm test:e2e`: demo desktop/mobile e percorso locale senza traffico AI.
- `corepack pnpm lint`, `format:check`, `typecheck`, `build` e audit come in CI.

I test usano soltanto dati sintetici e provider simulati. Non certificano la
qualita di un modello reale, credenziali, quote, retention o configurazione live.
Prima dell'abilitazione: provare una domanda sintetica in preview come owner,
verificare rifiuto 401/403 senza owner, controllare costi e comportamento del modello.
