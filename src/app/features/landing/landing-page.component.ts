import { Component, Renderer2, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { getRuntimeConfig } from '../../core/config/runtime-config';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  template: `
    <section class="page hero">
      <p class="eyebrow">Analisi locale · privacy by design</p>
      <h1>Leggi i tuoi snapshot.<br />Non caricare i tuoi dati.</h1>
      <p class="lead">
        Esplora dashboard e confronti con dati dimostrativi interamente sintetici. Nessun account o
        file è necessario.
      </p>
      <div class="hero-actions">
        <a class="primary-button" routerLink="/demo">Esplora la demo sintetica</a>
        <a class="quiet-button" routerLink="/login">Area privata</a>
      </div>
      <p class="limit-note">
        La demo usa solo dati sintetici. Le pagine pubbliche non accettano export reali.
      </p>
    </section>

    <section class="page section-grid" aria-labelledby="problem-title">
      <div>
        <p class="eyebrow">Il problema</p>
        <h2 id="problem-title">Gli export sono difficili da leggere e confrontare.</h2>
        <p class="muted">
          JSON e snapshot separati non rendono immediati rapporti, richieste e variazioni.
        </p>
      </div>
      <article class="card">
        <p class="eyebrow">La soluzione</p>
        <h2>Un riepilogo verificabile, sul tuo dispositivo.</h2>
        <p>
          Import, anteprima e confronto esplicito tra snapshot; nessun accesso o automazione su
          Instagram.
        </p>
      </article>
    </section>

    <section class="page" aria-labelledby="privacy-title">
      <p class="eyebrow">Architettura privacy-first</p>
      <h2 id="privacy-title">Il browser elabora. IndexedDB conserva solo ciò che scegli.</h2>
      <div class="grid grid-3">
        <article class="card">
          <h3>Parsing locale</h3>
          <p>
            ZIP e JSON sono analizzati nel browser, con limiti di dimensione e controlli sugli
            archivi.
          </p>
        </article>
        <article class="card">
          <h3>Cifratura locale</h3>
          <p>
            Gli snapshot salvati sono cifrati con AES-GCM e una passphrase che non viene
            memorizzata.
          </p>
        </article>
        <article class="card">
          <h3>Nessuna profilazione</h3>
          <p>
            Niente scraping, deduzioni sensibili, analytics remoti o automazioni verso Instagram.
          </p>
        </article>
      </div>
    </section>

    <section class="page section-grid" aria-labelledby="features-title">
      <div>
        <p class="eyebrow">Funzionalità e limiti</p>
        <h2 id="features-title">Dati disponibili, limiti espliciti.</h2>
      </div>
      <ul class="feature-list">
        <li>Follower, following, richieste pendenti e differenze tra snapshot.</li>
        <li>Trend solo quando sono disponibili almeno due snapshot.</li>
        <li>Demografia, engagement, reach e performance dei post non vengono inferiti.</li>
        <li>Supabase Auth, quando configurato, è usato solo per la sessione d'accesso.</li>
      </ul>
    </section>

    <section class="page demo-preview" aria-labelledby="preview-title">
      <div>
        <p class="eyebrow">Anteprima · dati dimostrativi</p>
        <h2 id="preview-title">Valori sintetici, nessun account reale.</h2>
        <p class="muted">
          La demo completa mostra dashboard, relazioni, richieste e confronti temporali.
        </p>
        <a class="primary-button" routerLink="/demo">Apri InstaScope Demo</a>
      </div>
      <div class="preview-card" aria-label="Anteprima illustrativa con dati dimostrativi">
        <span>Dati dimostrativi</span>
        <strong>Snapshot</strong>
        <div class="preview-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <small>Grafico illustrativo, non relativo a un profilo reale.</small>
      </div>
    </section>

    <footer class="page footer-note">
      <p>La conformità finale dipende dalla configurazione e dall'utilizzo effettivo.</p>
      <a routerLink="/demo">Demo</a>
    </footer>
  `,
  styles: [
    `
      .hero {
        display: grid;
        align-content: center;
        min-height: 65vh;
        gap: 1.25rem;
      }
      h1 {
        max-width: 16ch;
        font-size: clamp(2.7rem, 8vw, 5.5rem);
        margin: 0;
      }
      h2 {
        font-size: clamp(1.7rem, 4vw, 2.6rem);
      }
      .lead {
        max-width: 46rem;
        font-size: clamp(1.1rem, 2.5vw, 1.3rem);
      }
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .limit-note,
      .footer-note {
        color: var(--color-muted);
      }
      .section-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 2rem;
        align-items: center;
      }
      .feature-list {
        display: grid;
        gap: 0.75rem;
      }
      .demo-preview {
        display: grid;
        grid-template-columns: 1fr minmax(16rem, 0.7fr);
        gap: 2rem;
        align-items: center;
      }
      .preview-card {
        display: grid;
        gap: 0.75rem;
        border: 1px solid var(--color-line);
        border-radius: var(--radius-card);
        background: var(--color-background-soft);
        padding: 1.25rem;
      }
      .preview-card span,
      .preview-card small {
        color: var(--color-muted);
      }
      .preview-card strong {
        font-size: 1.5rem;
      }
      .preview-bars {
        display: flex;
        height: 6rem;
        align-items: end;
        gap: 0.75rem;
        border-bottom: 1px solid var(--color-line);
      }
      .preview-bars i {
        flex: 1;
        height: 30%;
        border-radius: 0.25rem 0.25rem 0 0;
        background: var(--color-accent);
      }
      .preview-bars i:nth-child(2) {
        height: 55%;
      }
      .preview-bars i:nth-child(3) {
        height: 42%;
      }
      .preview-bars i:nth-child(4) {
        height: 78%;
      }
      .preview-bars i:nth-child(5) {
        height: 64%;
      }
      .footer-note {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        border-top: 1px solid var(--color-line);
      }
      @media (max-width: 760px) {
        .section-grid,
        .demo-preview {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LandingPageComponent {
  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);
    const renderer = inject(Renderer2);
    const document = inject<Document>(DOCUMENT);

    const pageTitle = 'InstaScope — analisi locale degli snapshot Instagram';
    const description =
      'Confronta snapshot Instagram nel browser, senza caricare gli archivi su server esterni.';
    title.setTitle(pageTitle);
    meta.updateTag({ name: 'description', content: description });
    meta.updateTag({ name: 'robots', content: 'index, follow' });
    meta.updateTag({ property: 'og:title', content: pageTitle });
    meta.updateTag({ property: 'og:description', content: description });
    meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'InstaScope',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      description,
    };
    const script = renderer.createElement('script') as HTMLScriptElement;
    renderer.setAttribute(script, 'type', 'application/ld+json');
    renderer.setAttribute(script, 'id', 'instascope-software-application');
    renderer.setProperty(script, 'textContent', JSON.stringify(schema));
    if (!document.getElementById('instascope-software-application')) {
      renderer.appendChild(document.head, script);
    }

    const siteUrl = getRuntimeConfig().siteUrl;
    if (siteUrl) {
      const canonical = renderer.createElement('link') as HTMLLinkElement;
      renderer.setAttribute(canonical, 'rel', 'canonical');
      renderer.setAttribute(canonical, 'href', `${siteUrl}/`);
      renderer.appendChild(document.head, canonical);
    }
  }
}
