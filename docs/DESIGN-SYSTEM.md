# Design system

## Principi

Il layout usa gli stessi token HEX solidi verificati in `../docs/IDENTITA-VISIVA-PROFESSIONALE.md`: navy `#0B1821`, verde `#58C6A2`, menta `#7EE4BE`, testo `#EDF6F8` e secondario `#CBD8D2`. La variante chiara deriva solo da colori già nel portfolio; ogni combinazione va verificata in contesto. Colori non sono l'unico indicatore.

Font attuali dichiarati dal sito: Plus Jakarta Sans per testo e Source Serif 4 per H1. I file sorgente sono nel portfolio, ma licenza/redistribuzione non risultano documentate: InstaScope non li copia e usa fallback di sistema finché la licenza non viene verificata.

## Componenti e stati

- Navigation: header e sidebar responsive, skip link, focus ring visibile.
- Actions: CTA verde con testo navy; le azioni secondarie hanno bordo e testo leggibili.
- Cards: superficie opaca navy/chiara e bordo ad alto contrasto; niente blur dipendente dal colore.
- Data: tabella semantica per i dati e tabella accessibile di supporto ai grafici.
- Feedback: empty state, alert di errore, stato di import e banner demo esplicito.
- Motion: transizioni ridotte con `prefers-reduced-motion`.
- Modalità: toggle chiaro/scuro con stessi token; contrasto da controllare per ogni componente prima della release.
- Icone e avatar: **NON DISPONIBILE / non inclusi**; non viene creato o copiato alcun logo/foto senza approvazione.

Storybook è rimandato perché il progetto è un prototipo isolato e i componenti condivisi sono pochi; documentazione componenti e stati in questo file è più sostenibile per la prima iterazione.

## Verifiche WCAG

I token opachi chiari su navy hanno contrasto WCAG ≥ 4,5:1 nelle combinazioni registrate nell'audit. Le tinte trasparenti, il chart e i componenti effettivi richiedono test browser/axe prima della pubblicazione. Target AA non dichiarato come raggiunto finché non è verificato.
