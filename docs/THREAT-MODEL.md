# Threat model

## Asset e attori

Asset: file export, username/relazioni/timestamp, passphrase in memoria, ciphertext IndexedDB, credenziali Auth. Attori: utente legittimo, visitatore demo, script ostile/file malevolo, estensione browser, dispositivo condiviso, provider hosting/auth.

## Minacce e mitigazioni

| Minaccia                             | Controllo                                                                                                       | Rischio residuo                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ZIP bomb / esaurimento memoria       | Preflight central directory, limiti su dimensione/entry/ratio/totale, worker e timeout                          | ZIP non standard rifiutati; memory pressure browser non azzerabile completamente.            |
| Path traversal                       | Normalizzazione e rifiuto di path assoluti, `..` e caratteri di controllo prima di leggere entry                | Dipende dalla correttezza della libreria ZIP e del preflight.                                |
| JSON malevolo o XSS tramite username | JSON trattato come dati; rendering Angular interpolato, mai HTML dinamico; link limitati a host Instagram HTTPS | Estensioni/browser compromessi restano fuori dal modello.                                    |
| Persistenza duplicata accidentale    | SHA-256 client-side, confronto in archivio sbloccato, conferma esplicita duplicato                              | L'utente può scegliere esplicitamente di duplicare.                                          |
| Furto del database locale            | AES-GCM, derivazione PBKDF2, passphrase non persistita                                                          | Passphrase debole, endpoint/browser compromesso o sessione sbloccata possono esporre i dati. |
| Utente non owner                     | Guard, `getUser()` e ruolo app metadata; noindex/header                                                         | **Non è enforcement server-side**. Senza backend RLS verificato, l'area è disabilitata.      |
| Esfiltrazione via telemetria         | Nessun analytics/error tracking; nessuna richiesta file                                                         | Log HTTP provider contengono metadati di rete ordinari.                                      |
| Secret leak                          | `.env` ignorato, `.env.example` fittizio, runtime-config generata e ignorata; CodeQL/secrets CI                 | CI non è ancora eseguita su GitHub e la storia remota non è verificata.                      |
| Clickjacking/MIME/referrer/permessi  | Header predisposti in `vercel.json`                                                                             | Header effettivi non verificati senza deploy.                                                |

## Fuori ambito / da verificare

## AI opzionale

L'endpoint `/api/insights` verifica il bearer token con Supabase Auth e il ruolo in `app_metadata` sul server, indipendentemente dal guard client. Sono ammessi solo conteggi, date, lingua, consenso e domanda (600 caratteri); payload massimo 4096 byte. Timeout, limite token e risposte di errore sanificate riducono abusi e leak. Le risposte sono interpolate come testo, mai HTML. Nessun tool, SQL o azione Instagram viene esposto al modello.

Rischi residui: prompt injection e allucinazioni non sono eliminati; gli aggregati client non sono attestati; il testo libero puo contenere dati personali; i limiti di 5 richieste/minuto e 50/giorno sono per istanza e si azzerano con il processo. Non sono un tetto globale di spesa: configurare budget/quote del provider prima di abilitare l'AI. Per un'apertura multiutente occorrono quota atomica condivisa e revisione privacy. Vedere [AI-INSIGHTS.md](AI-INSIGHTS.md).

## Verifiche operative pendenti

Account e provider Vercel/Supabase, policy di autorizzazione, processo incidenti operativo, gestione backup, verifica di tutti gli header live, audit dipendenze/CodeQL su CI, test di penetrazione e analisi GDPR/DPIA legale.
