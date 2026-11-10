import { Component, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-privacy-page',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">
          {{
            demo
              ? locale.text('Demo sintetica', 'Sample demo')
              : localMode
                ? locale.text('Area locale · senza account', 'Local workspace · no account')
                : locale.text('Dati sul dispositivo', 'On-device data')
          }}
        </p>
        <h1>{{ locale.text('Centro privacy', 'Privacy center') }}</h1>
        <p class="lead">
          {{
            locale.text(
              'I file importati non vengono inviati a server. Solo gli snapshot che scegli di salvare restano in IndexedDB, cifrati.',
              'Imported files are never sent to a server. Only snapshots you choose to save remain encrypted in IndexedDB.'
            )
          }}
        </p>
      </header>

      @if (demo) {
        <p class="status-message" role="status">
          {{
            locale.text(
              'La demo usa dataset sintetici e non persiste dati personali.',
              'The demo uses synthetic datasets and does not persist personal data.'
            )
          }}
        </p>
        <a class="primary-button" routerLink="/demo">{{
          locale.text('Torna alla dashboard demo', 'Return to demo dashboard')
        }}</a>
      } @else {
        @if (localMode) {
          <p class="status-message">
            {{
              locale.text(
                'Dopo aver chiuso o ricaricato il browser, torna qui e sblocca gli snapshot con la stessa passphrase. Se la dimentichi, non possiamo recuperarli.',
                'After closing or reloading the browser, return here and unlock snapshots with the same passphrase. If you forget it, we cannot recover them.'
              )
            }}
          </p>
        }
        <section class="card unlock">
          <h2>{{ locale.text('Sblocca i tuoi snapshot', 'Unlock your snapshots') }}</h2>
          <label for="privacy-passphrase">{{
            locale.text('Passphrase locale', 'Local passphrase')
          }}</label>
          <input
            id="privacy-passphrase"
            type="password"
            autocomplete="current-password"
            [value]="passphrase()"
            (input)="setPassphrase($event)"
          />
          <button
            class="primary-button"
            type="button"
            [disabled]="busy() || passphrase().length < 12"
            (click)="unlock()"
          >
            {{ locale.text('Sblocca', 'Unlock') }}
          </button>
          @if (error()) {
            <p role="alert">{{ error() }}</p>
          }
        </section>

        @if (facade.snapshots().length) {
          <section class="card snapshot-list">
            <h2>
              {{ locale.text('Snapshot salvati localmente', 'Snapshots saved on this device') }}
            </h2>
            <p>
              {{ locale.text('Stato:', 'Status:') }}
              {{
                facade.persistence() === 'local'
                  ? locale.text('cifrati in IndexedDB', 'encrypted in IndexedDB')
                  : locale.text('solo in memoria', 'in memory only')
              }}.
            </p>
            <ul>
              @for (snapshot of facade.snapshots(); track snapshot.id) {
                <li>
                  <span
                    >{{ snapshot.createdAt | date: 'medium' : '' : locale.locale() }} ·
                    {{ snapshot.datasets.followers?.length ?? 'n/d' }}
                    {{ locale.text('follower', 'followers') }} ·
                    {{ snapshot.datasets.following?.length ?? 'n/d' }} following</span
                  >
                  <button class="quiet-button" type="button" (click)="delete(snapshot.id)">
                    {{ locale.text('Elimina snapshot', 'Delete snapshot') }}
                  </button>
                </li>
              }
            </ul>
            <button class="danger-button" type="button" [disabled]="busy()" (click)="deleteAll()">
              {{ locale.text('Elimina tutti i dati locali', 'Delete all local data') }}
            </button>
          </section>
        }

        <section class="card data-flow">
          <h2>{{ locale.text('Flusso dei dati', 'Data flow') }}</h2>
          <ul>
            <li>
              {{
                locale.text(
                  'ZIP/JSON: browser → Web Worker → memoria del browser.',
                  'ZIP/JSON: browser → Web Worker → browser memory.'
                )
              }}
            </li>
            <li>
              {{
                locale.text(
                  'Salvataggio facoltativo: payload AES-GCM in IndexedDB; chiave derivata dalla passphrase e mantenuta solo in memoria.',
                  'Optional storage: AES-GCM payload in IndexedDB; key derived from the passphrase and kept in memory only.'
                )
              }}
            </li>
            @if (!localMode) {
              <li>
                {{
                  locale.text(
                    'Supabase Auth riceve i soli dati di autenticazione; il servizio non riceve archivi o record Instagram.',
                    'Supabase Auth receives authentication data only; the service receives no archives or Instagram records.'
                  )
                }}
              </li>
            } @else {
              <li>
                {{
                  locale.text(
                    'Questo percorso non usa login o Supabase.',
                    'This flow does not use sign-in or Supabase.'
                  )
                }}
              </li>
            }
            <li>
              {{
                locale.text(
                  'Hosting Vercel può ricevere richieste HTTP standard e metadati tecnici; i file del browser non sono inclusi nelle richieste dell’app.',
                  'Vercel hosting may receive standard HTTP requests and technical metadata; browser files are not included in app requests.'
                )
              }}
            </li>
            <li>
              {{
                locale.text(
                  'Analytics non essenziali: non configurati.',
                  'Non-essential analytics: not configured.'
                )
              }}
            </li>
          </ul>
          <p>
            {{
              locale.text(
                'La cancellazione IndexedDB non elimina copie esportate dall’utente, backup del browser o file sorgente sul dispositivo.',
                'Deleting IndexedDB does not remove user-exported copies, browser backups, or source files on the device.'
              )
            }}
          </p>
        </section>
      }
    </section>
  `,
  styles: [
    `
      .card {
        display: grid;
        justify-items: start;
        gap: 0.8rem;
        margin-block: 1rem;
      }
      .card h2 {
        font-family: inherit;
        font-size: 1.15rem;
      }
      input[type='password'] {
        width: min(100%, 28rem);
        min-height: 2.75rem;
        border: 1px solid var(--color-line);
        border-radius: 0.4rem;
        background: var(--color-background-soft);
        padding-inline: 0.7rem;
      }
      .snapshot-list ul {
        display: grid;
        width: 100%;
        gap: 0.75rem;
        padding: 0;
        list-style: none;
      }
      .snapshot-list li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        border-bottom: 1px solid var(--color-line);
        padding-block: 0.5rem;
      }
      .danger-button {
        min-height: 2.75rem;
        border: 2px solid #a34a3a;
        border-radius: 0.5rem;
        background: transparent;
        color: var(--color-ink);
        padding: 0.5rem 0.75rem;
      }
    `,
  ],
})
export class PrivacyPageComponent {
  readonly facade = inject(SnapshotFacade);
  readonly locale = inject(LocaleService);

  readonly demo: boolean;
  readonly localMode: boolean;
  readonly passphrase = signal('');
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  constructor() {
    const route = inject(ActivatedRoute);

    this.demo = route.snapshot.data['demo'] === true;
    this.localMode = route.snapshot.data['local'] === true;
  }

  setPassphrase(event: Event): void {
    this.passphrase.set((event.target as HTMLInputElement).value);
  }

  async unlock(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.facade.unlock(this.passphrase());
      this.passphrase.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Archivio locale non sbloccato.');
    } finally {
      this.busy.set(false);
    }
  }

  async delete(id: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.facade.delete(id);
    } catch {
      this.error.set('Snapshot non eliminato. Verifica che l’archivio sia sbloccato.');
    } finally {
      this.busy.set(false);
    }
  }

  async deleteAll(): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !window.confirm(
        this.locale.text(
          'Eliminare in modo permanente tutti gli snapshot e i dati cifrati da questo browser?',
          'Permanently delete all snapshots and encrypted data from this browser?',
        ),
      )
    ) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.facade.clear();
    } catch {
      this.error.set('Cancellazione IndexedDB non riuscita.');
    } finally {
      this.busy.set(false);
    }
  }
}
