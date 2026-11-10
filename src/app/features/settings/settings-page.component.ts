import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">{{ locale.text('Preferenze locali', 'Local preferences') }}</p>
        <h1>{{ locale.text('Impostazioni', 'Settings') }}</h1>
        <p class="lead">
          {{
            locale.text(
              'Il selettore del tema e gli intervalli del grafico sono preferenze dell’interfaccia, non dati Instagram.',
              'The theme selector and chart ranges are interface preferences, not Instagram data.'
            )
          }}
        </p>
      </header>
      <article class="card">
        <h2>{{ locale.text('Sessione e archivio', 'Session and archive') }}</h2>
        <p>
          {{
            locale.text(
              'Per bloccare la chiave in memoria e terminare la sessione, esegui il logout o chiudi la pagina.',
              'To lock the in-memory key and end the session, sign out or close the page.'
            )
          }}
        </p>
        <a routerLink="/app/privacy">{{
          locale.text(
            'Apri il centro privacy e la gestione snapshot',
            'Open privacy center and snapshot management'
          )
        }}</a>
      </article>
    </section>
  `,
  styles: [
    `
      .card h2 {
        font-family: inherit;
        font-size: 1.15rem;
      }
    `,
  ],
})
export class SettingsPageComponent {
  readonly locale = inject(LocaleService);
}
