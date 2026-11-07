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

Account e provider Vercel/Supabase, policy di autorizzazione, processo incidenti operativo, gestione backup, verifica di tutti gli header live, audit dipendenze/CodeQL su CI, test di penetrazione e analisi GDPR/DPIA legale.
