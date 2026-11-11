import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { Component, effect, inject, Injector, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { buildInsightSummary } from '../../core/analytics/insight-summary';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Snapshot } from '../../shared/models/snapshot.model';

@Component({
  selector: 'app-ai-insights',
  imports: [FormsModule, JsonPipe],
  template: `
    <section class="ai-insights" aria-labelledby="ai-title">
      <h2 id="ai-title">{{ locale.text('Domande sui tuoi dati', 'Questions about your data') }}</h2>
      @if (demo()) {
        <p>
          {{
            locale.text(
              'Anteprima locale su dati sintetici. Nessun modello AI viene contattato.',
              'Local preview with synthetic data. No AI model is contacted.'
            )
          }}
        </p>
        <button class="secondary-button" type="button" (click)="preview()">
          {{ locale.text('Mostra riepilogo di esempio', 'Show example summary') }}
        </button>
      } @else if (!cloudAllowed() || !enabled() || !authConfigured()) {
        <p role="status">
          {{
            locale.text(
              'AI non disponibile. Richiede configurazione server e accesso owner. I consigli locali restano disponibili.',
              'AI is unavailable. Server configuration and owner access are required. Local tips remain available.'
            )
          }}
        </p>
      } @else if (!summary()) {
        <p>
          {{
            locale.text(
              'Importa uno snapshot per fare domande sui dati.',
              'Import a snapshot to ask about your data.'
            )
          }}
        </p>
      } @else {
        <p>
          {{
            locale.text(
              'La domanda, i conteggi e le date qui sotto saranno inviati a OpenAI tramite il server. Nessun archivio o nome utente viene aggiunto automaticamente. Non inserire dati personali nella domanda.',
              'Your question and the counts and dates below will be sent to OpenAI through the server. No archive or username is added automatically. Do not enter personal data in your question.'
            )
          }}
        </p>
        <details>
          <summary>{{ locale.text('Dati da inviare', 'Data to send') }}</summary>
          <pre>{{ summary() | json }}</pre>
        </details>
        <form (ngSubmit)="ask()">
          <label for="ai-question">{{ locale.text('La tua domanda', 'Your question') }}</label>
          <textarea
            id="ai-question"
            name="question"
            maxlength="600"
            rows="3"
            required
            [(ngModel)]="question"
            [disabled]="busy()"
            [placeholder]="
              locale.text(
                'Cosa cambia tra gli ultimi due snapshot?',
                'What changed between the latest two snapshots?'
              )
            "
          ></textarea>
          <label class="consent" for="ai-consent">
            <input
              id="ai-consent"
              name="consent"
              type="checkbox"
              [(ngModel)]="consent"
              [disabled]="busy()"
            />
            {{
              locale.text(
                'Acconsento a inviare domanda, conteggi e date a OpenAI per questa analisi.',
                'I consent to send my question, counts and dates to OpenAI for this analysis.'
              )
            }}
          </label>
          <div class="actions">
            <button
              type="submit"
              class="primary-button"
              [disabled]="busy() || !consent || !question.trim()"
            >
              {{
                busy()
                  ? locale.text('Analisi in corso...', 'Analyzing...')
                  : locale.text('Chiedi all’AI', 'Ask AI')
              }}
            </button>
            @if (busy()) {
              <button type="button" class="secondary-button" (click)="cancel()">
                {{ locale.text('Annulla', 'Cancel') }}
              </button>
            }
          </div>
        </form>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (answer()) {
        <div class="answer" aria-live="polite">
          <h3>
            {{
              demo()
                ? locale.text('Esempio locale', 'Local example')
                : locale.text('Risposta AI', 'AI response')
            }}
          </h3>
          <p>{{ answer() }}</p>
          <button type="button" class="secondary-button" (click)="answer.set('')">
            {{ locale.text('Cancella risposta', 'Clear response') }}
          </button>
        </div>
      }
      <p class="limitation">
        {{
          locale.text(
            'Le risposte AI possono contenere errori: verifica i conteggi. Gli snapshot non dimostrano motivazioni, engagement o prestazioni dei contenuti. Le risposte non vengono salvate dall’app.',
            'AI responses may contain errors: verify the counts. Snapshots do not establish motives, engagement or content performance. Responses are not saved by the app.'
          )
        }}
      </p>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-top: 1.5rem;
      }
      .ai-insights {
        display: grid;
        gap: 1rem;
        padding-block: 1.5rem;
        border-block: 1px solid var(--color-line);
      }
      h2 {
        font-family: inherit;
        font-size: 1.25rem;
      }
      form {
        display: grid;
        gap: 0.75rem;
      }
      textarea {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        resize: vertical;
        font: inherit;
        padding: 0.75rem;
        color: inherit;
        background: var(--color-background-soft);
        border: 1px solid var(--color-line);
        border-radius: 6px;
      }
      .consent {
        display: flex;
        gap: 0.6rem;
        align-items: flex-start;
      }
      .consent input {
        flex: 0 0 auto;
        margin-top: 0.3rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      pre {
        max-width: 100%;
        overflow: auto;
        font-size: 0.85rem;
      }
      .answer p {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        margin-block: 0.75rem;
      }
      .limitation {
        font-size: 0.875rem;
      }
    `,
  ],
})
export class AiInsightsComponent implements OnInit {
  readonly snapshots = input.required<Snapshot[]>();
  readonly demo = input(false);
  readonly cloudAllowed = input(false);
  readonly locale = inject(LocaleService);
  private readonly injector = inject(Injector);
  private auth?: SupabaseAuthService;
  readonly authConfigured = signal(false);
  private readonly platform = inject(PLATFORM_ID);
  readonly summary = signal<ReturnType<typeof buildInsightSummary>>(null);
  readonly enabled = signal(false);
  readonly busy = signal(false);
  readonly answer = signal('');
  readonly error = signal('');
  question = '';
  consent = false;
  private controller?: AbortController;

  constructor() {
    effect((onCleanup) => {
      this.summary.set(buildInsightSummary(this.snapshots()));
      this.answer.set('');
      this.error.set('');
      this.consent = false;
      this.busy.set(false);
      onCleanup(() => this.controller?.abort());
    });
  }

  async ngOnInit() {
    if (!isPlatformBrowser(this.platform) || this.demo() || !this.cloudAllowed()) return;
    this.auth = this.injector.get(SupabaseAuthService);
    this.authConfigured.set(this.auth.isConfigured);
    if (!this.authConfigured()) return;
    try {
      const response = await fetch('/api/insights', { signal: AbortSignal.timeout(10_000) });
      if (response.ok) this.enabled.set((await response.json()).enabled === true);
    } catch {
      this.enabled.set(false);
    }
  }

  preview() {
    const summary = this.summary();
    if (!summary) return;
    this.answer.set(
      this.locale.text(
        `Snapshot: ${summary.currentDate.slice(0, 10)}. Follower: ${summary.followers ?? 'non disponibile'}. Nuovi ingressi: ${summary.newFollowers ?? 'non disponibile'}. Possibili uscite: ${summary.lostFollowers ?? 'non disponibile'}. Il confronto riguarda solo i punti importati e non spiega le cause delle variazioni.`,
        `Snapshot: ${summary.currentDate.slice(0, 10)}. Followers: ${summary.followers ?? 'unavailable'}. New entries: ${summary.newFollowers ?? 'unavailable'}. Possible exits: ${summary.lostFollowers ?? 'unavailable'}. This comparison covers imported snapshots only and does not explain the causes of changes.`,
      ),
    );
  }

  cancel() {
    this.controller?.abort();
    this.busy.set(false);
    this.consent = false;
  }

  async ask() {
    if (
      this.busy() ||
      !this.consent ||
      !this.question.trim() ||
      this.question.length > 600 ||
      !this.summary() ||
      this.demo() ||
      !this.cloudAllowed() ||
      !this.enabled()
    )
      return;
    const controller = new AbortController();
    this.controller = controller;
    this.busy.set(true);
    this.error.set('');
    this.answer.set('');
    try {
      const token = await this.auth?.accessToken();
      if (controller.signal.aborted) return;
      if (!token) throw new Error('auth');
      const response = await fetch('/api/insights', {
        method: 'POST',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(40_000)]),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          consent: true,
          language: this.locale.locale().startsWith('it') ? 'it' : 'en',
          question: this.question.trim(),
          summary: this.summary(),
        }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          this.error.set(
            this.locale.text(
              'Limite richieste raggiunto. Riprova più tardi.',
              'Request limit reached. Try again later.',
            ),
          );
          return;
        }
        throw new Error('request');
      }
      const data = await response.json();
      if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 6000)
        throw new Error('answer');
      if (!controller.signal.aborted) this.answer.set(data.answer);
    } catch {
      if (!controller.signal.aborted)
        this.error.set(
          this.locale.text(
            'Analisi non disponibile. Verifica accesso e configurazione o riprova più tardi.',
            'Analysis unavailable. Check access and configuration or try again later.',
          ),
        );
    } finally {
      if (this.controller === controller) {
        this.busy.set(false);
        this.consent = false;
      }
    }
  }
}
