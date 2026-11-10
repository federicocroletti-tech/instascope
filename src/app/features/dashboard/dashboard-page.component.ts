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
import { LocaleService } from '../../core/i18n/locale.service';
import { exportTableToCsv } from '../../shared/utils/table-export';
import { instagramProfileUrl } from '../../shared/utils/instagram-profile-url';

type RangeDays = 30 | 60 | 90;

@Component({
  selector: 'app-dashboard-page',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">
          {{
            demo
              ? locale.text('Demo pubblica · dati dimostrativi', 'Public demo · sample data')
              : this.localMode
                ? locale.text('Analisi locale · senza account', 'Local analysis · no account')
                : locale.text('Area privata', 'Private workspace')
          }}
        </p>
        <h1>{{ locale.text('Dashboard', 'Dashboard') }}</h1>
        <p class="lead">
          {{
            locale.text(
              'Riepilogo dell’ultimo snapshot e delle variazioni rilevate.',
              'Overview of the latest snapshot and detected changes.'
            )
          }}
        </p>
      </header>

      <div
        class="toolbar"
        role="group"
        [attr.aria-label]="locale.text('Periodo del grafico', 'Chart time range')"
      >
        <span>{{ locale.text('Trend:', 'Trend:') }}</span>
        @for (range of ranges; track range) {
          <button
            type="button"
            class="quiet-button"
            [attr.aria-pressed]="rangeDays() === range"
            (click)="setRange(range)"
          >
            {{ locale.text(range + ' giorni', range + ' days') }}
          </button>
        }
      </div>

      @if (current(); as snapshot) {
        <section
          class="summary-status"
          [attr.aria-label]="locale.text('Stato dei dati', 'Data status')"
        >
          <dl>
            <div>
              <dt>{{ locale.text('Ultimo import', 'Latest import') }}</dt>
              <dd>{{ snapshot.importedAt | date: 'medium' : '' : locale.locale() }}</dd>
            </div>
            <div>
              <dt>{{ locale.text('Snapshot', 'Snapshots') }}</dt>
              <dd>{{ snapshots().length }}</dd>
            </div>
            <div>
              <dt>{{ locale.text('Categorie nell’export', 'Categories in archive') }}</dt>
              <dd>{{ completeness() }}/{{ datasetCount }}</dd>
            </div>
          </dl>
          <details>
            <summary>{{ locale.text('Categorie rilevate', 'Detected categories') }}</summary>
            <ul>
              @for (dataset of datasetStatus(); track dataset.key) {
                <li>
                  {{ dataset.label }}:
                  {{
                    dataset.available
                      ? locale.text('presente', 'available')
                      : locale.text('non trovata', 'not found')
                  }}
                </li>
              }
            </ul>
          </details>
        </section>

        <div class="grid metrics">
          <article class="card">
            <h2>{{ locale.text('Follower', 'Followers') }}</h2>
            <strong>{{ count('followers') }}</strong>
            <small>{{ deltaLabel('followers') }}</small>
          </article>
          <article class="card">
            <h2>Following</h2>
            <strong>{{ count('following') }}</strong>
            <small>{{ deltaLabel('following') }}</small>
          </article>
          <article class="card">
            <h2>{{ locale.text('Rapporto', 'Ratio') }}</h2>
            <strong>{{ ratio() }}</strong>
            <small>{{ locale.text('Follower ÷ following', 'Followers ÷ following') }}</small>
          </article>
          <article class="card">
            <h2>{{ locale.text('Richieste in sospeso', 'Pending requests') }}</h2>
            <strong>{{ count('pendingRequests') }}</strong>
            <small>{{
              snapshot.datasets.pendingRequests === undefined
                ? locale.text('Categoria non trovata nell’export', 'Category not found in archive')
                : locale.text('Nell’ultimo export', 'In the latest archive')
            }}</small>
          </article>
          <article class="card">
            <h2>{{ locale.text('Possibili unfollow', 'Possible unfollows') }}</h2>
            <strong>{{ lostFollowerCount() }}</strong>
            <small>{{
              locale.text(
                'Assenti rispetto allo snapshot precedente',
                'Missing compared with the previous snapshot'
              )
            }}</small>
          </article>
        </div>

        <section class="recent-changes" aria-labelledby="changes-title">
          <div class="section-heading">
            <div>
              <h2 id="changes-title">
                {{ locale.text('Variazioni follower', 'Follower changes') }}
              </h2>
              @if (recentChangesAvailable()) {
                <p class="muted">
                  {{ recentChangesCount() }}
                  {{
                    locale.text(
                      'rilevate nell’ultimo confronto',
                      'detected in the latest comparison'
                    )
                  }}
                </p>
              }
            </div>
            <a [routerLink]="unfollowPath">{{ locale.text('Apri Unfollow', 'Open Unfollow') }}</a>
          </div>
          @if (!recentChangesAvailable()) {
            <p class="muted">
              {{
                locale.text(
                  'Servono due snapshot con i dati follower per confrontare le variazioni.',
                  'Two snapshots with follower data are needed to compare changes.'
                )
              }}
            </p>
          } @else if (recentChanges().length) {
            <div class="table-scroll">
              <button type="button" class="quiet-button" (click)="exportRecentChanges()">
                {{ locale.text('Esporta tabella CSV', 'Export table CSV') }}
              </button>
              <table #recentTable>
                <caption>
                  Variazioni follower rilevate confrontando gli ultimi due snapshot
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ locale.text('Account', 'Account') }}</th>
                    <th scope="col">{{ locale.text('Variazione', 'Change') }}</th>
                    <th scope="col">
                      {{ locale.text('Rilevata nel confronto', 'Detected in comparison') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (change of recentChanges(); track change.username + change.kind) {
                    <tr>
                      <th scope="row">
                        <a
                          [href]="instagramProfileUrl(change.username)"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ change.username }}</a
                        >
                      </th>
                      <td>{{ change.kind }}</td>
                      <td>{{ snapshot.createdAt | date: 'mediumDate' : '' : locale.locale() }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="muted">
              {{
                locale.text(
                  'Nessuna variazione follower nel confronto disponibile.',
                  'No follower changes in the available comparison.'
                )
              }}
            </p>
          }
        </section>

        @if (trendSnapshots().length >= 2) {
          <section class="trend-section" aria-labelledby="trend-title">
            <div class="section-heading">
              <h2 id="trend-title">
                {{ locale.text('Trend follower e following', 'Follower and following trend') }}
              </h2>
              <span class="muted"
                >{{ locale.text('Ultimi', 'Last') }} {{ rangeDays() }}
                {{ locale.text('giorni', 'days') }}</span
              >
              <button type="button" class="quiet-button" (click)="exportTrend()">
                {{ locale.text('Esporta dati CSV', 'Export CSV data') }}
              </button>
            </div>
            <div
              #trendChart
              class="trend-chart"
              role="img"
              [attr.aria-label]="
                locale.text(
                  'Grafico dei conteggi osservati di follower e following; i valori sono disponibili nella tabella seguente',
                  'Observed follower and following counts; values are available in the table below'
                )
              "
            ></div>
            <table #trendTable>
              <caption>
                {{
                  locale.text('Conteggi per snapshot', 'Counts per snapshot')
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ locale.text('Data', 'Date') }}</th>
                  <th scope="col">Follower</th>
                  <th scope="col">Following</th>
                </tr>
              </thead>
              <tbody>
                @for (item of trendSnapshots(); track item.id) {
                  <tr>
                    <th scope="row">
                      {{ item.createdAt | date: 'mediumDate' : '' : locale.locale() }}
                    </th>
                    <td>
                      {{
                        item.datasets.followers?.length ??
                          locale.text('Non disponibile', 'Unavailable')
                      }}
                    </td>
                    <td>
                      {{
                        item.datasets.following?.length ??
                          locale.text('Non disponibile', 'Unavailable')
                      }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        } @else {
          <section class="trend-section" aria-labelledby="trend-title">
            <div class="section-heading">
              <h2 id="trend-title">Trend follower e following</h2>
              <span class="muted"
                >{{ locale.text('Ultimi', 'Last') }} {{ rangeDays() }}
                {{ locale.text('giorni', 'days') }}</span
              >
            </div>
            <p class="muted">
              {{
                locale.text(
                  'Servono almeno due snapshot datati nel periodo selezionato.',
                  'At least two dated snapshots are needed for the selected period.'
                )
              }}
            </p>
          </section>
        }
      } @else {
        <section class="empty-state">
          <h2>
            {{
              localMode
                ? locale.text('Sblocca i tuoi dati locali', 'Unlock your local data')
                : locale.text('Nessuno snapshot disponibile', 'No snapshot available')
            }}
          </h2>
          <p>
            {{
              localMode
                ? locale.text(
                    'Dopo aver chiuso o ricaricato il browser, sblocca gli snapshot con la tua passphrase. Se è la prima volta, importa un archivio.',
                    'After closing or reloading the browser, unlock your snapshots with your passphrase. If this is your first visit, import an archive.'
                  )
                : locale.text(
                    'Importa un archivio sorgente dati Instagram per visualizzare conteggi e confronti.',
                    'Import an Instagram data archive to view counts and comparisons.'
                  )
            }}
          </p>
          @if (localMode) {
            <a class="quiet-button" routerLink="/local/privacy">
              {{ locale.text('Sblocca dal centro privacy', 'Unlock in the privacy center') }}
            </a>
          }
          <a class="primary-button" [routerLink]="importPath">{{
            localMode
              ? locale.text('Importa un archivio', 'Import an archive')
              : locale.text('Importa archivio dati', 'Import data archive')
          }}</a>
        </section>
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
      .summary-status {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.75rem 1.5rem;
        border-block: 1px solid var(--color-line);
        padding-block: 0.75rem;
      }
      .summary-status dl {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1.5rem;
        margin: 0;
      }
      .summary-status dl div {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .summary-status dt {
        color: var(--color-muted);
      }
      .summary-status dd {
        margin: 0;
        font-weight: 700;
      }
      .summary-status details ul {
        margin-block: 0.4rem 0;
        padding-inline-start: 1.25rem;
      }
      .summary-status summary {
        cursor: pointer;
      }
      .metrics {
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
        margin-block: 1rem 1.5rem;
      }
      .metrics h2 {
        font-family: inherit;
        font-size: 1rem;
        margin: 0;
      }
      .metrics strong {
        display: block;
        margin-block: 0.5rem;
        font-size: 2rem;
      }
      .metrics small {
        color: var(--color-muted);
      }
      .section-heading {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem 1rem;
      }
      .section-heading h2 {
        margin-block: 0;
        font-size: 1.3rem;
      }
      .section-heading p {
        margin-block: 0.35rem 0;
      }
      .recent-changes {
        margin-block: 1.5rem;
      }
      .trend-section {
        margin-top: 2rem;
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
        border-block: 1px solid var(--color-line);
        padding-block: 1.5rem;
      }
      .empty-state h2,
      .empty-state p {
        margin: 0;
      }
    `,
  ],
})
export class DashboardPageComponent {
  private readonly snapshotFacade = inject(SnapshotFacade);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('trendChart') private chartElement?: ElementRef<HTMLDivElement>;
  @ViewChild('trendTable') private trendTable?: ElementRef<HTMLTableElement>;
  @ViewChild('recentTable') private recentTable?: ElementRef<HTMLTableElement>;

  readonly ranges: readonly RangeDays[] = [30, 60, 90];
  readonly datasetCount = DATASET_KEYS.length;
  readonly locale = inject(LocaleService);
  readonly instagramProfileUrl = instagramProfileUrl;
  readonly rangeDays = signal<RangeDays>(30);
  readonly demo: boolean;
  readonly localMode: boolean;
  readonly importPath: string;
  readonly unfollowPath: string;
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
  readonly datasetStatus = computed(() => {
    const datasets = this.current()?.datasets;
    const text = this.locale.text.bind(this.locale);
    return [
      {
        key: 'followers',
        label: text('Follower', 'Followers'),
        available: datasets?.followers !== undefined,
      },
      { key: 'following', label: 'Following', available: datasets?.following !== undefined },
      {
        key: 'pendingRequests',
        label: text('Richieste in sospeso', 'Pending requests'),
        available: datasets?.pendingRequests !== undefined,
      },
      {
        key: 'recentlyUnfollowed',
        label: text('Unfollow recenti', 'Recent unfollows'),
        available: datasets?.recentlyUnfollowed !== undefined,
      },
      {
        key: 'closeFriends',
        label: text('Amici più stretti', 'Close friends'),
        available: datasets?.closeFriends !== undefined,
      },
    ];
  });
  readonly recentChangesAvailable = computed(() => {
    const comparison = this.comparison();
    return comparison?.newFollowers != null && comparison?.lostFollowers != null;
  });
  readonly recentChanges = computed(() => {
    const comparison = this.comparison();
    if (!comparison?.newFollowers || !comparison.lostFollowers) {
      return [];
    }
    return [
      ...comparison.lostFollowers.map((account) => ({
        username: account.username,
        kind: this.locale.text('Non più presente tra i follower', 'No longer among followers'),
      })),
      ...comparison.newFollowers.map((account) => ({
        username: account.username,
        kind: this.locale.text('Nuovo nell’ultimo snapshot', 'New in the latest snapshot'),
      })),
    ].slice(0, 6);
  });
  readonly recentChangesCount = computed(() => {
    const comparison = this.comparison();
    return (comparison?.newFollowers?.length ?? 0) + (comparison?.lostFollowers?.length ?? 0);
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
    this.localMode = route.snapshot.data['local'] === true;
    const localMode = this.localMode;
    const basePath = this.demo ? '/demo' : localMode ? '/local' : '/app';
    this.importPath = this.demo ? '/demo/import' : localMode ? '/local/import' : '/app/imports';
    this.unfollowPath = `${basePath}/unfollow`;
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
    return list ? list.length : this.locale.text('Non disponibile', 'Unavailable');
  }

  ratio(): string {
    const followers = this.current()?.datasets.followers;
    const following = this.current()?.datasets.following;
    if (!followers || !following || following.length === 0) {
      return this.locale.text('Non disponibile', 'Unavailable');
    }
    return (followers.length / following.length).toFixed(2);
  }

  deltaLabel(key: 'followers' | 'following'): string {
    const current = this.current()?.datasets[key];
    const previous = this.previous()?.datasets[key];
    if (!current || !previous) {
      return this.locale.text('Confronto non disponibile', 'Comparison unavailable');
    }
    const change = current.length - previous.length;
    return this.locale.locale() === 'it-IT'
      ? `${change > 0 ? '+' : ''}${change} vs precedente`
      : `${change > 0 ? '+' : ''}${change} vs previous`;
  }

  lostFollowerCount(): string | number {
    const lostFollowers = this.comparison()?.lostFollowers;
    return lostFollowers === null || lostFollowers === undefined
      ? this.locale.text('Non disponibile', 'Unavailable')
      : lostFollowers.length;
  }

  setRange(days: RangeDays): void {
    this.rangeDays.set(days);
    if (this.browser) {
      localStorage.setItem('instascope-trend-days', String(days));
    }
  }

  exportTrend(): void {
    const table = this.trendTable?.nativeElement;
    if (table) {
      exportTableToCsv(table, 'instascope-follower-following-trend.csv');
    }
  }

  exportRecentChanges(): void {
    const table = this.recentTable?.nativeElement;
    if (table) {
      exportTableToCsv(table, 'instascope-follower-changes.csv');
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
    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue('--color-ink').trim();
    const mutedColor = styles.getPropertyValue('--color-muted').trim();
    chart.setOption({
      color: [
        styles.getPropertyValue('--color-instagram-pink').trim(),
        styles.getPropertyValue('--color-instagram-purple').trim(),
      ],
      tooltip: { trigger: 'axis' },
      legend: {
        data: [
          this.locale.text('Follower', 'Followers'),
          this.locale.text('Following', 'Following'),
        ],
        textStyle: { color: textColor },
      },
      grid: { left: 36, right: 20, top: 40, bottom: 32 },
      xAxis: {
        type: 'category',
        data: snapshots.map((snapshot) =>
          new Intl.DateTimeFormat(this.locale.locale(), { dateStyle: 'medium' }).format(
            new Date(snapshot.createdAt),
          ),
        ),
        axisLabel: { color: mutedColor },
      },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: mutedColor } },
      series: [
        {
          name: this.locale.text('Follower', 'Followers'),
          type: 'line',
          data: snapshots.map((item) => item.datasets.followers?.length ?? null),
        },
        {
          name: this.locale.text('Following', 'Following'),
          type: 'line',
          data: snapshots.map((item) => item.datasets.following?.length ?? null),
        },
      ],
    });
  }
}
