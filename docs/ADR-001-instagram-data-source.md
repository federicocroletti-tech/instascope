# ADR-001: fonte dei dati Instagram

- **Stato:** accettata per il refactoring di InstaScope
- **Data:** 2026-11-07

## Contesto

InstaScope confronta liste personali di follower, following e richieste in sospeso
ottenute dalle esportazioni dei dati richieste dall'utente a Instagram/Meta. Queste
liste complete e i relativi cambiamenti nel tempo non sono garantiti dalle API
ufficiali disponibili all'applicazione.

## Decisione

L'esportazione ufficiale fornita dall'utente rimane la fonte principale per queste
analisi. L'elaborazione avviene localmente nel browser; l'utente può scegliere se
conservare uno snapshot cifrato nel proprio IndexedDB. Nessuna password Instagram
è richiesta.

Non si implementano scraping, automazione del browser contro Instagram, endpoint
privati, reverse engineering, cookie o sessioni Instagram, né servizi che imitano
l'app Instagram. Non si presume che un'API fornisca follower completi, unfollow,
following personali o richieste inviate in sospeso.

Le API ufficiali possono supportare funzionalità definite dalla piattaforma per
account idonei, ad esempio insights e metriche dei media, gestione di contenuti,
commenti o messaggi, secondo prodotto, autorizzazioni e approvazioni applicabili.
Queste capacità non sostituiscono le esportazioni per le analisi sopra descritte
e non sono implementate da questa decisione.

## Conseguenze

- I risultati descrivono ciò che è presente negli snapshot importati, non dati in
  tempo reale.
- L'assenza di un account da uno snapshot successivo indica soltanto che non è più
  presente tra i follower nell'ultimo snapshot. Può dipendere anche da cambio di
  username, disattivazione, eliminazione, sospensione o incompletezza dell'export.
- Il parser deve tollerare varianti riconosciute nella struttura dell'export,
  dichiarare le categorie mancanti e non modificare gli snapshot originali.
- L'app non deve inviare gli archivi o i record importati a servizi esterni.

## Prerequisiti per un'eventuale integrazione futura

Una futura integrazione dovrà essere un progetto separato e opt-in, limitato a
funzioni documentate e supportate ufficialmente al momento dell'implementazione.
Prima di abilitarla occorrerà verificare:

1. idoneità dell'account e disponibilità del prodotto API per il caso d'uso;
2. permessi, revisione dell'app e condizioni Meta applicabili;
3. OAuth e gestione sicura di token, revoca e scadenza;
4. finalità, minimizzazione, informativa, conservazione e cancellazione dei dati;
5. confini server/client e autorizzazione effettiva, se sono introdotti servizi
   remoti;
6. una feature flag disattivata per impostazione predefinita e test senza dati
   personali reali.

Non si deve attivare un'integrazione solo per ottenere liste personali o stati che
le API ufficiali non espongono.
