# Cookie e storage lato client

Cookie di analytics, advertising o profilazione non sono configurati. L'app non carica analytics non essenziali per default.

IndexedDB contiene esclusivamente snapshot cifrati salvati volontariamente dall'utente. `localStorage` può contenere preferenze UI (ad esempio l'intervallo del grafico), non password o chiavi. Se Supabase Auth viene configurato, il client usa `sessionStorage` per la sessione, non cookie analytics.

Verificare cookie, local/session storage e richieste di terze parti con la configurazione effettiva del deploy prima di pubblicare. Questa nota tecnica non sostituisce una valutazione normativa o un banner di consenso quando richiesto.
