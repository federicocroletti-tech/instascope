import { Component, computed, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ArchiveParserService } from '../../core/import/archive-parser.service';
import { applyImportMode } from '../../core/import/import-strategy';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import {
  DATASET_KEYS,
  ImportMode,
  ImportReport,
  ParsedArchive,
} from '../../shared/models/snapshot.model';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-import-page',
  imports: [MatButtonModule, DatePipe, RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">
          {{
            demo
              ? locale.text('Procedura illustrativa', 'Walkthrough')
              : localMode
                ? locale.text('Analisi locale · senza account', 'Local analysis · no account')
                : locale.text('Area privata', 'Private workspace')
          }}
        </p>
        <h1>
          {{
            locale.text('Importa un archivio dati Instagram', 'Import an Instagram data archive')
          }}
        </h1>
        <p class="lead">
          {{
            locale.text(
              'Il parser funziona nel browser. Nessun file viene caricato o trasmesso a servizi esterni.',
              'Parsing runs in your browser. Files are never uploaded or sent to external services.'
            )
          }}
        </p>
      </header>
      <a class="quiet-button" routerLink="/guida-export">
        {{
          locale.text(
            'Guida export completa: file e sezioni',
            'Full export guide: files and features'
          )
        }}
      </a>

      <section class="source-picker" aria-labelledby="source-picker-title">
        <h2 id="source-picker-title">
          {{ locale.text('Scegli come recuperare i dati', 'Choose how to get your data') }}
        </h2>
        <div class="source-options">
          <article class="source-option source-option--available">
            <p class="source-status">{{ locale.text('Disponibile', 'Available') }}</p>
            <h3>
              {{ locale.text('Carica un archivio Instagram', 'Upload an Instagram archive') }}
            </h3>
            <p>
              {{
                locale.text(
                  'La scelta consigliata per confrontare follower nel tempo e individuare chi non ti segue più. Ti servono almeno due esportazioni.',
                  'Recommended for comparing followers over time and finding accounts no longer following you. You need at least two exports.'
                )
              }}
            </p>
            @if (!demo) {
              <a class="source-action" href="#file-title">
                {{ locale.text('Scegli ZIP o JSON', 'Choose ZIP or JSON') }}
              </a>
            } @else {
              <p class="source-action source-action--disabled">
                {{
                  locale.text(
                    'Caricamento disattivato nella demo',
                    'Uploads are disabled in the demo'
                  )
                }}
              </p>
            }
          </article>
          <article class="source-option source-option--unavailable">
            <p class="source-status">{{ locale.text('Non disponibile', 'Unavailable') }}</p>
            <h3>
              {{ locale.text('Accedi con Instagram (Meta)', 'Connect with Instagram (Meta)') }}
            </h3>
            <p>
              {{
                locale.text(
                  'Non è ancora integrato. Le API ufficiali richiedono un account professionale e non forniscono la lista dei follower o degli unfollower. Per questa analisi usa l’archivio.',
                  'Not integrated yet. Official APIs require a professional account and do not provide follower or unfollower lists. Use an archive for this analysis.'
                )
              }}
            </p>
            <button type="button" class="source-action" disabled>
              {{ locale.text('Accesso API non disponibile', 'API sign-in unavailable') }}
            </button>
            <p class="source-footnote">
              {{
                locale.text(
                  'Non inserire qui la password Instagram. Un eventuale accesso futuro avverrà solo tramite Meta.',
                  'Do not enter your Instagram password here. Any future sign-in will happen through Meta.'
                )
              }}
            </p>
          </article>
        </div>
      </section>

      @if (demo) {
        <p class="status-message" role="status">
          {{
            locale.text(
              'Demo pubblica: il caricamento è disattivato. Esempio sintetico:',
              'Public demo: uploads are disabled. Sample data:'
            )
          }}
          {{ demoSnapshotCount }} follower, {{ demoRequestCount }} richieste pendenti.
        </p>
        <ol class="steps">
          <li>
            {{
              locale.text(
                'Seleziona localmente il file archivio sorgente dati Instagram scaricato da Meta (ZIP o JSON supportato).',
                'Select the Instagram data source archive downloaded from Meta (ZIP or supported JSON) locally.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Verifica i dataset e i record che saranno importati.',
                'Review the datasets and records that would be imported.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Scegli se tenere lo snapshot solo in memoria o salvarlo cifrato in IndexedDB.',
                'Choose whether to keep the snapshot in memory only or encrypt it in IndexedDB.'
              )
            }}
          </li>
        </ol>
      } @else {
        @if (localMode) {
          <p class="status-message" role="status">
            {{
              locale.text(
                'Non serve accedere: ZIP e risultati restano in questo browser. Importa due archivi in date diverse, poi apri Unfollow.',
                'No sign-in needed: archives and results stay in this browser. Import two archives from different dates, then open Unfollow.'
              )
            }}
          </p>
          <details class="export-guide">
            <summary>
              {{
                locale.text(
                  'Come scarico l’archivio follower da Instagram?',
                  'How do I download my follower archive from Instagram?'
                )
              }}
            </summary>
            <ol>
              <li>
                {{
                  locale.text(
                    'Apri Instagram e vai su Profilo → menu → Centro gestione account.',
                    'Open Instagram and go to Profile → menu → Accounts Center.'
                  )
                }}
              </li>
              <li>
                {{
                  locale.text(
                    'Apri Le tue informazioni e autorizzazioni → Esporta le tue informazioni e crea un’esportazione sul dispositivo.',
                    'Open Your information and permissions → Export your information and create an export to your device.'
                  )
                }}
              </li>
              <li>
                {{
                  locale.text(
                    'Seleziona il profilo Instagram, scegli il periodo completo e il formato JSON. Includi almeno Follower e following.',
                    'Select your Instagram profile, choose the full date range and JSON format. Include at least Followers and following.'
                  )
                }}
              </li>
              <li>
                {{
                  locale.text(
                    'Scarica lo ZIP quando Meta ti avvisa. Per gli unfollower, importa qui due esportazioni create in momenti diversi.',
                    'Download the ZIP when Meta notifies you. To find possible unfollows, import two exports created at different times.'
                  )
                }}
              </li>
            </ol>
            <a
              href="https://help.instagram.com/181231772500920"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{
                locale.text(
                  'Guida ufficiale Meta per accedere ai tuoi dati',
                  'Official Meta guide to accessing your data'
                )
              }}
            </a>
            <p>
              {{
                locale.text(
                  'Usa la stessa passphrase per salvare tutti gli snapshot. Dopo aver chiuso o ricaricato il browser, potrai sbloccarli dal Centro privacy.',
                  'Use the same passphrase to save all snapshots. After closing or reloading the browser, unlock them in the privacy center.'
                )
              }}
            </p>
          </details>
        }
        @if (!demo) {
          <ol
            class="import-workflow"
            [attr.aria-label]="
              locale.text('Fasi per analizzare l’archivio', 'Archive analysis steps')
            "
          >
            @for (step of workflowSteps; track step.number) {
              <li
                [class.import-workflow__current]="workflowStep() === step.number"
                [class.import-workflow__complete]="workflowStep() > step.number"
                [attr.aria-current]="workflowStep() === step.number ? 'step' : null"
              >
                <span class="import-workflow__number">{{ step.number }}</span>
                <span>{{ locale.text(step.it, step.en) }}</span>
              </li>
            }
          </ol>
          <p class="import-workflow__status" aria-live="polite">
            {{ locale.text('Passaggio', 'Step') }} {{ workflowStep() }}
            {{ locale.text('di', 'of') }}
            4:
            @switch (workflowStep()) {
              @case (1) {
                {{
                  locale.text('scegli l’archivio ZIP o JSON.', 'choose the ZIP or JSON archive.')
                }}
              }
              @case (2) {
                {{ locale.text('analizza il file selezionato.', 'analyze the selected file.') }}
              }
              @case (3) {
                {{
                  locale.text(
                    'controlla l’anteprima e scegli come conservarla.',
                    'review the preview and choose how to keep it.'
                  )
                }}
              }
              @case (4) {
                {{
                  locale.text(
                    'consulta i risultati o importa un secondo archivio per il confronto.',
                    'view results or import a second archive for comparison.'
                  )
                }}
              }
            }
          </p>
        }
        <section class="card import-card" aria-labelledby="file-title">
          <h2 id="file-title">
            {{
              locale.text(
                '1. Seleziona il file archivio sorgente dati Instagram',
                '1. Select the Instagram data source archive'
              )
            }}
          </h2>
          <p>
            {{
              locale.text(
                'ZIP o JSON, massimo 50 MB. Il tipo MIME dichiarato non è considerato attendibile.',
                'ZIP or JSON, up to 50 MB. The declared MIME type is not trusted.'
              )
            }}
          </p>
          <label for="archive-file">{{
            locale.text(
              'File archivio sorgente dati Instagram',
              'Instagram data source archive file'
            )
          }}</label>
          <input
            id="archive-file"
            type="file"
            accept=".zip,.json,application/zip,application/json"
            (change)="selectFile($event)"
          />
          <p class="muted">
            {{
              locale.text(
                "L'analisi avviene in un Web Worker con limiti di entry e dimensione decompressed.",
                'Parsing runs in a Web Worker with entry-count and decompressed-size limits.'
              )
            }}
          </p>
          <button
            mat-flat-button
            type="button"
            [disabled]="!selectedFile() || busy()"
            (click)="parse()"
          >
            {{ locale.text('Analizza e mostra anteprima', 'Analyze and preview') }}
          </button>
          @if (localMode) {
            <a class="quiet-button" routerLink="/local/unfollow">
              {{ locale.text('Apri il confronto Unfollow', 'Open the Unfollow comparison') }}
            </a>
          }
        </section>

        @if (busy()) {
          <p class="status-message" role="status" aria-live="polite">
            {{ locale.text('Analisi locale in corso…', 'Analyzing locally…') }}
          </p>
        }

        @if (error()) {
          <p class="error-message" role="alert">{{ error() }}</p>
        }

        @if (preview(); as archive) {
          <section class="card preview-card" aria-labelledby="preview-title">
            <p class="eyebrow">{{ locale.text('2. Anteprima', '2. Preview') }}</p>
            <h2 id="preview-title">
              {{ locale.text('Riepilogo prima del salvataggio', 'Review before saving') }}
            </h2>
            <p>
              {{ locale.text('SHA-256 calcolato localmente:', 'SHA-256 calculated locally:') }}
              <code>{{ archive.sourceHash }}</code>
            </p>
            <p>
              {{ locale.text('Data import:', 'Imported:') }}
              {{ archive.importedAt | date: 'medium' : '' : locale.locale() }} ·
              {{ locale.text('Record non validi:', 'Invalid records:') }}
              {{ archive.invalidRecords }} ·
              {{ locale.text('Duplicati nel file:', 'Duplicates in file:') }}
              {{ archive.duplicateRecords }}
            </p>
            <dl class="dataset-list">
              @for (dataset of datasetCounts(); track dataset.name) {
                <div>
                  <dt>{{ dataset.label }}</dt>
                  <dd>
                    {{ dataset.count }}
                    <small>{{ dataset.detail }}</small>
                  </dd>
                </div>
              }
            </dl>
            <label for="import-mode">{{
              locale.text('Modalità di importazione', 'Import mode')
            }}</label>
            <select id="import-mode" [value]="importMode()" (change)="setImportMode($event)">
              <option value="replace">
                {{ locale.text('Sostituisci i dati correnti', 'Replace current data') }}
              </option>
              <option value="integrate-new">
                {{ locale.text('Integra solo i nuovi', 'Add new records only') }}
              </option>
              <option value="merge-update">
                {{ locale.text('Unisci e aggiorna', 'Merge and update') }}
              </option>
            </select>
            <details class="mode-help">
              <summary>
                {{ locale.text('Confronta le modalità di importazione', 'Compare import modes') }}
              </summary>
              <ul class="mode-descriptions">
                <li>
                  <strong>{{ locale.text('Sostituisci:', 'Replace:') }}</strong>
                  {{
                    locale.text(
                      'imposta i dati correnti sulle sole categorie dell’archivio (quelle assenti vengono rimosse dalla vista corrente); gli snapshot storici restano invariati.',
                      'replaces current data with categories found in the archive (missing categories are removed from the current view); historical snapshots remain unchanged.'
                    )
                  }}
                </li>
                <li>
                  <strong>{{ locale.text('Integra solo i nuovi:', 'Add new only:') }}</strong>
                  {{
                    locale.text(
                      'aggiunge i profili non ancora presenti e conserva i dati già esistenti in caso di conflitto.',
                      'adds profiles that are not present and keeps existing data when conflicts occur.'
                    )
                  }}
                </li>
                <li>
                  <strong>{{ locale.text('Unisci e aggiorna:', 'Merge and update:') }}</strong>
                  {{
                    locale.text(
                      'aggiunge i nuovi profili e aggiorna quelli esistenti usando lo username senza distinzione tra maiuscole e minuscole.',
                      'adds new profiles and updates existing ones using case-insensitive usernames.'
                    )
                  }}
                </li>
              </ul>
            </details>
            @if (importPlan(); as plan) {
              @if (!facade.localUnlocked()) {
                <p class="status-message">
                  {{
                    locale.text(
                      'Sblocca prima l’archivio per calcolare l’anteprima rispetto ai dati correnti (incluso il numero di profili che verranno sostituiti). Gli snapshot originali dell’archivio resteranno comunque conservati.',
                      'Unlock the archive first to preview changes against current data, including the number of profiles to be replaced. Original archive snapshots will be preserved.'
                    )
                  }}
                </p>
              } @else {
                <dl
                  class="dataset-list"
                  [attr.aria-label]="
                    locale.text('Effetto previsto dell’importazione', 'Expected import changes')
                  "
                >
                  <div>
                    <dt>{{ locale.text('Profili aggiunti', 'Profiles added') }}</dt>
                    <dd>{{ plan.recordsAdded }}</dd>
                  </div>
                  <div>
                    <dt>{{ locale.text('Profili aggiornati', 'Profiles updated') }}</dt>
                    <dd>{{ plan.recordsUpdated }}</dd>
                  </div>
                  <div>
                    <dt>
                      {{
                        locale.text(
                          'Profili ignorati per conflitto',
                          'Profiles skipped due to conflicts'
                        )
                      }}
                    </dt>
                    <dd>{{ plan.recordsIgnored }}</dd>
                  </div>
                  @if (importMode() === 'replace') {
                    <div>
                      <dt>
                        {{
                          locale.text('Profili correnti sostituiti', 'Current profiles replaced')
                        }}
                      </dt>
                      <dd>{{ plan.recordsReplaced }}</dd>
                    </div>
                  }
                </dl>
              }
            }
            @for (warning of archive.warnings; track warning) {
              <p class="status-message">{{ warning }}</p>
            }
            @if ((archive.unrecognizedFiles ?? 0) > 0) {
              <p class="status-message">
                {{ locale.text('File JSON non riconosciuti:', 'Unrecognized JSON files:') }}
                {{ archive.unrecognizedFiles }}.
              </p>
            }
            <p class="status-message">{{ persistenceMessage() }}</p>

            <div class="action-grid">
              <button
                mat-stroked-button
                type="button"
                [disabled]="busy() || !canApplyMode()"
                (click)="keepInMemory()"
              >
                {{ locale.text('Importa solo in memoria', 'Keep in memory only') }}
              </button>
            </div>

            <fieldset>
              <legend>
                {{
                  locale.text(
                    '3. Salvataggio locale cifrato (facoltativo)',
                    '3. Optional encrypted local storage'
                  )
                }}
              </legend>
              <p>
                {{
                  locale.text(
                    'La passphrase non viene salvata. Se la dimentichi, gli snapshot cifrati non sono recuperabili.',
                    'The passphrase is never stored. If you forget it, encrypted snapshots cannot be recovered.'
                  )
                }}
              </p>
              <label for="vault-passphrase">{{
                locale.text(
                  'Passphrase (minimo 12 caratteri)',
                  'Passphrase (at least 12 characters)'
                )
              }}</label>
              <input
                id="vault-passphrase"
                type="password"
                minlength="12"
                autocomplete="new-password"
                [value]="passphrase()"
                (input)="setPassphrase($event)"
              />
              @if (importMode() === 'replace') {
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="confirmReplacement()"
                    (change)="setConfirmReplacement($event)"
                  />
                  {{
                    locale.text(
                      'Confermo la sostituzione dei dati correnti; gli snapshot storici non verranno modificati',
                      'I confirm replacing current data; historical snapshots will not be changed'
                    )
                  }}
                </label>
              }
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [checked]="allowDuplicate()"
                  (change)="setAllowDuplicate($event)"
                />
                {{
                  locale.text(
                    'Consenti esplicitamente un duplicato dello stesso archivio',
                    'Explicitly allow a duplicate of the same archive'
                  )
                }}
              </label>
              <button
                mat-flat-button
                type="button"
                [disabled]="busy() || passphrase().length < 12 || !canApplyMode()"
                (click)="saveLocally()"
              >
                {{
                  locale.text(
                    'Conferma importazione e salva in IndexedDB',
                    'Confirm import and save to IndexedDB'
                  )
                }}
              </button>
            </fieldset>
            @if (lastImportReport(); as report) {
              <p class="status-message" role="status">
                {{ locale.text('Import completato:', 'Import complete:') }}
                {{ report.recordsAdded }} {{ locale.text('aggiunti', 'added') }} ·
                {{ report.recordsUpdated }} {{ locale.text('aggiornati', 'updated') }} ·
                {{ report.recordsIgnored }} {{ locale.text('ignorati', 'skipped') }} ·
                {{ report.recordsReplaced }} {{ locale.text('sostituiti', 'replaced') }}.
                {{
                  locale.text(
                    'Lo snapshot originale è stato conservato.',
                    'The original snapshot was preserved.'
                  )
                }}
              </p>
            }
          </section>
        }

        @if (importComplete()) {
          <section class="next-step card" aria-labelledby="next-step-title">
            <p class="eyebrow">{{ locale.text('PASSO SUCCESSIVO', 'NEXT STEP') }}</p>
            <h2 id="next-step-title">
              {{ locale.text('Dati pronti per l’analisi', 'Your data is ready to explore') }}
            </h2>
            @if (facade.activeSnapshots().length < 2) {
              <p>
                {{
                  locale.text(
                    'Hai un solo snapshot: puoi già vedere il riepilogo. Per individuare possibili unfollower, importa un secondo archivio creato in un altro momento.',
                    'You have one snapshot: you can view its overview now. To find possible unfollows, import a second archive created at a different time.'
                  )
                }}
              </p>
            } @else {
              <p>
                {{
                  locale.text(
                    'Hai più snapshot disponibili. Apri il riepilogo oppure confronta le variazioni dei follower.',
                    'You have multiple snapshots. Open the overview or compare follower changes.'
                  )
                }}
              </p>
            }
            <div class="next-step__actions">
              <a
                class="primary-button"
                [routerLink]="localMode ? '/local/dashboard' : '/app/dashboard'"
              >
                {{ locale.text('Apri riepilogo', 'Open overview') }}
              </a>
              @if (facade.activeSnapshots().length >= 2) {
                <a
                  class="quiet-button"
                  [routerLink]="localMode ? '/local/unfollow' : '/app/unfollow'"
                >
                  {{ locale.text('Confronta follower', 'Compare followers') }}
                </a>
              }
              <a class="text-link" href="#file-title">
                {{
                  facade.activeSnapshots().length < 2
                    ? locale.text('Importa il secondo archivio', 'Import the second archive')
                    : locale.text('Importa un altro archivio', 'Import another archive')
                }}
              </a>
            </div>
          </section>
        }

        <section class="card unlock-card">
          <h2>
            {{
              locale.text('Sblocca snapshot locali esistenti', 'Unlock existing local snapshots')
            }}
          </h2>
          <label for="unlock-passphrase">{{
            locale.text('Passphrase dell’archivio', 'Archive passphrase')
          }}</label>
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
            {{ locale.text('Sblocca in questa sessione', 'Unlock for this session') }}
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
      .source-picker {
        margin-block: 1.5rem;
      }
      .source-picker > h2 {
        margin-block: 0 0.75rem;
      }
      .source-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
        gap: 1rem;
      }
      .source-option,
      .export-guide,
      .mode-help,
      fieldset {
        border: 1px solid var(--color-line);
        border-radius: 0.5rem;
      }
      .source-option,
      .export-guide,
      .mode-help {
        background: var(--color-background-soft);
      }
      .source-option {
        display: grid;
        align-content: start;
        justify-items: start;
        gap: 0.65rem;
        padding: 1.25rem;
        border-radius: 0.6rem;
      }
      .source-option--available {
        border-color: var(--color-accent);
      }
      .source-option--unavailable {
        opacity: 0.88;
      }
      .source-option h3,
      .source-option p {
        margin: 0;
      }
      .source-option h3 {
        font-size: 1rem;
      }
      .source-option > p:not(.source-status):not(.source-footnote) {
        color: var(--color-muted);
        line-height: 1.55;
      }
      .source-status {
        margin: 0;
        color: var(--color-accent-strong);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .source-option--unavailable .source-status {
        color: var(--color-muted);
      }
      .source-action {
        display: inline-flex;
        align-items: center;
        min-height: 2.5rem;
        margin-top: 0.25rem;
        border: 0;
        border-radius: 0.4rem;
        padding: 0.6rem 0.9rem;
        background: var(--color-accent);
        color: var(--color-on-accent);
        font: inherit;
        font-weight: 700;
        text-decoration: none;
      }
      button.source-action:disabled,
      .source-action--disabled {
        cursor: not-allowed;
        background: var(--color-background-soft);
        color: var(--color-muted);
      }
      .source-footnote {
        color: var(--color-muted);
        font-size: 0.8rem;
        line-height: 1.5;
      }
      .export-guide {
        width: 100%;
        padding: 1rem;
      }
      .export-guide summary {
        cursor: pointer;
        font-weight: 700;
      }
      .export-guide ol {
        display: grid;
        gap: 0.5rem;
        padding-inline-start: 1.4rem;
      }
      .export-guide p {
        color: var(--color-muted);
      }
      .import-card,
      .preview-card,
      .unlock-card {
        display: grid;
        justify-items: start;
        gap: 1rem;
        margin-block: 1rem;
      }
      input[type='file'],
      input[type='password'],
      select {
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
        text-align: end;
      }
      .dataset-list small {
        display: block;
        font-size: 0.75rem;
        font-weight: 400;
      }
      .mode-descriptions {
        display: grid;
        gap: 0.5rem;
        padding-inline-start: 1.25rem;
      }
      .mode-help {
        width: min(100%, 36rem);
        padding: 0.75rem 1rem;
      }
      .mode-help summary {
        cursor: pointer;
        font-weight: 650;
      }
      .mode-help .mode-descriptions {
        margin-block-end: 0;
        color: var(--color-muted);
        line-height: 1.5;
      }
      fieldset {
        display: grid;
        width: 100%;
        justify-items: start;
        gap: 1rem;
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
      .import-workflow {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.5rem;
        margin: 1.25rem 0 0;
        padding: 0;
        list-style: none;
      }
      .import-workflow li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
        color: var(--color-muted);
        font-size: 0.82rem;
        font-weight: 650;
      }
      .import-workflow__number {
        display: grid;
        flex: 0 0 1.75rem;
        width: 1.75rem;
        height: 1.75rem;
        place-items: center;
        border: 1px solid var(--color-line);
        border-radius: 50%;
        font-size: 0.75rem;
      }
      .import-workflow__current {
        color: var(--color-primary-strong) !important;
      }
      .import-workflow__current .import-workflow__number {
        border-color: var(--color-accent);
        background: var(--color-accent);
        color: var(--color-background);
      }
      .import-workflow__complete .import-workflow__number {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
      .import-workflow__status {
        margin: 0.5rem 0 1rem;
        color: var(--color-muted);
        font-size: 0.9rem;
      }
      .next-step {
        margin-block: 1rem;
      }
      .next-step h2,
      .next-step p {
        margin-block: 0.25rem 0.75rem;
      }
      .next-step p:not(.eyebrow) {
        color: var(--color-muted);
        line-height: 1.55;
      }
      .next-step__actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
      }
      code {
        overflow-wrap: anywhere;
      }
      @media (max-width: 520px) {
        .import-workflow {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class ImportPageComponent {
  private readonly parser = inject(ArchiveParserService);
  readonly facade = inject(SnapshotFacade);
  readonly locale = inject(LocaleService);

  readonly demo: boolean;
  readonly localMode: boolean;
  readonly selectedFile = signal<File | null>(null);
  readonly preview = signal<ParsedArchive | null>(null);
  readonly importComplete = signal(false);
  readonly workflowStep = computed(() => {
    if (this.importComplete()) return 4;
    if (this.preview()) return 3;
    if (this.selectedFile()) return 2;
    return 1;
  });
  readonly workflowSteps = [
    { number: 1, it: 'Archivio', en: 'Archive' },
    { number: 2, it: 'Analisi', en: 'Analyze' },
    { number: 3, it: 'Verifica e salva', en: 'Review and save' },
    { number: 4, it: 'Risultati', en: 'Results' },
  ] as const;
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly passphrase = signal('');
  readonly unlockPassphrase = signal('');
  readonly allowDuplicate = signal(false);
  readonly confirmReplacement = signal(false);
  readonly importMode = signal<ImportMode>('replace');
  readonly lastImportReport = signal<ImportReport | null>(null);
  readonly persistenceMessage = signal(
    this.locale.text(
      'In memoria: il riepilogo non è ancora stato salvato.',
      'In memory: this preview has not been saved.',
    ),
  );
  readonly demoSnapshotCount = DEMO_SNAPSHOTS[0].datasets.followers?.length ?? 0;
  readonly demoRequestCount = DEMO_SNAPSHOTS[0].datasets.pendingRequests?.length ?? 0;
  readonly datasetCounts = computed(() => {
    const datasets = this.preview()?.datasets;
    const detection = this.preview()?.categoryDetection;
    return [
      {
        name: 'followers',
        label: this.locale.text('Follower', 'Followers'),
        count: datasets?.followers?.length ?? this.locale.text('Non disponibile', 'Unavailable'),
        detail: this.categoryDetail('followers', detection),
      },
      {
        name: 'following',
        label: 'Following',
        count: datasets?.following?.length ?? this.locale.text('Non disponibile', 'Unavailable'),
        detail: this.categoryDetail('following', detection),
      },
      {
        name: 'pendingRequests',
        label: this.locale.text('Richieste pendenti', 'Pending requests'),
        count:
          datasets?.pendingRequests?.length ?? this.locale.text('Non disponibile', 'Unavailable'),
        detail: this.categoryDetail('pendingRequests', detection),
      },
      {
        name: 'recentlyUnfollowed',
        label: this.locale.text('Unfollow recenti', 'Recent unfollows'),
        count:
          datasets?.recentlyUnfollowed?.length ??
          this.locale.text('Non disponibile', 'Unavailable'),
        detail: this.categoryDetail('recentlyUnfollowed', detection),
      },
      {
        name: 'closeFriends',
        label: 'Close friends',
        count: datasets?.closeFriends?.length ?? this.locale.text('Non disponibile', 'Unavailable'),
        detail: this.categoryDetail('closeFriends', detection),
      },
    ];
  });
  readonly importPlan = computed(() => {
    const archive = this.preview();
    return archive
      ? applyImportMode(
          this.facade.currentSnapshot()?.datasets ?? null,
          archive.datasets,
          this.importMode(),
        )
      : null;
  });

  constructor() {
    const route = inject(ActivatedRoute);

    this.demo = route.snapshot.data['demo'] === true;
    this.localMode = route.snapshot.data['local'] === true;
  }

  selectFile(event: Event): void {
    this.selectedFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.preview.set(null);
    this.importComplete.set(false);
    this.lastImportReport.set(null);
    this.error.set(null);
  }

  async parse(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.lastImportReport.set(null);
    try {
      this.preview.set(await this.parser.parse(file));
      this.persistenceMessage.set(
        this.locale.text(
          'Il riepilogo è in memoria. Scegli se non salvarlo o cifrarlo localmente.',
          'The preview is in memory. Choose whether to keep it there or encrypt it locally.',
        ),
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
    if (!archive || !this.canApplyMode()) {
      return;
    }
    this.facade.previewInMemory(archive, this.importMode());
    this.importComplete.set(true);
    this.persistenceMessage.set(
      this.locale.text(
        'Snapshot solo in memoria; chiudendo la pagina verrà perso.',
        'Snapshot is in memory only and will be lost when this page closes.',
      ),
    );
  }

  async saveLocally(): Promise<void> {
    const archive = this.preview();
    if (!archive || !this.canApplyMode()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const report = await this.facade.save(
        archive,
        this.passphrase(),
        this.allowDuplicate(),
        this.importMode(),
      );
      this.lastImportReport.set(report);
      this.persistenceMessage.set(
        this.locale.text(
          'Snapshot salvato cifrato in IndexedDB su questo browser.',
          'Snapshot saved encrypted in this browser’s IndexedDB.',
        ),
      );
      this.passphrase.set('');
      this.allowDuplicate.set(false);
      this.confirmReplacement.set(false);
      this.importComplete.set(true);
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
      this.importComplete.set(true);
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

  setConfirmReplacement(event: Event): void {
    this.confirmReplacement.set((event.target as HTMLInputElement).checked);
  }

  setImportMode(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'replace' || value === 'integrate-new' || value === 'merge-update') {
      this.importMode.set(value);
      this.confirmReplacement.set(false);
      this.lastImportReport.set(null);
      const archive = this.preview();
      if (archive && this.facade.inMemorySnapshot()) {
        this.facade.previewInMemory(archive, value);
      }
    }
  }

  canApplyMode(): boolean {
    return this.importMode() !== 'replace' || this.confirmReplacement();
  }

  private categoryDetail(
    key: (typeof DATASET_KEYS)[number],
    detection: ParsedArchive['categoryDetection'],
  ): string {
    const category = detection?.[key];
    if (!category || category.filesFound === 0) {
      return this.locale.text('Categoria assente', 'Category absent');
    }
    return this.locale.locale() === 'it-IT'
      ? `${category.filesFound} file · ${category.validRecords} validi · ${category.invalidRecords} non validi`
      : `${category.filesFound} files · ${category.validRecords} valid · ${category.invalidRecords} invalid`;
  }
}
