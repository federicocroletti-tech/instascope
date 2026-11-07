# Sub-responsabili e servizi esterni

| Servizio                   | Funzione prevista                                | Dati Instagram                                                              | Stato                                                        |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Vercel                     | Hosting statico e richieste HTTP                 | Nessun file/record inviato dall'app; log tecnici del provider da verificare | Configurazione pronta, account/deploy **NON DISPONIBILE**    |
| Supabase Auth              | Login e sessione owner, solo dopo configurazione | Nessun file o dataset inviato                                               | Disabilitato; progetto/URL/chiave/policy **NON DISPONIBILE** |
| Analytics / error tracking | Nessuna funzione                                 | Nessuno                                                                     | Non configurati                                              |
| NPM packages               | Librerie incluse nel bundle                      | Non ricevono dati per il solo uso client                                    | Lockfile da controllare in CI                                |

Paese, accordi, retention log e termini applicabili vanno verificati direttamente nei contratti dei provider prima del deploy. Questo inventario non afferma che esista un rapporto attivo.
