import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';

@Component({
  selector: 'app-insights-page',
  imports: [RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">{{ demo ? 'Dati dimostrativi' : 'Metriche disponibili' }}</p>
        <h1>Limiti e consigli</h1>
        <p class="lead">
          Ogni consiglio separa un fatto osservato da un’interpretazione e indica i limiti dei dati.
        </p>
      </header>

      @if (facts().length) {
        <div class="grid grid-2">
          @for (item of facts(); track item.title) {
            <article class="card">
              <h2>{{ item.title }}</h2>
              <p><strong>Fatto rilevato:</strong> {{ item.fact }}</p>
              <p><strong>Interpretazione:</strong> {{ item.interpretation }}</p>
              <p><strong>Azione consigliata:</strong> {{ item.action }}</p>
              <p><strong>Limite del dato:</strong> {{ item.limit }}</p>
            </article>
          }
        </div>
      } @else {
        <p class="status-message">
          Nessun dato sufficiente per formulare consigli contestuali. Importa snapshot nell’area
          privata.
        </p>
        <a class="primary-button" routerLink="/app/imports">Vai alle importazioni</a>
      }

      <aside class="card limits">
        <h2>Metriche non disponibili</h2>
        <p>
          L'export utilizzato non dimostra engagement rate, reach, impression, prestazioni dei post
          o orari migliori.
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

  readonly demo: boolean;
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
        title: 'Regolarità degli snapshot',
        fact: previous
          ? `Sono presenti snapshot del ${new Date(previous.createdAt).toLocaleDateString()} e del ${new Date(newest.createdAt).toLocaleDateString()}.`
          : 'È disponibile un solo snapshot.',
        interpretation: previous
          ? 'Il confronto temporale copre solo i punti importati.'
          : 'Una singola fotografia non mostra una tendenza.',
        action: previous
          ? 'Conserva snapshot periodici se il confronto è utile.'
          : 'Importa un secondo snapshot in una data successiva.',
        limit: 'Non misura crescita giornaliera né spiega le cause delle variazioni.',
      },
    ];

    const followerCount = newest.datasets.followers?.length;
    const followingCount = newest.datasets.following?.length;
    if (followerCount !== undefined && followingCount !== undefined && followingCount > 0) {
      result.push({
        title: 'Rapporto follower/following',
        fact: `Il rapporto calcolato sullo snapshot corrente è ${(followerCount / followingCount).toFixed(2)}.`,
        interpretation: 'È solo un rapporto tra due conteggi presenti nell’export.',
        action: 'Usalo come dato descrittivo, non come obiettivo universale.',
        limit: 'Non descrive qualità, interesse, reach o engagement.',
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
        title: 'Richieste pendenti datate',
        fact: 'Almeno una richiesta presente nel dataset ha un timestamp validato anteriore a 30 giorni.',
        interpretation:
          'La richiesta compare ancora nell’export; non è possibile dedurre cosa abbia fatto l’altra persona.',
        action: 'Rivedi manualmente la lista nell’app, senza automazioni su Instagram.',
        limit: 'Una data mancante o non valida non viene usata per calcolare l’attesa.',
      });
    }
    return result;
  });

  constructor() {
    const route = inject(ActivatedRoute);

    this.demo = route.snapshot.data['demo'] === true;
  }
}
