import { Component, computed, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ArchiveParserService } from '../../core/import/archive-parser.service';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { ParsedArchive } from '../../shared/models/snapshot.model';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';

@Component({
  selector: 'app-import-page',
  imports: [MatButtonModule],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">
          {{ demo ? 'Procedura illustrativa' : local ? 'Importazione locale' : 'Area privata' }}
        </p>
        <h1>Importa un export</h1>
        <p class="lead">
          Il parser funziona nel browser. Nessun file viene caricato o trasmesso a servizi esterni.
        </p>
      </header>

      @if (local) {
        <p class="status-message" role="note">
          Area locale senza account: seleziona il tuo file qui. Il file non viene inviato ai server
          di InstaScope; l'anteprima resta in memoria finché non scegli se salvarla cifrata nel
          browser.
        </p>
      }

      @if (demo) {
        <p class="status-message" role="status">
          Demo pubblica: l'upload è disattivato. Esempio sintetico:
          {{ demoSnapshotCount }} follower, {{ demoRequestCount }} richieste pendenti.
        </p>
        <ol class="steps">
          <li>Seleziona localmente un archivio ZIP originale o un JSON supportato.</li>
          <li>Verifica i dataset e i record che saranno importati.</li>
          <li>Scegli se tenere lo snapshot solo in memoria o salvarlo cifrato in IndexedDB.</li>
        </ol>
      } @else {
        <section class="card import-card" aria-labelledby="file-title">
          <h2 id="file-title">1. Seleziona un file</h2>
          <p>ZIP o JSON, massimo 50 MB. Il tipo MIME dichiarato non è considerato attendibile.</p>
          <label for="archive-file">Archivio Instagram</label>
          <input
            id="archive-file"
            type="file"
            accept=".zip,.json,application/zip,application/json"
            (change)="selectFile($event)"
          />
          <p class="muted">
            L'analisi avviene in un Web Worker con limiti di entry e dimensione decompressed.
          </p>
          <button
            mat-flat-button
            type="button"
            [disabled]="!selectedFile() || busy()"
            (click)="parse()"
          >
            Analizza e mostra anteprima
          </button>
        </section>

        @if (busy()) {
          <p class="status-message" role="status" aria-live="polite">Analisi locale in corso…</p>
        }

        @if (error()) {
          <p class="error-message" role="alert">{{ error() }}</p>
        }

        @if (preview(); as archive) {
          <section class="card preview-card" aria-labelledby="preview-title">
            <p class="eyebrow">2. Anteprima</p>
            <h2 id="preview-title">Riepilogo prima del salvataggio</h2>
            <p>
              SHA-256 calcolato localmente: <code>{{ archive.sourceHash }}</code>
            </p>
            <p>
              Data import: {{ archive.importedAt }} · Record non validi:
              {{ archive.invalidRecords }} · Duplicati nel file: {{ archive.duplicateRecords }}
            </p>
            <dl class="dataset-list">
              @for (dataset of datasetCounts(); track dataset.name) {
                <div>
                  <dt>{{ dataset.label }}</dt>
                  <dd>{{ dataset.count }}</dd>
                </div>
              }
            </dl>
            @for (warning of archive.warnings; track warning) {
              <p class="status-message">{{ warning }}</p>
            }
            <p class="status-message">{{ persistenceMessage() }}</p>

            <div class="action-grid">
              <button mat-stroked-button type="button" (click)="keepInMemory()">
                Importa solo in memoria
              </button>
            </div>

            <fieldset>
              <legend>3. Salvataggio locale cifrato (facoltativo)</legend>
              <p>
                La passphrase non viene salvata. Se la dimentichi, gli snapshot cifrati non sono
                recuperabili.
              </p>
              <label for="vault-passphrase">Passphrase (minimo 12 caratteri)</label>
              <input
                id="vault-passphrase"
                type="password"
                minlength="12"
                autocomplete="new-password"
                [value]="passphrase()"
                (input)="setPassphrase($event)"
              />
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [checked]="allowDuplicate()"
                  (change)="setAllowDuplicate($event)"
                />
                Consenti esplicitamente un duplicato dello stesso archivio
              </label>
              <button
                mat-flat-button
                type="button"
                [disabled]="busy() || passphrase().length < 12"
                (click)="saveLocally()"
              >
                Conferma e salva in IndexedDB
              </button>
            </fieldset>
          </section>
        }

        <section class="card unlock-card">
          <h2>Sblocca snapshot locali esistenti</h2>
          <label for="unlock-passphrase">Passphrase dell'archivio</label>
          <input
            id="unlock-passphrase"
            type="password"
            autocomplete="current-password"
            [value]="unlockPassphrase()"
            (input)="setUnlockPassphrase($event)"
          />
          <button
            mat-stroked-button
            type="button"
            [disabled]="busy() || unlockPassphrase().length < 12"
            (click)="unlock()"
          >
            Sblocca in questa sessione
          </button>
        </section>
      }

      @if (facade.message(); as message) {
        <p class="status-message" role="status">{{ message }}</p>
      }
    </section>
  `,
  styles: [
    `
      .import-card,
      .preview-card,
      .unlock-card {
        display: grid;
        justify-items: start;
        gap: 1rem;
        margin-block: 1rem;
      }
      input[type='file'],
      input[type='password'] {
        width: min(100%, 34rem);
        min-height: 2.75rem;
        border: 1px solid var(--color-line);
        border-radius: 0.4rem;
        background: var(--color-background-soft);
        padding: 0.5rem;
      }
      .dataset-list {
        display: grid;
        width: min(100%, 36rem);
        gap: 0.35rem;
        margin: 0;
      }
      .dataset-list div {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 1px solid var(--color-line);
        padding: 0.5rem 0;
      }
      .dataset-list dd {
        margin: 0;
        font-weight: 800;
      }
      fieldset {
        display: grid;
        width: 100%;
        justify-items: start;
        gap: 1rem;
        border: 1px solid var(--color-line);
        border-radius: 0.5rem;
        padding: 1rem;
      }
      .checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .error-message {
        border-inline-start: 4px solid #a34a3a;
        background: var(--color-background-soft);
        padding: 0.75rem 1rem;
      }
      .steps {
        display: grid;
        gap: 0.75rem;
      }
      code {
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class ImportPageComponent {
  private readonly parser = inject(ArchiveParserService);
  readonly facade = inject(SnapshotFacade);

  readonly demo: boolean;
  readonly local: boolean;
  readonly selectedFile = signal<File | null>(null);
  readonly preview = signal<ParsedArchive | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly passphrase = signal('');
  readonly unlockPassphrase = signal('');
  readonly allowDuplicate = signal(false);
  readonly persistenceMessage = signal('In memoria: il preview non è ancora persistito.');
  readonly demoSnapshotCount = DEMO_SNAPSHOTS[0].datasets.followers?.length ?? 0;
  readonly demoRequestCount = DEMO_SNAPSHOTS[0].datasets.pendingRequests?.length ?? 0;
  readonly datasetCounts = computed(() => {
    const datasets = this.preview()?.datasets;
    return [
      {
        name: 'followers',
        label: 'Follower',
        count: datasets?.followers?.length ?? 'Non disponibile',
      },
      {
        name: 'following',
        label: 'Following',
        count: datasets?.following?.length ?? 'Non disponibile',
      },
      {
        name: 'pendingRequests',
        label: 'Richieste pendenti',
        count: datasets?.pendingRequests?.length ?? 'Non disponibile',
      },
      {
        name: 'recentlyUnfollowed',
        label: 'Recently unfollowed',
        count: datasets?.recentlyUnfollowed?.length ?? 'Non disponibile',
      },
      {
        name: 'closeFriends',
        label: 'Close friends',
        count: datasets?.closeFriends?.length ?? 'Non disponibile',
      },
    ];
  });

  constructor() {
    const route = inject(ActivatedRoute);

    this.demo = route.snapshot.data['demo'] === true;
    this.local = route.snapshot.data['local'] === true;
  }

  selectFile(event: Event): void {
    this.selectedFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.preview.set(null);
    this.error.set(null);
  }

  async parse(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.preview.set(await this.parser.parse(file));
      this.persistenceMessage.set(
        'Il riepilogo è in memoria. Scegli se non salvarlo o cifrarlo localmente.',
      );
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Importazione non riuscita; nessun dato è stato salvato.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  keepInMemory(): void {
    const archive = this.preview();
    if (!archive) {
      return;
    }
    this.facade.previewInMemory(archive);
    this.persistenceMessage.set('Snapshot solo in memoria; chiudendo la pagina verrà perso.');
  }

  async saveLocally(): Promise<void> {
    const archive = this.preview();
    if (!archive) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.facade.save(archive, this.passphrase(), this.allowDuplicate());
      this.persistenceMessage.set('Snapshot salvato cifrato in IndexedDB su questo browser.');
      this.passphrase.set('');
      this.allowDuplicate.set(false);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Salvataggio locale non riuscito.');
    } finally {
      this.busy.set(false);
    }
  }

  async unlock(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.facade.unlock(this.unlockPassphrase());
      this.unlockPassphrase.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Archivio non sbloccato.');
    } finally {
      this.busy.set(false);
    }
  }

  setPassphrase(event: Event): void {
    this.passphrase.set((event.target as HTMLInputElement).value);
  }

  setUnlockPassphrase(event: Event): void {
    this.unlockPassphrase.set((event.target as HTMLInputElement).value);
  }

  setAllowDuplicate(event: Event): void {
    this.allowDuplicate.set((event.target as HTMLInputElement).checked);
  }
}
