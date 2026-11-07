# Conservazione e cancellazione

- Import preview: in memoria finché la pagina/sessione la conserva; nessun salvataggio automatico.
- Import solo in memoria: non persistito intenzionalmente; si perde chiudendo o ricaricando la pagina.
- Snapshot persistenti: solo su azione esplicita, in IndexedDB, con contenuto cifrato e ciphertext versionato.
- Passphrase e chiave derivata: solo memoria durante la sessione sbloccata; nessun salvataggio in `localStorage` o IndexedDB.
- Sessione Supabase: `sessionStorage`, se Auth è configurato; invalidata al logout o alla fine della sessione browser.
- Preferenze non sensibili: intervallo grafico e tema possono restare in `localStorage`.
- CSV: download sotto il controllo dell'utente; l'app non può cancellare copie scaricate o backup.
- Retention automatica: non implementata; periodo di scadenza **NON DISPONIBILE**. L'utente può eliminare uno snapshot o l'intero archivio locale.

La cancellazione si limita al browser/origin corrente. Non equivale alla cancellazione sicura di supporti fisici e non include file originali in Download, backup del profilo o altri dispositivi.
