# Flusso dei dati

| Fase                     | Dato                                    | Destinazione                       | Controllo                                                                                              |
| ------------------------ | --------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Scelta file              | File ZIP/JSON scelto dall'utente        | Browser locale                     | Nessun form HTTP; limite 50 MB; tipo rilevato dal contenuto oltre al nome.                             |
| Parsing                  | Record e timestamp presenti nell'export | Web Worker e memoria browser       | SHA-256 locale, preflight ZIP, limite entry/decompressione e timeout.                                  |
| Anteprima                | Conteggi, dataset e anomalie            | UI locale                          | Nessun salvataggio automatico; niente username nell'anteprima sintetica.                               |
| Solo memoria             | Snapshot scelto per l'import temporaneo | Signal/facade in RAM               | Perso alla chiusura/refresh; no request remota.                                                        |
| Persistenza facoltativa  | Payload snapshot completo               | IndexedDB sul browser corrente     | AES-GCM; salt/IV memorizzati insieme al ciphertext; passphrase/key non persistite.                     |
| Autenticazione opzionale | Email/password, token e metadati Auth   | Supabase Auth, solo se configurato | Sessione in `sessionStorage`; non invia i dati Instagram. Supabase e policy reali **NON DISPONIBILE**. |
| Hosting                  | HTML/JS/CSS richiesti al browser        | Vercel, solo dopo deployment       | Può ricevere IP/metadata tecnici e log provider; nessun upload di archivio nel flusso app.             |
| Analytics/error tracking | Nessun payload configurato              | Nessun servizio                    | Disattivato. Non aggiungerlo senza consenso e revisione.                                               |
| CSV                      | Dati selezionati dall'utente            | Download locale                    | Nessun upload; neutralizzazione celle formula.                                                         |

Non è presente un backend che riceva, indicizzi o salvi snapshot Instagram. I dati in IndexedDB restano soggetti al controllo del browser, del dispositivo e ai backup dell'utente.
