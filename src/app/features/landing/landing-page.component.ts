import { Component, Renderer2, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { getRuntimeConfig } from '../../core/config/runtime-config';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  template: `
    <section class="page hero">
      <p class="eyebrow">
        {{
          locale.text('Analisi locale · privacy by design', 'Local analysis · privacy by design')
        }}
      </p>
      <h1>
        {{ locale.text('Leggi i tuoi snapshot.', 'Read your snapshots.') }}<br />{{
          locale.text('Non caricare i tuoi dati.', 'Keep your data off uploads.')
        }}
      </h1>
      <p class="lead">
        {{
          locale.text(
            'InstaScope confronta archivi Instagram direttamente nel browser. I file non vengono inviati a server esterni.',
            'InstaScope compares Instagram archives directly in your browser. Files are never sent to external servers.'
          )
        }}
      </p>
      <div class="hero-actions">
        <a class="primary-button" routerLink="/local/import">{{
          locale.text('Inizia senza account', 'Get started without an account')
        }}</a>
        <a class="quiet-button" routerLink="/demo">{{
          locale.text('Esplora la demo sintetica', 'Explore the sample demo')
        }}</a>
        <a class="text-link" routerLink="/login">{{
          locale.text('Area privata', 'Private workspace')
        }}</a>
      </div>
      <p class="limit-note">
        {{
          locale.text(
            'Niente login: importa due archivi in date diverse per confrontare i follower. I dati restano nel browser.',
            'No sign-in: import two archives from different dates to compare followers. Data stays in your browser.'
          )
        }}
      </p>
    </section>

    <section class="page section-grid" aria-labelledby="problem-title">
      <div>
        <p class="eyebrow">{{ locale.text('Il problema', 'The problem') }}</p>
        <h2 id="problem-title">
          {{
            locale.text(
              'Gli export sono difficili da leggere e confrontare.',
              'Exports are hard to read and compare.'
            )
          }}
        </h2>
        <p class="muted">
          {{
            locale.text(
              'JSON e snapshot separati non rendono immediati rapporti, richieste e variazioni.',
              'Separate JSON files and snapshots make ratios, requests, and changes hard to understand.'
            )
          }}
        </p>
      </div>
      <article class="card">
        <p class="eyebrow">{{ locale.text('La soluzione', 'The solution') }}</p>
        <h2>
          {{
            locale.text(
              'Un riepilogo verificabile, sul tuo dispositivo.',
              'A verifiable summary, on your device.'
            )
          }}
        </h2>
        <p>
          {{
            locale.text(
              'Importazione, anteprima e confronto esplicito tra snapshot; nessun accesso o automazione su Instagram.',
              'Import, preview, and explicit snapshot comparisons; no access or automation on Instagram.'
            )
          }}
        </p>
      </article>
    </section>

    <section class="page" aria-labelledby="privacy-title">
      <p class="eyebrow">
        {{ locale.text('Architettura privacy-first', 'Privacy-first architecture') }}
      </p>
      <h2 id="privacy-title">
        {{
          locale.text(
            'Il browser elabora. IndexedDB conserva solo ciò che scegli.',
            'Your browser processes data. IndexedDB stores only what you choose.'
          )
        }}
      </h2>
      <div class="grid grid-3">
        <article class="card">
          <h3>{{ locale.text('Analisi locale', 'Local parsing') }}</h3>
          <p>
            {{
              locale.text(
                'ZIP e JSON sono analizzati nel browser, con limiti di dimensione e controlli sugli archivi.',
                'ZIP and JSON archives are parsed in your browser with size limits and safety checks.'
              )
            }}
          </p>
        </article>
        <article class="card">
          <h3>{{ locale.text('Cifratura locale', 'Local encryption') }}</h3>
          <p>
            {{
              locale.text(
                'Gli snapshot salvati sono cifrati con AES-GCM e una passphrase che non viene memorizzata.',
                'Saved snapshots are encrypted with AES-GCM and a passphrase that is never stored.'
              )
            }}
          </p>
        </article>
        <article class="card">
          <h3>{{ locale.text('Nessuna profilazione', 'No profiling') }}</h3>
          <p>
            {{
              locale.text(
                'Niente scraping, deduzioni sensibili, analytics remoti o automazioni verso Instagram.',
                'No scraping, sensitive inferences, remote analytics, or Instagram automation.'
              )
            }}
          </p>
        </article>
      </div>
    </section>

    <section class="page section-grid" aria-labelledby="features-title">
      <div>
        <p class="eyebrow">{{ locale.text('Funzionalità e limiti', 'Features and limits') }}</p>
        <h2 id="features-title">
          {{
            locale.text('Dati disponibili, limiti espliciti.', 'Available data, explicit limits.')
          }}
        </h2>
      </div>
      <ul class="feature-list">
        <li>
          {{
            locale.text(
              'Follower, following, richieste pendenti e differenze tra snapshot.',
              'Followers, following, pending requests, and snapshot differences.'
            )
          }}
        </li>
        <li>
          {{
            locale.text(
              'Trend solo quando sono disponibili almeno due snapshot.',
              'Trends are shown only when at least two snapshots are available.'
            )
          }}
        </li>
        <li>
          {{
            locale.text(
              'Demografia, engagement, reach e performance dei post non vengono inferiti.',
              'Demographics, engagement, reach, and post performance are not inferred.'
            )
          }}
        </li>
        <li>
          {{
            locale.text(
              'Supabase Auth, quando configurato, è usato solo per la sessione d’accesso.',
              'When configured, Supabase Auth is used only for sign-in sessions.'
            )
          }}
        </li>
      </ul>
    </section>

    <section class="page demo-preview" aria-labelledby="preview-title">
      <div>
        <p class="eyebrow">
          {{ locale.text('Anteprima · dati dimostrativi', 'Preview · sample data') }}
        </p>
        <h2 id="preview-title">
          {{
            locale.text(
              'Valori sintetici, nessun account reale.',
              'Sample values, no real accounts.'
            )
          }}
        </h2>
        <p class="muted">
          {{
            locale.text(
              'La demo completa mostra dashboard, relazioni, richieste e confronti temporali.',
              'The full demo includes dashboard, relationships, requests, and historical comparisons.'
            )
          }}
        </p>
        <a class="primary-button" routerLink="/demo">{{
          locale.text('Apri InstaScope Demo', 'Open InstaScope demo')
        }}</a>
      </div>
      <div
        class="preview-card"
        [attr.aria-label]="
          locale.text(
            'Anteprima illustrativa con dati dimostrativi',
            'Illustrative preview with sample data'
          )
        "
      >
        <span>{{ locale.text('Dati dimostrativi', 'Sample data') }}</span>
        <strong>Snapshot</strong>
        <div class="preview-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <small>{{
          locale.text(
            'Grafico illustrativo, non relativo a un profilo reale.',
            'Illustrative chart, not based on a real profile.'
          )
        }}</small>
      </div>
    </section>

    <footer class="page footer-note">
      <p>
        {{
          locale.text(
            'La conformità finale dipende dalla configurazione e dall’utilizzo effettivo.',
            'Final compliance depends on actual configuration and use.'
          )
        }}
      </p>
      <a routerLink="/demo">{{ locale.text('Demo', 'Demo') }}</a>
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
        align-items: center;
        gap: 0.75rem;
      }
      .text-link {
        color: var(--color-muted);
        font-size: 0.9rem;
        text-underline-offset: 0.2em;
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
  readonly locale = inject(LocaleService);

  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);
    const renderer = inject(Renderer2);
    const document = inject<Document>(DOCUMENT);
    let schemaScript: HTMLScriptElement | null = null;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'InstaScope',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      description: this.locale.text(
        'Confronta snapshot Instagram nel browser, senza caricare gli archivi su server esterni.',
        'Compare Instagram snapshots in your browser without uploading archives to external servers.',
      ),
    };

    effect(() => {
      const pageTitle = this.locale.text(
        'InstaScope — analisi locale degli snapshot Instagram',
        'InstaScope — local Instagram snapshot analysis',
      );
      const description = this.locale.text(
        'Confronta snapshot Instagram nel browser, senza caricare gli archivi su server esterni.',
        'Compare Instagram snapshots in your browser without uploading archives to external servers.',
      );
      title.setTitle(pageTitle);
      meta.updateTag({ name: 'description', content: description });
      meta.updateTag({ property: 'og:title', content: pageTitle });
      meta.updateTag({ property: 'og:description', content: description });
      if (schemaScript) {
        renderer.setProperty(
          schemaScript,
          'textContent',
          JSON.stringify({ ...schema, description }),
        );
      }
    });
    meta.updateTag({ name: 'robots', content: 'index, follow' });
    meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    const script = renderer.createElement('script') as HTMLScriptElement;
    schemaScript = script;
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
