import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';
import { LocaleService } from '../../core/i18n/locale.service';
import { AiInsightsComponent } from './ai-insights.component';

@Component({
  selector: 'app-insights-page',
  imports: [RouterLink, AiInsightsComponent],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">
          {{
            demo
              ? locale.text('Dati dimostrativi', 'Sample data')
              : locale.text('Metriche disponibili', 'Available metrics')
          }}
        </p>
        <h1>{{ locale.text('Limiti e consigli', 'Limits and tips') }}</h1>
        <p class="lead">
          {{
            locale.text(
              'Ogni consiglio separa un fatto osservato da un’interpretazione e indica i limiti dei dati.',
              'Each tip separates an observed fact from interpretation and explains the limits of the data.'
            )
          }}
        </p>
      </header>

      @if (facts().length) {
        <div class="grid grid-2">
          @for (item of facts(); track item.title) {
            <article class="card">
              <h2>{{ item.title }}</h2>
              <p>
                <strong>{{ locale.text('Fatto rilevato:', 'Observed fact:') }}</strong>
                {{ item.fact }}
              </p>
              <p>
                <strong>{{ locale.text('Interpretazione:', 'Interpretation:') }}</strong>
                {{ item.interpretation }}
              </p>
              <p>
                <strong>{{ locale.text('Azione consigliata:', 'Suggested action:') }}</strong>
                {{ item.action }}
              </p>
              <p>
                <strong>{{ locale.text('Limite del dato:', 'Data limitation:') }}</strong>
                {{ item.limit }}
              </p>
            </article>
          }
        </div>
      } @else {
        <p class="status-message">
          {{
            locale.text(
              'Nessun dato sufficiente per formulare consigli contestuali. Importa snapshot nell’area privata.',
              'There is not enough data to provide contextual tips. Import snapshots in the private workspace.'
            )
          }}
        </p>
        <a class="primary-button" [routerLink]="localMode ? '/local/import' : '/app/imports'">{{
          locale.text('Vai alle importazioni', 'Go to imports')
        }}</a>
      }

      <app-ai-insights
        [snapshots]="snapshots()"
        [demo]="demo"
        [cloudAllowed]="!localMode && !demo"
      />

      <aside class="card limits">
        <h2>{{ locale.text('Metriche non disponibili', 'Unavailable metrics') }}</h2>
        <p>
          {{
            locale.text(
              'L’archivio utilizzato non dimostra engagement rate, reach, impression, prestazioni dei post o orari migliori.',
              'The archive does not establish engagement rate, reach, impressions, post performance, or best posting times.'
            )
          }}
        </p>
      </aside>
    </section>
  `,
  styles: [
    `
      .card {
        display: grid;
        align-content: start;
        gap: 0.65rem;
      }
      .card h2 {
        font-family: inherit;
        font-size: 1.15rem;
      }
      .limits {
        margin-top: 1.5rem;
      }
    `,
  ],
})
export class InsightsPageComponent {
  private readonly facade = inject(SnapshotFacade);
  readonly locale = inject(LocaleService);

  readonly demo: boolean;
  readonly localMode: boolean;
  readonly snapshots = computed(() =>
    this.demo ? [...DEMO_SNAPSHOTS] : this.facade.activeSnapshots(),
  );
  readonly facts = computed(() => {
    const snapshots = this.snapshots();
    if (snapshots.length === 0) {
      return [];
    }

    const newest = snapshots[0];
    const previous = snapshots[1];
    const result = [
      {
        title: this.locale.text('Regolarità degli snapshot', 'Snapshot frequency'),
        fact: previous
          ? this.locale.text(
              `Sono presenti snapshot del ${new Intl.DateTimeFormat(this.locale.locale()).format(new Date(previous.createdAt))} e del ${new Intl.DateTimeFormat(this.locale.locale()).format(new Date(newest.createdAt))}.`,
              `Snapshots are available from ${new Intl.DateTimeFormat(this.locale.locale()).format(new Date(previous.createdAt))} and ${new Intl.DateTimeFormat(this.locale.locale()).format(new Date(newest.createdAt))}.`,
            )
          : this.locale.text('È disponibile un solo snapshot.', 'Only one snapshot is available.'),
        interpretation: previous
          ? this.locale.text(
              'Il confronto temporale copre solo i punti importati.',
              'The time comparison covers imported snapshots only.',
            )
          : this.locale.text(
              'Una singola fotografia non mostra una tendenza.',
              'A single snapshot does not show a trend.',
            ),
        action: previous
          ? this.locale.text(
              'Conserva snapshot periodici se il confronto è utile.',
              'Keep periodic snapshots if comparisons are useful.',
            )
          : this.locale.text(
              'Importa un secondo snapshot in una data successiva.',
              'Import another snapshot at a later date.',
            ),
        limit: this.locale.text(
          'Non misura crescita giornaliera né spiega le cause delle variazioni.',
          'It does not measure daily growth or explain the causes of changes.',
        ),
      },
    ];

    const followerCount = newest.datasets.followers?.length;
    const followingCount = newest.datasets.following?.length;
    if (followerCount !== undefined && followingCount !== undefined && followingCount > 0) {
      result.push({
        title: this.locale.text('Rapporto follower/following', 'Follower/following ratio'),
        fact: this.locale.text(
          `Il rapporto calcolato sullo snapshot corrente è ${(followerCount / followingCount).toFixed(2)}.`,
          `The ratio calculated from the current snapshot is ${(followerCount / followingCount).toFixed(2)}.`,
        ),
        interpretation: this.locale.text(
          'È solo un rapporto tra due conteggi presenti nell’archivio.',
          'This is only a ratio between two counts in the archive.',
        ),
        action: this.locale.text(
          'Usalo come dato descrittivo, non come obiettivo universale.',
          'Treat it as descriptive data, not a universal goal.',
        ),
        limit: this.locale.text(
          'Non descrive qualità, interesse, reach o engagement.',
          'It does not describe quality, interest, reach, or engagement.',
        ),
      });
    }

    const pending = newest.datasets.pendingRequests;
    if (
      pending?.some(
        (account) =>
          account.timestamp && Date.now() - Date.parse(account.timestamp) > 30 * 86_400_000,
      )
    ) {
      result.push({
        title: this.locale.text('Richieste pendenti datate', 'Dated pending requests'),
        fact: this.locale.text(
          'Almeno una richiesta presente nel dataset ha una data validata anteriore a 30 giorni.',
          'At least one request in the dataset has a validated date more than 30 days ago.',
        ),
        interpretation: this.locale.text(
          'La richiesta compare ancora nell’archivio; non è possibile dedurre cosa abbia fatto l’altra persona.',
          'The request still appears in the archive; you cannot infer what the other person did.',
        ),
        action: this.locale.text(
          'Rivedi manualmente la lista nell’app, senza automazioni su Instagram.',
          'Review the list manually in the app, without Instagram automation.',
        ),
        limit: this.locale.text(
          'Una data mancante o non valida non viene usata per calcolare l’attesa.',
          'Missing or invalid dates are not used to calculate waiting time.',
        ),
      });
    }
    return result;
  });

  constructor() {
    const route = inject(ActivatedRoute);

    this.demo = route.snapshot.data['demo'] === true;
    this.localMode = route.snapshot.data['local'] === true;
  }
}
