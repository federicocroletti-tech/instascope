import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  signal,
  inject,
} from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ECharts } from 'echarts';
import { compareSnapshots } from '../../core/analytics/snapshot-comparison';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { DATASET_KEYS } from '../../shared/models/snapshot.model';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';

type RangeDays = 30 | 60 | 90;

@Component({
  selector: 'app-dashboard-page',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">{{ demo ? 'Demo pubblica · dati dimostrativi' : 'Area privata' }}</p>
        <h1>Dashboard</h1>
        <p class="lead">Riepilogo calcolato esclusivamente dai dataset presenti negli snapshot.</p>
      </header>

      <div class="toolbar" aria-label="Intervallo del grafico">
        <span>Intervallo:</span>
        @for (range of ranges; track range) {
          <button
            type="button"
            class="quiet-button"
            [attr.aria-pressed]="rangeDays() === range"
            (click)="setRange(range)"
          >
            {{ range }} giorni
          </button>
        }
      </div>

      @if (current(); as snapshot) {
        <p class="muted">
          Ultimo snapshot: {{ snapshot.createdAt | date: 'medium' }} · Dataset disponibili
          {{ completeness() }}/{{ datasetCount }}
        </p>
        <div class="grid grid-4 metrics">
          <article class="card">
            <h2>Follower</h2>
            <strong>{{ count('followers') }}</strong>
            <small>{{ delta('followers') }}</small>
          </article>
          <article class="card">
            <h2>Following</h2>
            <strong>{{ count('following') }}</strong>
            <small>{{ delta('following') }}</small>
          </article>
          <article class="card">
            <h2>Rapporto</h2>
            <strong>{{ ratio() }}</strong>
            <small
              >Follower ÷ following; non disponibile se manca un dataset o following è zero.</small
            >
          </article>
          <article class="card">
            <h2>Richieste pendenti</h2>
            <strong>{{ count('pendingRequests') }}</strong>
            <small>Solo se il dataset è presente nell’export.</small>
          </article>
        </div>

        <div class="grid grid-3 relationship-metrics">
          <article class="card">
            <h2>Seguo, ma non mi segue</h2>
            <strong>{{ relationshipCount('followingNotFollowers') }}</strong
            ><a routerLink="/app/relationships">Apri relazioni</a>
          </article>
          <article class="card">
            <h2>Mi segue, ma non seguo</h2>
            <strong>{{ relationshipCount('followersNotFollowing') }}</strong
            ><a routerLink="/app/relationships">Apri relazioni</a>
          </article>
          <article class="card">
            <h2>Variazioni</h2>
            <p>{{ changeSummary() }}</p>
            <small>Il confronto richiede due snapshot con i dataset corrispondenti.</small>
          </article>
        </div>

        @if (trendSnapshots().length >= 2) {
          <section class="card trend-section" aria-labelledby="trend-title">
            <h2 id="trend-title">Trend snapshot</h2>
            <p class="muted">
              Conteggi osservati negli snapshot nel periodo selezionato. Nessun dato viene
              interpolato.
            </p>
            <div
              #trendChart
              class="trend-chart"
              role="img"
              aria-label="Grafico temporale di follower e following"
            >
              <span class="sr-only"
                >Usa la tabella sottostante per leggere i valori del grafico.</span
              >
            </div>
            <table>
              <caption>
                Conteggi per snapshot
              </caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Follower</th>
                  <th scope="col">Following</th>
                </tr>
              </thead>
              <tbody>
                @for (item of trendSnapshots(); track item.id) {
                  <tr>
                    <th scope="row">{{ item.createdAt | date: 'shortDate' }}</th>
                    <td>{{ item.datasets.followers?.length ?? 'Non disponibile' }}</td>
                    <td>{{ item.datasets.following?.length ?? 'Non disponibile' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        } @else {
          <p class="status-message" role="status">
            Il trend non è disponibile: servono almeno due snapshot con date valide nel periodo
            selezionato.
          </p>
        }

        @if (demo) {
          <p class="status-message">
            Tutti i valori, i nomi e le date in questa vista sono dimostrativi e sintetici.
          </p>
        }
      } @else {
        <div class="card empty-state">
          <h2>Nessuno snapshot disponibile</h2>
          <p>
            Importa un export supportato nell’area privata. Senza snapshot non vengono mostrati
            conteggi o trend.
          </p>
          <a class="primary-button" routerLink="/app/imports">Vai alle importazioni</a>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        margin-block: 1rem;
      }
      .metrics h2,
      .relationship-metrics h2 {
        font-family: inherit;
        font-size: 1rem;
      }
      .metrics strong,
      .relationship-metrics strong {
        display: block;
        margin-block: 0.5rem;
        font-size: 2rem;
      }
      .metrics small,
      .relationship-metrics small {
        color: var(--color-muted);
      }
      .relationship-metrics {
        margin-top: 1rem;
      }
      .trend-section {
        margin-top: 1.5rem;
      }
      .trend-chart {
        min-height: 18rem;
        width: 100%;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
      }
      th,
      td {
        padding: 0.65rem;
        border-bottom: 1px solid var(--color-line);
        text-align: left;
      }
      .empty-state {
        display: grid;
        justify-items: start;
        gap: 1rem;
      }
    `,
  ],
})
export class DashboardPageComponent {
  private readonly snapshotFacade = inject(SnapshotFacade);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('trendChart') private chartElement?: ElementRef<HTMLDivElement>;

  readonly ranges: readonly RangeDays[] = [30, 60, 90];
  readonly datasetCount = DATASET_KEYS.length;
  readonly rangeDays = signal<RangeDays>(30);
  readonly demo: boolean;
  readonly snapshots = computed(() =>
    this.demo ? [...DEMO_SNAPSHOTS] : this.snapshotFacade.activeSnapshots(),
  );
  readonly current = computed(() => this.snapshots()[0] ?? null);
  readonly previous = computed(() => this.snapshots()[1] ?? null);
  readonly comparison = computed(() => {
    const current = this.current();
    return current ? compareSnapshots(current, this.previous() ?? undefined) : null;
  });
  readonly completeness = computed(() => {
    const current = this.current();
    return current ? DATASET_KEYS.filter((key) => current.datasets[key] !== undefined).length : 0;
  });
  readonly trendSnapshots = computed(() => {
    const cutoff = Date.now() - this.rangeDays() * 24 * 60 * 60 * 1000;
    return this.snapshots()
      .filter((snapshot) => {
        const time = Date.parse(snapshot.createdAt);
        return Number.isFinite(time) && time >= cutoff && time <= Date.now();
      })
      .reverse();
  });

  private chart: ECharts | null = null;
  private readonly browser: boolean;

  constructor() {
    const route = inject(ActivatedRoute);
    const platformId = inject(PLATFORM_ID);

    this.demo = route.snapshot.data['demo'] === true;
    this.browser = isPlatformBrowser(platformId);
    if (this.browser) {
      const stored = Number(localStorage.getItem('instascope-trend-days'));
      if (stored === 30 || stored === 60 || stored === 90) {
        this.rangeDays.set(stored);
      }
    }
    effect(() => this.updateChart());
    afterNextRender(() => void this.mountChart());
    this.destroyRef.onDestroy(() => {
      if (this.browser) {
        window.removeEventListener('resize', this.resizeChart);
      }
      this.chart?.dispose();
    });
  }

  count(key: 'followers' | 'following' | 'pendingRequests'): string | number {
    const list = this.current()?.datasets[key];
    return list ? list.length : 'Non disponibile';
  }

  ratio(): string {
    const followers = this.current()?.datasets.followers;
    const following = this.current()?.datasets.following;
    if (!followers || !following || following.length === 0) {
      return 'Non disponibile';
    }
    return (followers.length / following.length).toFixed(2);
  }

  delta(key: 'followers' | 'following'): string {
    const current = this.current()?.datasets[key];
    const previous = this.previous()?.datasets[key];
    if (!current || !previous) {
      return 'Confronto non disponibile: serve una base temporale completa.';
    }
    const change = current.length - previous.length;
    const percent =
      previous.length === 0
        ? 'percentuale non disponibile'
        : `${((change / previous.length) * 100).toFixed(1)}%`;
    return `${change >= 0 ? '+' : ''}${change} (${percent}) rispetto allo snapshot precedente.`;
  }

  relationshipCount(key: keyof NonNullable<ReturnType<typeof compareSnapshots>>): string | number {
    const result = this.comparison()?.[key];
    return result ? result.length : 'Base insufficiente';
  }

  changeSummary(): string {
    const comparison = this.comparison();
    if (!comparison?.newFollowers || !comparison.lostFollowers) {
      return 'Non disponibile: servono due snapshot e i dataset followers.';
    }
    return `${comparison.newFollowers.length} nuovi follower · ${comparison.lostFollowers.length} follower persi possibili.`;
  }

  setRange(days: RangeDays): void {
    this.rangeDays.set(days);
    if (this.browser) {
      localStorage.setItem('instascope-trend-days', String(days));
    }
  }

  private async mountChart(): Promise<void> {
    const element = this.chartElement?.nativeElement;
    if (!this.browser || !element || this.trendSnapshots().length < 2) {
      return;
    }
    const echarts = await import('echarts');
    if (!element.isConnected) {
      return;
    }
    this.chart = echarts.init(element, undefined, { renderer: 'canvas' });
    this.updateChart();
    window.addEventListener('resize', this.resizeChart);
  }

  private readonly resizeChart = (): void => this.chart?.resize();

  private updateChart(): void {
    const chart = this.chart;
    if (!chart) {
      return;
    }
    const snapshots = this.trendSnapshots();
    chart.setOption({
      color: ['#58c6a2', '#6d97b4'],
      tooltip: { trigger: 'axis' },
      legend: {
        top: 8,
        data: ['Follower', 'Following'],
        textStyle: { color: '#edf6f8' },
      },
      grid: { left: 36, right: 20, top: 48, bottom: 40 },
      xAxis: {
        type: 'category',
        data: snapshots.map((snapshot) => new Date(snapshot.createdAt).toLocaleDateString()),
        axisLabel: { color: '#cbd8d2', hideOverlap: true },
      },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#cbd8d2' } },
      series: [
        {
          name: 'Follower',
          type: 'line',
          data: snapshots.map((item) => item.datasets.followers?.length ?? null),
        },
        {
          name: 'Following',
          type: 'line',
          data: snapshots.map((item) => item.datasets.following?.length ?? null),
        },
      ],
    });
  }
}
