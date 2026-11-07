import { DatePipe } from '@angular/common';
import { Component, computed, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  compareSnapshots,
  daysAwaitingRequest,
  filterAccountsByDays,
  filterPendingRequests,
  PendingRequestSort,
} from '../../core/analytics/snapshot-comparison';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { InstagramAccount } from '../../shared/models/snapshot.model';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';

type DataPageKind = 'pending' | 'relationships' | 'recent' | 'recommendations';
interface RelationshipSection {
  key:
    | 'followingNotFollowers'
    | 'followersNotFollowing'
    | 'lostFollowers'
    | 'removedFollowing'
    | 'newFollowers'
    | 'newFollowing';
  title: string;
  empty: string;
}

interface Suggestion {
  id: string;
  account: InstagramAccount;
  reason: string;
  data: string;
  confidence: 'Alta' | 'Limitata';
}

@Component({
  selector: 'app-data-page',
  imports: [DatePipe],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">{{ demo ? 'Dati dimostrativi' : 'Area privata' }}</p>
        <h1>{{ title }}</h1>
        <p class="lead">{{ intro }}</p>
      </header>

      @if (demo) {
        <p class="status-message" role="status">
          Vista pubblica con dati esclusivamente sintetici. I nomi non identificano account reali.
        </p>
      }

      @if (page === 'pending') {
        @if (current()?.datasets.pendingRequests; as requests) {
          <div class="toolbar">
            <label for="request-search">Cerca username</label>
            <input
              id="request-search"
              type="search"
              [value]="search()"
              (input)="setSearch($event)"
            />
            <label for="request-sort">Ordina</label>
            <select id="request-sort" [value]="sort()" (change)="setSort($event)">
              <option value="oldest">Attesa più lunga</option>
              <option value="newest">Attesa più breve</option>
              <option value="username">Username</option>
            </select>
            <button type="button" class="quiet-button" (click)="exportCsv()">
              Esporta CSV locale
            </button>
          </div>
          <p aria-live="polite">
            {{ selected().length }} selezionati solo per organizzazione. Nessuna azione viene
            eseguita su Instagram.
          </p>
          <div class="table-scroll">
            <table>
              <caption>
                Richieste di follow in attesa nell'export
              </caption>
              <thead>
                <tr>
                  <th scope="col">Seleziona</th>
                  <th scope="col">Username</th>
                  <th scope="col">Data richiesta</th>
                  <th scope="col">Giorni di attesa</th>
                </tr>
              </thead>
              <tbody>
                @for (account of pendingRows(requests); track account.username) {
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        [checked]="isSelected(account.username)"
                        (change)="toggleSelected(account.username, $event)"
                        [attr.aria-label]="'Seleziona ' + account.username"
                      />
                    </td>
                    <td>
                      @if (account.profileUrl) {
                        <a [href]="account.profileUrl" target="_blank" rel="noopener noreferrer">{{
                          account.username
                        }}</a>
                      } @else {
                        {{ account.username }}
                      }
                    </td>
                    <td>
                      {{
                        account.timestamp
                          ? (account.timestamp | date: 'mediumDate')
                          : 'Non disponibile'
                      }}
                    </td>
                    <td>{{ waitingDays(account.timestamp) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4">Nessuna richiesta corrisponde alla ricerca.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="status-message">
            Il dataset delle richieste pendenti non è presente nello snapshot.
          </p>
        }
      }

      @if (page === 'relationships') {
        <div class="grid grid-2">
          @for (section of relationshipSections; track section.key) {
            <article class="card">
              <h2>{{ section.title }}</h2>
              @if (relationshipRows(section.key); as rows) {
                <p>{{ rows.length }} account</p>
                @if (section.key === 'lostFollowers' && previous() && current()) {
                  <p class="muted">
                    Possibile unfollow rilevato tra
                    {{ previous()!.createdAt | date: 'mediumDate' }} e
                    {{ current()!.createdAt | date: 'mediumDate' }}. La differenza non dimostra
                    l'intenzione dell'account.
                  </p>
                }
                <ul>
                  @for (account of rows; track account.username) {
                    <li>{{ account.username }}</li>
                  } @empty {
                    <li>Nessuna variazione rilevata nei dataset disponibili.</li>
                  }
                </ul>
              } @else {
                <p class="muted">{{ section.empty }}</p>
              }
            </article>
          }
        </div>
      }

      @if (page === 'recent') {
        <div class="toolbar">
          <label for="recent-range">Periodo</label>
          <select id="recent-range" [value]="rangeDays()" (change)="setRange($event)">
            <option value="30">Ultimi 30 giorni</option>
            <option value="60">Ultimi 60 giorni</option>
            <option value="90">Ultimi 90 giorni</option>
            <option value="custom">Intervallo personalizzato</option>
          </select>
          @if (customRange()) {
            <label for="from-date">Da</label
            ><input
              id="from-date"
              type="date"
              [value]="fromDate()"
              (change)="setFromDate($event)"
            />
            <label for="to-date">A</label
            ><input id="to-date" type="date" [value]="toDate()" (change)="setToDate($event)" />
          }
        </div>
        <div class="grid grid-2">
          @for (group of recentGroups(); track group.title) {
            <article class="card">
              <h2>{{ group.title }}</h2>
              <ul>
                @for (account of group.accounts; track account.username) {
                  <li>{{ account.username }} — {{ account.timestamp | date: 'mediumDate' }}</li>
                } @empty {
                  <li>
                    Nessun timestamp valido nell'intervallo. I record senza data non sono inclusi.
                  </li>
                }
              </ul>
            </article>
          }
        </div>
      }

      @if (page === 'recommendations') {
        <p class="muted">
          Nessun punteggio opaco o dato sensibile. Ogni suggerimento mostra l'origine del dato.
        </p>
        <div class="grid grid-2">
          @for (suggestion of visibleSuggestions(); track suggestion.id) {
            <article class="card suggestion">
              <h2>{{ suggestion.account.username }}</h2>
              <p><strong>Motivo:</strong> {{ suggestion.reason }}</p>
              <p><strong>Dati utilizzati:</strong> {{ suggestion.data }}</p>
              <p>
                <strong>Affidabilità:</strong> {{ suggestion.confidence }}. Il suggerimento non
                implica compatibilità o interesse.
              </p>
              <button type="button" class="quiet-button" (click)="hideSuggestion(suggestion.id)">
                Nascondi suggerimento
              </button>
            </article>
          } @empty {
            <p class="status-message">Non ci sono suggerimenti basati sui dataset disponibili.</p>
          }
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
        gap: 0.6rem;
        margin-block: 1rem;
      }
      .toolbar input,
      .toolbar select {
        min-height: 2.75rem;
        border: 1px solid var(--color-line);
        border-radius: 0.4rem;
        background: var(--color-background-soft);
        padding-inline: 0.65rem;
      }
      .table-scroll {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 0.65rem;
        border-bottom: 1px solid var(--color-line);
        text-align: left;
      }
      th {
        color: var(--color-primary-strong);
      }
      .suggestion {
        display: grid;
        align-content: start;
        gap: 0.75rem;
      }
      .card h2 {
        font-family: inherit;
        font-size: 1.15rem;
      }
      ul {
        padding-inline-start: 1.25rem;
      }
    `,
  ],
})
export class DataPageComponent {
  private readonly facade = inject(SnapshotFacade);

  readonly page: DataPageKind;
  readonly demo: boolean;
  readonly title: string;
  readonly intro: string;
  readonly search = signal('');
  readonly sort = signal<PendingRequestSort>('oldest');
  readonly selected = signal<string[]>([]);
  readonly rangeDays = signal<string>('30');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly hiddenSuggestions = signal<string[]>([]);

  readonly snapshots = computed(() =>
    this.demo ? [...DEMO_SNAPSHOTS] : this.facade.activeSnapshots(),
  );
  readonly current = computed(() => this.snapshots().at(0) ?? null);
  readonly previous = computed(() => this.snapshots()[1] ?? null);
  readonly comparison = computed(() => {
    const snapshot = this.current();
    return snapshot ? compareSnapshots(snapshot, this.previous() ?? undefined) : null;
  });
  readonly customRange = computed(() => this.rangeDays() === 'custom');
  readonly recentGroups = computed(() => {
    const datasets = this.current()?.datasets;
    return [
      {
        title: 'Account che hanno iniziato a seguire',
        accounts: this.filterRecent(datasets?.followers),
      },
      {
        title: 'Account che ho iniziato a seguire',
        accounts: this.filterRecent(datasets?.following),
      },
    ];
  });
  readonly suggestions = computed(() => this.buildSuggestions());
  readonly visibleSuggestions = computed(() =>
    this.suggestions().filter((suggestion) => !this.hiddenSuggestions().includes(suggestion.id)),
  );

  readonly relationshipSections: readonly RelationshipSection[] = [
    {
      key: 'followingNotFollowers',
      title: 'Seguo, ma non mi segue',
      empty: 'Servono follower e following nello snapshot corrente.',
    },
    {
      key: 'followersNotFollowing',
      title: 'Mi segue, ma non seguo',
      empty: 'Servono follower e following nello snapshot corrente.',
    },
    {
      key: 'lostFollowers',
      title: 'Follower persi',
      empty: 'Servono due snapshot con entrambi i dataset follower.',
    },
    {
      key: 'removedFollowing',
      title: 'Following rimossi',
      empty: 'Servono due snapshot con entrambi i dataset following.',
    },
    {
      key: 'newFollowers',
      title: 'Nuovi follower',
      empty: 'Servono due snapshot con entrambi i dataset follower.',
    },
    {
      key: 'newFollowing',
      title: 'Nuovi following',
      empty: 'Servono due snapshot con entrambi i dataset following.',
    },
  ];

  constructor() {
    const route = inject(ActivatedRoute);

    this.page = route.snapshot.data['page'] as DataPageKind;
    this.demo = route.snapshot.data['demo'] === true;
    const content: Record<DataPageKind, [string, string]> = {
      pending: [
        'Richieste pendenti',
        'Dati, ricerca e ordinamento provengono dal file selezionato. Nessuna automazione su Instagram.',
      ],
      relationships: [
        'Relazioni tra account',
        'Le differenze sono confronti tra dataset disponibili, non prove delle intenzioni degli account.',
      ],
      recent: [
        'Ultimi aggiunti',
        'I filtri temporali includono solo timestamp presenti e validati nell’export.',
      ],
      recommendations: [
        'Suggerimenti spiegabili',
        'Suggerimenti basati solo su follower, following e close friends disponibili.',
      ],
    };
    [this.title, this.intro] = content[this.page];
  }

  pendingRows(requests: InstagramAccount[]): InstagramAccount[] {
    return filterPendingRequests(requests, this.search(), this.sort());
  }

  relationshipRows(key: RelationshipSection['key']): InstagramAccount[] | null {
    return this.comparison()?.[key] ?? null;
  }

  waitingDays(timestamp?: string): string | number {
    return daysAwaitingRequest(timestamp) ?? 'Non disponibile';
  }

  isSelected(username: string): boolean {
    return this.selected().includes(username);
  }

  toggleSelected(username: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected.update((selected) =>
      checked
        ? [...new Set([...selected, username])]
        : selected.filter((item) => item !== username),
    );
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'oldest' || value === 'newest' || value === 'username') {
      this.sort.set(value);
    }
  }

  setRange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'custom' || value === '30' || value === '60' || value === '90') {
      this.rangeDays.set(value);
    }
  }

  setFromDate(event: Event): void {
    this.fromDate.set((event.target as HTMLInputElement).value);
  }

  setToDate(event: Event): void {
    this.toDate.set((event.target as HTMLInputElement).value);
  }

  hideSuggestion(id: string): void {
    this.hiddenSuggestions.update((hidden) => [...new Set([...hidden, id])]);
  }

  exportCsv(): void {
    const requests = this.current()?.datasets.pendingRequests;
    if (!requests || typeof document === 'undefined') {
      return;
    }
    const rows = [
      ['username', 'profile_url', 'request_date', 'days_waiting'],
      ...this.pendingRows(requests).map((account) => [
        account.username,
        account.profileUrl ?? '',
        account.timestamp ?? '',
        daysAwaitingRequest(account.timestamp)?.toString() ?? '',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'instascope-pending-requests.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private filterRecent(accounts?: InstagramAccount[]): InstagramAccount[] {
    if (!accounts) {
      return [];
    }
    if (this.customRange()) {
      const start = this.fromDate()
        ? Date.parse(`${this.fromDate()}T00:00:00`)
        : Number.NEGATIVE_INFINITY;
      const end = this.toDate()
        ? Date.parse(`${this.toDate()}T23:59:59.999`)
        : Number.POSITIVE_INFINITY;
      if (start > end) {
        return [];
      }
      return accounts.filter((account) => {
        const time = account.timestamp ? Date.parse(account.timestamp) : Number.NaN;
        return Number.isFinite(time) && time >= start && time <= end;
      });
    }
    return filterAccountsByDays(accounts, Number(this.rangeDays()));
  }

  private buildSuggestions(): Suggestion[] {
    const snapshot = this.current();
    if (!snapshot) {
      return [];
    }
    const comparison = this.comparison();
    const candidates: Suggestion[] = [];

    for (const account of comparison?.followersNotFollowing ?? []) {
      candidates.push({
        id: `follower:${account.username.toLowerCase()}`,
        account,
        reason: 'È presente tra i follower e non compare tra i following.',
        data: 'Dataset followers e following dello snapshot corrente.',
        confidence: 'Alta',
      });
    }
    for (const account of snapshot.datasets.closeFriends ?? []) {
      if (
        snapshot.datasets.following?.some(
          (item) => item.username.toLowerCase() === account.username.toLowerCase(),
        )
      ) {
        continue;
      }
      candidates.push({
        id: `close:${account.username.toLowerCase()}`,
        account,
        reason: 'Compare nel dataset close friends e non nel dataset following.',
        data: 'Dataset close friends e following; il dato non implica un suggerimento sociale.',
        confidence: 'Limitata',
      });
    }
    return candidates;
  }
}

function csvCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
