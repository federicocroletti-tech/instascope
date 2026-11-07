import { Component, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SnapshotFacade } from '../../core/state/snapshot.facade';

@Component({
  selector: 'app-privacy-page',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">{{ demo ? 'Demo sintetica' : 'Dati sul dispositivo' }}</p>
        <h1>Centro privacy</h1>
        <p class="lead">
          I file importati non vengono inviati a server. Solo gli snapshot che scegli di salvare
          restano in IndexedDB, cifrati.
        </p>
      </header>

      @if (demo) {
        <p class="status-message" role="status">
          La demo usa dataset sintetici e non persiste dati personali.
        </p>
        <a class="primary-button" routerLink="/demo">Torna alla dashboard demo</a>
      } @else {
        <section class="card unlock">
          <h2>Sblocca i tuoi snapshot</h2>
          <label for="privacy-passphrase">Passphrase locale</label>
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
            Sblocca
          </button>
          @if (error()) {
            <p role="alert">{{ error() }}</p>
          }
        </section>

        @if (facade.snapshots().length) {
          <section class="card snapshot-list">
            <h2>Snapshot salvati localmente</h2>
            <p>
              Stato:
              {{ facade.persistence() === 'local' ? 'cifrati in IndexedDB' : 'solo in memoria' }}.
            </p>
            <ul>
              @for (snapshot of facade.snapshots(); track snapshot.id) {
                <li>
                  <span
                    >{{ snapshot.createdAt | date: 'medium' }} ·
                    {{ snapshot.datasets.followers?.length ?? 'n/d' }} follower ·
                    {{ snapshot.datasets.following?.length ?? 'n/d' }} following</span
                  >
                  <button class="quiet-button" type="button" (click)="delete(snapshot.id)">
                    Elimina snapshot
                  </button>
                </li>
              }
            </ul>
            <button class="danger-button" type="button" [disabled]="busy()" (click)="deleteAll()">
              Elimina tutti i dati locali
            </button>
          </section>
        }

        <section class="card data-flow">
          <h2>Flusso dei dati</h2>
          <ul>
            <li>ZIP/JSON: browser → Web Worker → memoria del browser.</li>
            <li>
              Salvataggio facoltativo: payload AES-GCM in IndexedDB; chiave derivata dalla
              passphrase e mantenuta solo in memoria.
            </li>
            <li>
              Supabase Auth riceve i soli dati di autenticazione; il servizio non riceve archivi o
              record Instagram.
            </li>
            <li>
              Hosting Vercel può ricevere richieste HTTP standard e metadati tecnici; i file del
              browser non sono inclusi nelle richieste dell’app.
            </li>
            <li>Analytics non essenziali: non configurati.</li>
          </ul>
          <p>
            La cancellazione IndexedDB non elimina copie esportate dall'utente, backup del browser o
            file sorgente sul dispositivo.
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

  readonly demo: boolean;
  readonly passphrase = signal('');
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  constructor() {
    const route = inject(ActivatedRoute);

    this.demo = route.snapshot.data['demo'] === true;
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
        'Eliminare in modo permanente tutti gli snapshot e i dati cifrati da questo browser?',
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
