# Informativa privacy — InstaScope

**Stato:** bozza tecnica, da completare con titolare, contatti, dominio e verifica legale prima della pubblicazione.

> Progettato secondo principi di privacy by design e data minimization. La conformità finale dipende dalla configurazione e dall’utilizzo effettivo.

## Cosa tratta l'applicazione

L'utente può selezionare un proprio archivio Instagram ZIP o JSON. L'app lo analizza nel browser e può mostrare username, link e timestamp che sono già presenti nell'export. L'app non effettua scraping, non chiede password Instagram, non inferisce attributi sensibili e non accede all'account Instagram.

Il percorso locale di importazione e confronto non richiede un account. Il parsing e l'anteprima avvengono in memoria nel browser. Su scelta esplicita, i payload snapshot vengono cifrati con AES-GCM e salvati in IndexedDB del browser. La passphrase non viene persistita; la chiave derivata è usata nella sessione in memoria. L'importazione può restare solo in memoria.

Dopo la chiusura o il ricaricamento della pagina, l'utente deve sbloccare gli snapshot salvati dal Centro privacy locale usando la stessa passphrase. Non esiste un recupero della passphrase.

## Servizi esterni

- **Supabase Auth:** non configurato. Se configurato, riceve solo i dati necessari all'autenticazione e alla sessione; gli archivi Instagram e i payload snapshot non vengono inviati.
- **Vercel:** deployment non verificato. L'hosting statico riceve richieste HTTP e può generare log tecnici secondo la configurazione del provider; i file selezionati dal browser non sono inclusi nelle richieste dell'app.
- **Analytics, error tracking, advertising:** non configurati.
- **OpenAI, solo AI privata opzionale:** dopo consenso per ogni richiesta, la funzione Vercel riceve domanda, conteggi e date degli ultimi due snapshot e li invia a OpenAI. Non vengono aggiunti archivi, username, URL profilo, hash o identificativi snapshot. Il testo libero puo contenere dati personali se inseriti dall'utente: non inserirli. Supabase verifica solo la sessione e il ruolo owner. La demo e `/local` non contattano l'AI. L'app non persiste domande o risposte e usa `Cache-Control: no-store`; `store: false` non garantisce assenza di conservazione da parte del provider. Verificare condizioni, conservazione, trasferimenti e accordi del provider prima dell'attivazione. Dettagli in [AI-INSIGHTS.md](AI-INSIGHTS.md).

## Conservazione e diritti

La cancellazione in-app rimuove snapshot e metadati IndexedDB dal browser corrente. Non rimuove esportazioni scaricate, backup del browser, copie in altri dispositivi o file sorgente. Non è impostata una scadenza automatica: vedere [DATA-RETENTION.md](DATA-RETENTION.md).

Titolare, basi giuridiche, contatti, tempi di risposta e canale per le richieste privacy: **NON DISPONIBILE**. Non pubblicare questa bozza come informativa completa finché tali dati non sono confermati.

## Cookie e storage

Cookie analytics non essenziali non sono attivati. Le preferenze di interfaccia possono essere conservate localmente. La sessione Auth usa `sessionStorage` quando Supabase è configurato. Dettagli e limiti in [COOKIE-POLICY.md](COOKIE-POLICY.md).
