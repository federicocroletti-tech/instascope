import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, signal, inject, linkedSignal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  compareSnapshots,
  filterAccountsByDays,
  partitionLostFollowers,
} from '../../core/analytics/snapshot-comparison';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { InstagramAccount, Snapshot } from '../../shared/models/snapshot.model';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';
import { LocaleService } from '../../core/i18n/locale.service';
import { exportTableToCsv } from '../../shared/utils/table-export';
import { instagramProfileUrl } from '../../shared/utils/instagram-profile-url';

type DataPageKind = 'unfollow' | 'pending' | 'relationships' | 'recent' | 'recommendations';
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
  imports: [DatePipe, MatTabsModule, NgTemplateOutlet, RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">
          {{
            demo
              ? locale.text('Dati dimostrativi', 'Sample data')
              : localMode
                ? locale.text('Area locale · senza account', 'Local workspace · no account')
                : locale.text('Area privata', 'Private workspace')
          }}
        </p>
        <h1>{{ title() }}</h1>
        <p class="lead">{{ intro() }}</p>
        @if (page === 'unfollow' && !demo) {
          <a class="quiet-button" [routerLink]="localMode ? '/local/import' : '/app/imports'">
            {{ locale.text('Importa un altro archivio', 'Import another archive') }}
          </a>
        }
      </header>

      @if (demo) {
        <p class="status-message" role="status">
          {{
            locale.text(
              'Vista pubblica con dati esclusivamente sintetici. I nomi non identificano account reali.',
              'Public view with synthetic data only. Names do not identify real accounts.'
            )
          }}
        </p>
      }

      @if (page === 'unfollow') {
        <details class="unfollow-help">
          <summary>
            {{
              locale.text('Come interpretare questi risultati', 'How to interpret these results')
            }}
          </summary>
          <p>
            {{
              locale.text(
                'Il dato deriva dal confronto tra esportazioni. Non prova necessariamente un unfollow: l’account potrebbe essere stato rinominato, eliminato, disattivato o sospeso.',
                'This data comes from comparing archives. It does not necessarily prove an unfollow: the account may have been renamed, deleted, deactivated, or suspended.'
              )
            }}
          </p>
        </details>
        @if (snapshots().length > 1) {
          <section
            class="comparison-picker"
            [attr.aria-label]="
              locale.text('Selezione snapshot da confrontare', 'Choose snapshots to compare')
            "
          >
            <p>
              {{
                locale.text(
                  'Confronta due snapshot salvati, ordinati per data di importazione. Inizialmente sono selezionati gli ultimi due.',
                  'Compare saved snapshots, ordered by import date. The two latest are selected by default.'
                )
              }}
            </p>
            <div class="comparison-selects">
              <label for="comparison-current">
                {{ locale.text('Snapshot più recente', 'Latest snapshot') }}
                <select
                  id="comparison-current"
                  [value]="current()?.id ?? ''"
                  (change)="setComparisonCurrent($event)"
                >
                  @for (snapshot of currentOptions(); track snapshot.id) {
                    <option [value]="snapshot.id">
                      {{ snapshot.createdAt | date: 'medium' : '' : locale.locale() }}
                    </option>
                  }
                </select>
              </label>
              <label for="comparison-previous">
                {{ locale.text('Snapshot precedente', 'Previous snapshot') }}
                <select
                  id="comparison-previous"
                  [value]="previous()?.id ?? ''"
                  (change)="setComparisonPrevious($event)"
                >
                  @for (snapshot of previousOptions(); track snapshot.id) {
                    <option [value]="snapshot.id">
                      {{ snapshot.createdAt | date: 'medium' : '' : locale.locale() }}
                    </option>
                  }
                </select>
              </label>
            </div>
          </section>
        }
        @if (unfollowGroups(); as groups) {
          <mat-tab-group
            [selectedIndex]="unfollowTab()"
            (selectedIndexChange)="unfollowTab.set($event)"
            [attr.aria-label]="locale.text('Categorie Unfollow', 'Unfollow categories')"
          >
            <mat-tab>
              <ng-template mat-tab-label>
                {{ locale.text('Li seguo ancora', 'I still follow them') }}
                <span class="tab-count" aria-hidden="true">{{ groups.followedByMe.length }}</span>
              </ng-template>
              <ng-template matTabContent>
                <ng-container
                  [ngTemplateOutlet]="unfollowTable"
                  [ngTemplateOutletContext]="{
                    rows: groups.followedByMe,
                    category: locale.text('Li seguo ancora', 'I still follow them'),
                    review: true,
                  }"
                />
              </ng-template>
            </mat-tab>
            <mat-tab>
              <ng-template mat-tab-label>
                {{ locale.text('Non li seguo più', 'I no longer follow them') }}
                <span class="tab-count" aria-hidden="true">{{
                  groups.notFollowedByMe.length
                }}</span>
              </ng-template>
              <ng-template matTabContent>
                <ng-container
                  [ngTemplateOutlet]="unfollowTable"
                  [ngTemplateOutletContext]="{
                    rows: groups.notFollowedByMe,
                    category: locale.text('Non li seguo più', 'I no longer follow them'),
                  }"
                />
              </ng-template>
            </mat-tab>
          </mat-tab-group>

          @if (selectedLostFollowers().length) {
            <section class="card selected-unfollow-list" aria-labelledby="selected-followers-title">
              <h2 id="selected-followers-title">
                {{ locale.text('Profili selezionati', 'Selected profiles') }}
              </h2>
              <p>
                {{
                  locale.text(
                    'InstaScope non modifica il tuo account: apri i profili e conferma manualmente su Instagram. L’elenco deriva dagli snapshot e potrebbe non riflettere lo stato attuale.',
                    'InstaScope does not change your account: open profiles and confirm manually on Instagram. The list comes from snapshots and may not reflect the current state.'
                  )
                }}
              </p>
              <p role="status">
                {{ selectedLostFollowers().length }} {{ locale.text('selezionati', 'selected') }}
              </p>
              <button type="button" class="quiet-button" (click)="clearLostFollowerSelection()">
                {{ locale.text('Deseleziona tutti', 'Clear selection') }}
              </button>
              <button
                type="button"
                class="quiet-button"
                (click)="exportDataTable(reviewTable, 'selected-profiles')"
              >
                {{ locale.text('Esporta selezionati CSV', 'Export selected CSV') }}
              </button>
              <div class="table-scroll">
                <table #reviewTable>
                  <thead>
                    <tr>
                      <th scope="col">Username</th>
                      <th scope="col">
                        {{ locale.text('Profilo Instagram', 'Instagram profile') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (account of selectedLostFollowers(); track account.username) {
                      <tr>
                        <th scope="row">{{ account.username }}</th>
                        <td>
                          <a
                            [href]="instagramProfileUrl(account.username)"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ instagramProfileUrl(account.username) }}</a
                          >
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }

          <ng-template #unfollowTable let-rows="rows" let-category="category" let-review="review">
            @if (rows.length) {
              @if (review) {
                <label class="bulk-selection">
                  <input
                    type="checkbox"
                    [checked]="allLostFollowersSelected()"
                    [indeterminate]="someLostFollowersSelected()"
                    (change)="toggleAllLostFollowers($event)"
                  />
                  {{ locale.text('Seleziona tutti per la revisione', 'Select all for review') }}
                </label>
              }
              <button
                type="button"
                class="quiet-button"
                (click)="exportDataTable(unfollowTable, category)"
              >
                {{ locale.text('Esporta tabella CSV', 'Export table CSV') }}
              </button>
              <div class="table-scroll">
                <table #unfollowTable>
                  <caption>
                    {{
                      category
                    }}
                    —
                    {{
                      locale.text(
                        'possibili unfollow rilevati tra snapshot',
                        'possible unfollows detected between snapshots'
                      )
                    }}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Username</th>
                      <th scope="col">
                        {{ locale.text('Ultimo snapshot presente', 'Last snapshot present') }}
                      </th>
                      <th scope="col">
                        {{ locale.text('Primo snapshot assente', 'First snapshot absent') }}
                      </th>
                      <th scope="col">{{ locale.text('Stato', 'Status') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (account of rows; track account.username) {
                      <tr>
                        <th scope="row">
                          @if (review) {
                            <input
                              type="checkbox"
                              [checked]="selectedLostUsernames().includes(account.username)"
                              [attr.aria-label]="
                                locale.text('Seleziona ', 'Select ') +
                                account.username +
                                locale.text(' per la revisione', ' for review')
                              "
                              (change)="toggleLostFollower(account.username, $event)"
                            />
                          }
                          <a
                            [href]="instagramProfileUrl(account.username)"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ account.username }}</a
                          >
                        </th>
                        <td>
                          {{ previous()?.createdAt | date: 'mediumDate' : '' : locale.locale() }}
                        </td>
                        <td>
                          {{ current()?.createdAt | date: 'mediumDate' : '' : locale.locale() }}
                        </td>
                        <td>{{ locale.text('Possibile unfollow', 'Possible unfollow') }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="status-message">
                {{
                  locale.text(
                    'Nessun account in questa categoria nel confronto disponibile.',
                    'No accounts in this category in the available comparison.'
                  )
                }}
              </p>
            }
          </ng-template>
        } @else {
          <p class="status-message" role="status">{{ unfollowUnavailableMessage() }}</p>
        }
      }

      @if (page === 'pending') {
        @if (current()?.datasets.pendingRequests; as requests) {
          <div class="toolbar">
            <label for="request-search">{{
              locale.text('Cerca username', 'Search username')
            }}</label>
            <input
              id="request-search"
              type="search"
              [value]="search()"
              (input)="setSearch($event)"
            />
            <label for="request-sort">{{ locale.text('Ordina', 'Sort') }}</label>
            <select id="request-sort" [value]="sort()" (change)="setSort($event)">
              <option value="oldest">{{ locale.text('Attesa più lunga', 'Longest wait') }}</option>
              <option value="newest">{{ locale.text('Attesa più breve', 'Shortest wait') }}</option>
              <option value="username">Username</option>
            </select>
            <button type="button" class="quiet-button" (click)="exportCsv()">
              {{ locale.text('Esporta CSV locale', 'Export local CSV') }}
            </button>
          </div>
          <p aria-live="polite">
            {{ selected().length }}
            {{
              locale.text(
                'selezionati solo per organizzazione. Nessuna azione viene eseguita su Instagram.',
                'selected for organization only. No action is performed on Instagram.'
              )
            }}
          </p>
          <div class="table-scroll">
            <table>
              <caption>
                {{
                  locale.text(
                    'Richieste di follow in attesa nell’archivio',
                    'Pending follow requests in archive'
                  )
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ locale.text('Seleziona', 'Select') }}</th>
                  <th scope="col">Username</th>
                  <th scope="col">{{ locale.text('Data richiesta', 'Request date') }}</th>
                  <th scope="col">{{ locale.text('Giorni di attesa', 'Days waiting') }}</th>
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
                        [attr.aria-label]="locale.text('Seleziona ', 'Select ') + account.username"
                      />
                    </td>
                    <td>
                      <a
                        [href]="instagramProfileUrl(account.username)"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ account.username }}</a
                      >
                    </td>
                    <td>
                      {{
                        account.timestamp
                          ? (account.timestamp | date: 'mediumDate' : '' : locale.locale())
                          : locale.text('Non disponibile', 'Unavailable')
                      }}
                    </td>
                    <td>{{ waitingDays(account.timestamp) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4">
                      {{
                        locale.text(
                          'Nessuna richiesta corrisponde alla ricerca.',
                          'No requests match your search.'
                        )
                      }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="status-message">
            {{
              locale.text(
                'Il dataset delle richieste pendenti non è presente nello snapshot.',
                'The pending requests dataset is not present in this snapshot.'
              )
            }}
          </p>
        }
      }

      @if (page === 'relationships') {
        <div class="grid grid-2">
          @for (section of relationshipSections(); track section.key) {
            <article class="card">
              <h2>{{ section.title }}</h2>
              @if (relationshipRows(section.key); as rows) {
                <p>{{ rows.length }} {{ locale.text('account', 'accounts') }}</p>
                @if (section.key === 'lostFollowers' && previous() && current()) {
                  <p class="muted">
                    {{
                      locale.text(
                        'Possibile unfollow rilevato tra',
                        'Possible unfollow detected between'
                      )
                    }}
                    {{ previous()!.createdAt | date: 'mediumDate' : '' : locale.locale() }}
                    {{ locale.text('e', 'and') }}
                    {{ current()!.createdAt | date: 'mediumDate' : '' : locale.locale() }}.
                    {{
                      locale.text(
                        'La differenza non dimostra l’intenzione dell’account.',
                        'The difference does not prove the account’s intent.'
                      )
                    }}
                  </p>
                }
                <ul>
                  @for (account of rows; track account.username) {
                    <li>
                      <a
                        [href]="instagramProfileUrl(account.username)"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ account.username }}</a
                      >
                    </li>
                  } @empty {
                    <li>
                      {{
                        locale.text(
                          'Nessuna variazione rilevata nei dataset disponibili.',
                          'No changes found in the available datasets.'
                        )
                      }}
                    </li>
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
          <label for="recent-range">{{ locale.text('Periodo', 'Date range') }}</label>
          <select id="recent-range" [value]="rangeDays()" (change)="setRange($event)">
            <option value="30">{{ locale.text('Ultimi 30 giorni', 'Last 30 days') }}</option>
            <option value="60">{{ locale.text('Ultimi 60 giorni', 'Last 60 days') }}</option>
            <option value="90">{{ locale.text('Ultimi 90 giorni', 'Last 90 days') }}</option>
            <option value="custom">
              {{ locale.text('Intervallo personalizzato', 'Custom range') }}
            </option>
          </select>
          @if (customRange()) {
            <label for="from-date">{{ locale.text('Da', 'From') }}</label
            ><input
              id="from-date"
              type="date"
              [value]="fromDate()"
              (change)="setFromDate($event)"
            />
            <label for="to-date">{{ locale.text('A', 'To') }}</label
            ><input id="to-date" type="date" [value]="toDate()" (change)="setToDate($event)" />
          }
        </div>
        <div class="grid grid-2">
          @for (group of recentGroups(); track group.title) {
            <article class="card">
              <h2>{{ group.title }}</h2>
              <ul>
                @for (account of group.accounts; track account.username) {
                  <li>
                    <a
                      [href]="instagramProfileUrl(account.username)"
                      target="_blank"
                      rel="noopener noreferrer"
                      >{{ account.username }}</a
                    >
                    —
                    {{ account.timestamp | date: 'mediumDate' : '' : locale.locale() }}
                  </li>
                } @empty {
                  <li>
                    {{
                      locale.text(
                        'Nessuna data valida nell’intervallo. I record senza data non sono inclusi.',
                        'No valid dates in this range. Records without a date are excluded.'
                      )
                    }}
                  </li>
                }
              </ul>
            </article>
          }
        </div>
      }

      @if (page === 'recommendations') {
        <p class="muted">
          {{
            locale.text(
              'Nessun punteggio opaco o dato sensibile. Ogni suggerimento mostra l’origine del dato.',
              'No opaque scores or sensitive data. Each suggestion shows its data source.'
            )
          }}
        </p>
        <div class="grid grid-2">
          @for (suggestion of visibleSuggestions(); track suggestion.id) {
            <article class="card suggestion">
              <h2>
                <a
                  [href]="instagramProfileUrl(suggestion.account.username)"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ suggestion.account.username }}</a
                >
              </h2>
              <p>
                <strong>{{ locale.text('Motivo:', 'Reason:') }}</strong> {{ suggestion.reason }}
              </p>
              <p>
                <strong>{{ locale.text('Dati utilizzati:', 'Data used:') }}</strong>
                {{ suggestion.data }}
              </p>
              <p>
                <strong>{{ locale.text('Affidabilità:', 'Confidence:') }}</strong>
                {{
                  locale.locale() === 'it-IT'
                    ? suggestion.confidence
                    : suggestion.confidence === 'Alta'
                      ? 'High'
                      : 'Limited'
                }}.
                {{
                  locale.text(
                    'Il suggerimento non implica compatibilità o interesse.',
                    'This suggestion does not imply compatibility or interest.'
                  )
                }}
              </p>
              <button type="button" class="quiet-button" (click)="hideSuggestion(suggestion.id)">
                {{ locale.text('Nascondi suggerimento', 'Hide suggestion') }}
              </button>
            </article>
          } @empty {
            <p class="status-message">
              {{
                locale.text(
                  'Non ci sono suggerimenti basati sui dataset disponibili.',
                  'There are no suggestions based on the available datasets.'
                )
              }}
            </p>
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
      .unfollow-help {
        margin-block: 0 1rem;
        border-bottom: 1px solid var(--color-line);
        padding-block: 0.75rem;
      }
      .unfollow-help summary {
        cursor: pointer;
        font-weight: 700;
      }
      .comparison-picker {
        display: grid;
        gap: 0.75rem;
        margin-block: 1rem;
        border: 1px solid var(--color-line);
        border-radius: 0.5rem;
        padding: 1rem;
        background: var(--color-background-soft);
      }
      .comparison-picker p {
        margin: 0;
        color: var(--color-muted);
      }
      .comparison-selects {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
        gap: 0.75rem;
      }
      .comparison-selects label {
        display: grid;
        gap: 0.35rem;
        font-weight: 600;
      }
      .comparison-selects select {
        width: 100%;
      }
      mat-tab-group {
        margin-block: 0.75rem;
      }
      .tab-count {
        display: inline-grid;
        min-width: 1.4rem;
        min-height: 1.4rem;
        place-items: center;
        margin-inline-start: 0.4rem;
        border-radius: 999px;
        background: var(--color-background-soft);
        color: var(--color-muted);
        font-size: 0.75rem;
        font-weight: 700;
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
      .bulk-selection {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-block: 1rem;
      }
      .selected-unfollow-list {
        margin-block: 1rem;
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
  readonly locale = inject(LocaleService);

  readonly page: DataPageKind;
  readonly demo: boolean;
  readonly localMode: boolean;
  readonly selectedCurrentId = signal<string | null>(null);
  readonly selectedPreviousId = signal<string | null>(null);
  private readonly content: Record<DataPageKind, [string, string, string, string]> = {
    unfollow: [
      'Unfollow',
      'Unfollow',
      'Account presenti tra i follower nello snapshot precedente e assenti in quello più recente. Le schede distinguono se li segui ancora o no.',
      'Accounts present among followers in the previous snapshot and absent from the latest. Tabs show whether you still follow them.',
    ],
    pending: [
      'Richieste pendenti',
      'Pending requests',
      'Dati, ricerca e ordinamento provengono dal file selezionato. Nessuna automazione su Instagram.',
      'Data, search, and sorting come from the selected file. No automation is performed on Instagram.',
    ],
    relationships: [
      'Relazioni tra account',
      'Account relationships',
      'Le differenze sono confronti tra dataset disponibili, non prove delle intenzioni degli account.',
      'Differences compare available datasets; they are not evidence of account intent.',
    ],
    recent: [
      'Ultimi aggiunti',
      'Recently added',
      'I filtri temporali includono solo date presenti e validate nell’export.',
      'Date filters include only dates present and validated in the archive.',
    ],
    recommendations: [
      'Suggerimenti spiegabili',
      'Explainable suggestions',
      'Suggerimenti basati solo su follower, following e close friends disponibili.',
      'Suggestions use only available followers, following, and close friends data.',
    ],
  };
  readonly title = computed(() =>
    this.locale.locale() === 'it-IT' ? this.content[this.page][0] : this.content[this.page][1],
  );
  readonly intro = computed(() =>
    this.locale.locale() === 'it-IT' ? this.content[this.page][2] : this.content[this.page][3],
  );
  readonly search = signal('');
  readonly sort = signal<'oldest' | 'newest' | 'username'>('oldest');
  readonly selected = signal<string[]>([]);
  readonly rangeDays = signal<string>('30');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly hiddenSuggestions = signal<string[]>([]);
  readonly unfollowTab = signal(0);

  readonly instagramProfileUrl = instagramProfileUrl;

  readonly snapshots = computed(() =>
    this.demo ? [...DEMO_SNAPSHOTS] : this.facade.activeSnapshots(),
  );
  readonly currentOptions = computed(() => this.snapshots().slice(0, -1));
  readonly current = computed<Snapshot | null>(() => {
    const snapshots = this.snapshots();
    const selected = this.selectedCurrentId();
    return (
      this.currentOptions().find((snapshot) => snapshot.id === selected) ?? snapshots.at(0) ?? null
    );
  });
  readonly previousOptions = computed(() => {
    const snapshots = this.snapshots();
    const currentIndex = snapshots.findIndex((snapshot) => snapshot.id === this.current()?.id);
    return currentIndex < 0 ? [] : snapshots.slice(currentIndex + 1);
  });
  readonly previous = computed<Snapshot | null>(() => {
    const options = this.previousOptions();
    const selected = this.selectedPreviousId();
    return options.find((snapshot) => snapshot.id === selected) ?? options[0] ?? null;
  });
  readonly comparison = computed(() => {
    const snapshot = this.current();
    return snapshot ? compareSnapshots(snapshot, this.previous() ?? undefined) : null;
  });
  readonly unfollowGroups = computed(() =>
    partitionLostFollowers(
      this.comparison()?.lostFollowers ?? null,
      this.current()?.datasets.following,
    ),
  );
  readonly selectedLostUsernames = linkedSignal<string[]>(() => {
    this.current();
    this.previous();
    return [];
  });
  readonly selectedLostFollowers = computed(() =>
    (this.unfollowGroups()?.followedByMe ?? []).filter((account) =>
      this.selectedLostUsernames().includes(account.username),
    ),
  );
  readonly allLostFollowersSelected = computed(() => {
    const accounts = this.unfollowGroups()?.followedByMe ?? [];
    return accounts.length > 0 && this.selectedLostFollowers().length === accounts.length;
  });
  readonly someLostFollowersSelected = computed(
    () => this.selectedLostFollowers().length > 0 && !this.allLostFollowersSelected(),
  );
  readonly unfollowUnavailableMessage = computed(() => {
    const current = this.current();
    const previous = this.previous();

    if (!current) {
      return this.locale.text(
        'Non hai ancora snapshot da confrontare. Importa un archivio Instagram con i dati Follower.',
        'There are no snapshots to compare yet. Import an Instagram archive that includes Followers.',
      );
    }
    if (!current.datasets.followers) {
      return this.locale.text(
        'Lo snapshot più recente non contiene il dataset Follower. Importa un archivio che includa Follower.',
        'The latest snapshot has no Followers dataset. Import an archive that includes Followers.',
      );
    }
    if (!previous) {
      return this.locale.text(
        'Hai un solo snapshot. Importane un secondo creato in un momento diverso per trovare i possibili unfollow.',
        'You have only one snapshot. Import a second one from a different date to find possible unfollows.',
      );
    }
    if (!previous.datasets.followers) {
      return this.locale.text(
        'Lo snapshot precedente non contiene il dataset Follower. Importa un archivio precedente che includa Follower.',
        'The previous snapshot has no Followers dataset. Import an earlier archive that includes Followers.',
      );
    }
    if (!current.datasets.following) {
      return this.locale.text(
        'Lo snapshot più recente non contiene il dataset Following, necessario per distinguere le categorie Unfollow.',
        'The latest snapshot has no Following dataset, which is needed to separate Unfollow categories.',
      );
    }
    return this.locale.text(
      'I dataset disponibili non bastano per calcolare il confronto Unfollow. Verifica gli archivi importati.',
      'The available datasets are not sufficient to calculate Unfollow. Check the imported archives.',
    );
  });
  readonly customRange = computed(() => this.rangeDays() === 'custom');
  readonly recentGroups = computed(() => {
    const datasets = this.current()?.datasets;
    return [
      {
        title: this.locale.text(
          'Account che hanno iniziato a seguire',
          'Accounts who started following',
        ),
        accounts: this.filterRecent(datasets?.followers),
      },
      {
        title: this.locale.text(
          'Account che ho iniziato a seguire',
          'Accounts I started following',
        ),
        accounts: this.filterRecent(datasets?.following),
      },
    ];
  });
  readonly suggestions = computed(() => this.buildSuggestions());
  readonly visibleSuggestions = computed(() =>
    this.suggestions().filter((suggestion) => !this.hiddenSuggestions().includes(suggestion.id)),
  );

  readonly relationshipSections = computed<readonly RelationshipSection[]>(() => [
    {
      key: 'followingNotFollowers',
      title: this.locale.text('Seguo, ma non mi segue', 'I follow, but they do not follow me'),
      empty: this.locale.text(
        'Servono follower e following nello snapshot corrente.',
        'The current snapshot needs both followers and following datasets.',
      ),
    },
    {
      key: 'followersNotFollowing',
      title: this.locale.text('Mi segue, ma non seguo', 'They follow me, but I do not follow them'),
      empty: this.locale.text(
        'Servono follower e following nello snapshot corrente.',
        'The current snapshot needs both followers and following datasets.',
      ),
    },
    {
      key: 'lostFollowers',
      title: this.locale.text('Follower persi', 'Lost followers'),
      empty: this.locale.text(
        'Servono due snapshot con entrambi i dataset follower.',
        'Two snapshots with follower data are required.',
      ),
    },
    {
      key: 'removedFollowing',
      title: this.locale.text('Following rimossi', 'Removed following'),
      empty: this.locale.text(
        'Servono due snapshot con entrambi i dataset following.',
        'Two snapshots with following data are required.',
      ),
    },
    {
      key: 'newFollowers',
      title: this.locale.text('Nuovi follower', 'New followers'),
      empty: this.locale.text(
        'Servono due snapshot con entrambi i dataset follower.',
        'Two snapshots with follower data are required.',
      ),
    },
    {
      key: 'newFollowing',
      title: this.locale.text('Nuovi following', 'New following'),
      empty: this.locale.text(
        'Servono due snapshot con entrambi i dataset following.',
        'Two snapshots with following data are required.',
      ),
    },
  ]);

  constructor() {
    const route = inject(ActivatedRoute);

    this.page = route.snapshot.data['page'] as DataPageKind;
    this.demo = route.snapshot.data['demo'] === true;
    this.localMode = route.snapshot.data['local'] === true;
  }

  setComparisonCurrent(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!this.currentOptions().some((snapshot) => snapshot.id === id)) {
      return;
    }
    this.selectedCurrentId.set(id);
    this.selectedPreviousId.set(null);
  }

  setComparisonPrevious(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (this.previousOptions().some((snapshot) => snapshot.id === id)) {
      this.selectedPreviousId.set(id);
    }
  }

  toggleLostFollower(username: string, event: Event): void {
    if (!this.unfollowGroups()?.followedByMe.some((account) => account.username === username)) {
      return;
    }
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedLostUsernames.update((selected) =>
      checked
        ? [...new Set([...selected, username])]
        : selected.filter((item) => item !== username),
    );
  }

  toggleAllLostFollowers(event: Event): void {
    this.selectedLostUsernames.set(
      (event.target as HTMLInputElement).checked
        ? (this.unfollowGroups()?.followedByMe ?? []).map((account) => account.username)
        : [],
    );
  }

  clearLostFollowerSelection(): void {
    this.selectedLostUsernames.set([]);
  }

  pendingRows(requests: InstagramAccount[]): InstagramAccount[] {
    const query = this.search().trim().toLowerCase();
    return requests
      .filter((account) => account.username.toLowerCase().includes(query))
      .sort((a, b) => {
        if (this.sort() === 'username') {
          return a.username.localeCompare(b.username);
        }
        const left = this.waitDaysNumber(a.timestamp);
        const right = this.waitDaysNumber(b.timestamp);
        return this.sort() === 'oldest' ? right - left : left - right;
      });
  }

  relationshipRows(key: RelationshipSection['key']): InstagramAccount[] | null {
    return this.comparison()?.[key] ?? null;
  }

  waitingDays(timestamp?: string): string | number {
    return timestamp
      ? Math.max(0, this.waitDaysNumber(timestamp))
      : this.locale.text('Non disponibile', 'Unavailable');
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
      [
        this.locale.text('username', 'username'),
        this.locale.text('url_profilo', 'profile_url'),
        this.locale.text('data_richiesta', 'request_date'),
        this.locale.text('giorni_di_attesa', 'days_waiting'),
      ],
      ...this.pendingRows(requests).map((account) => [
        account.username,
        account.profileUrl ?? '',
        account.timestamp
          ? new Intl.DateTimeFormat(this.locale.locale(), { dateStyle: 'medium' }).format(
              new Date(account.timestamp),
            )
          : '',
        account.timestamp ? String(this.waitDaysNumber(account.timestamp)) : '',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'instascope-pending-requests.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  exportDataTable(table: HTMLTableElement, category: string): void {
    const slug = category
      .toLocaleLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '');
    exportTableToCsv(table, `instascope-${slug}.csv`);
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

  private waitDaysNumber(timestamp?: string): number {
    if (!timestamp) {
      return -1;
    }
    const time = Date.parse(timestamp);
    return Number.isFinite(time) ? Math.floor((Date.now() - time) / 86_400_000) : -1;
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
        reason: this.locale.text(
          'È presente tra i follower e non compare tra i following.',
          'This account appears among followers but not among following.',
        ),
        data: this.locale.text(
          'Dataset followers e following dello snapshot corrente.',
          'Followers and following datasets from the current snapshot.',
        ),
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
        reason: this.locale.text(
          'Compare nel dataset close friends e non nel dataset following.',
          'This account appears in the close friends dataset but not in the following dataset.',
        ),
        data: this.locale.text(
          'Dataset close friends e following; il dato non implica un suggerimento sociale.',
          'Close friends and following datasets; this does not imply a social recommendation.',
        ),
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
