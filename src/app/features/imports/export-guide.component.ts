import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-export-guide',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page guide">
      <header class="page-heading">
        <p class="eyebrow">{{ locale.text('GUIDA EXPORT', 'EXPORT GUIDE') }}</p>
        <h1>{{ locale.text('Esporta i tuoi dati Instagram', 'Export your Instagram data') }}</h1>
        <p class="lead">
          {{
            locale.text(
              'Scarica da Meta una copia dei tuoi dati e importa qui lo ZIP originale. Non servono password Instagram, scraping o caricamenti a un server InstaScope.',
              'Download a copy of your data from Meta and import the original ZIP here. No Instagram password, scraping, or archive uploads to InstaScope are needed.'
            )
          }}
        </p>
      </header>

      <section class="card">
        <h2>{{ locale.text('1. Richiedi la copia a Meta', '1. Request a copy from Meta') }}</h2>
        <ol>
          <li>
            {{
              locale.text(
                'Apri Instagram: Profilo → menu → Centro gestione account.',
                'Open Instagram: Profile → menu → Accounts Center.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Apri Le tue informazioni e autorizzazioni → Esporta le tue informazioni → Crea esportazione. Scegli il profilo Instagram corretto.',
                'Open Your information and permissions → Export your information → Create export. Choose the correct Instagram profile.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Scegli Esporta sul dispositivo e l’intervallo Tutto il periodo. Includi Follower e Following; aggiungi richieste pendenti e amici più stretti se disponibili.',
                'Choose Export to device and All time. Include Followers and Following; add pending requests and close friends if available.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Seleziona JSON. Foto e video non servono per questa analisi: puoi scegliere la qualità media più bassa.',
                'Select JSON. Photos and videos are not needed for this analysis: you can choose the lowest media quality.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Crea l’esportazione, attendi la notifica di Meta e scarica lo ZIP senza estrarlo.',
                'Create the export, wait for Meta’s notification, and download the ZIP without extracting it.'
              )
            }}
          </li>
        </ol>
        <a
          class="primary-button"
          href="https://accountscenter.instagram.com/info_and_permissions/dyi/"
          target="_blank"
          rel="noopener noreferrer"
          >{{ locale.text('Apri Centro gestione account', 'Open Accounts Center') }}</a
        >
        <p>
          {{ locale.text('Le voci possono cambiare. Consulta', 'Menu labels may vary. See') }}
          <a
            href="https://help.instagram.com/181231772500920"
            target="_blank"
            rel="noopener noreferrer"
            >{{ locale.text('la guida ufficiale Meta', 'Meta’s official guide') }}</a
          >.
        </p>
      </section>

      <section class="card">
        <h2>{{ locale.text('2. Quali file servono', '2. Which files are used') }}</h2>
        <p>
          {{ locale.text('Percorso tipico:', 'Typical path:') }}
          <code>connections/followers_and_following/</code>
        </p>
        <div class="table-scroll">
          <table>
            <caption>
              {{
                locale.text('File e funzioni disponibili', 'Files and available features')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ locale.text('File JSON', 'JSON file') }}</th>
                <th scope="col">{{ locale.text('Dove viene usato', 'Where it is used') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row"><code>followers_1.json</code>, <code>followers_2.json</code>…</th>
                <td>
                  {{
                    locale.text(
                      'Importa tutte le parti: riepilogo, relazioni e confronto Unfollow tra due archivi.',
                      'Import all parts: overview, relationships, and Unfollow comparison between two archives.'
                    )
                  }}
                </td>
              </tr>
              <tr>
                <th scope="row"><code>following.json</code></th>
                <td>
                  {{
                    locale.text(
                      'Following, relazioni e categorie “li seguo ancora / non li seguo più”.',
                      'Following, relationships, and “I still follow them / I no longer follow them” categories.'
                    )
                  }}
                </td>
              </tr>
              <tr>
                <th scope="row"><code>pending_follow_requests.json</code></th>
                <td>
                  {{
                    locale.text(
                      'Richieste pendenti, ricerca, ordinamento ed esportazione CSV.',
                      'Pending requests, search, sorting, and CSV export.'
                    )
                  }}
                </td>
              </tr>
              <tr>
                <th scope="row"><code>recently_unfollowed_profiles.json</code></th>
                <td>
                  {{
                    locale.text(
                      'Account che hai smesso di seguire secondo Meta, non chi ha smesso di seguire te.',
                      'Accounts you stopped following according to Meta, not accounts that stopped following you.'
                    )
                  }}
                </td>
              </tr>
              <tr>
                <th scope="row"><code>close_friends.json</code></th>
                <td>
                  {{
                    locale.text(
                      'Suggerimenti spiegabili basati sui dataset disponibili.',
                      'Explainable suggestions based on available datasets.'
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="status-message">
          {{
            locale.text(
              'Per Unfollow servono due esportazioni di momenti diversi con Follower presenti in entrambe e Following nell’ultima. Il risultato è una differenza tra elenchi, non la causa: username modificati e account disattivati possono influire.',
              'Unfollow needs two exports from different times, both with Followers and the latest with Following. Results show list differences, not their cause: renamed or deactivated accounts can affect them.'
            )
          }}
        </p>
      </section>

      <section class="card">
        <h2>
          {{ locale.text('3. Importa, verifica e analizza', '3. Import, review, and analyze') }}
        </h2>
        <ol>
          <li>
            {{
              locale.text(
                'Apri l’area locale e seleziona lo ZIP scaricato.',
                'Open the local workspace and select the downloaded ZIP.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Premi “Analizza e mostra anteprima” e verifica i dataset rilevati.',
                'Select “Analyze and preview” and review the detected datasets.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Usa solo in memoria oppure salva cifrato in IndexedDB con una passphrase di almeno 12 caratteri.',
                'Use in memory only or save encrypted in IndexedDB with a passphrase of at least 12 characters.'
              )
            }}
          </li>
          <li>
            {{
              locale.text(
                'Apri il riepilogo o importa un secondo archivio per confrontare i follower.',
                'Open the overview or import a second archive to compare followers.'
              )
            }}
          </li>
        </ol>
        <p>
          {{
            locale.text(
              'Non condividere archivio o link di download. I dati restano nel browser; una passphrase dimenticata non è recuperabile. La cifratura non protegge da chi controlla il dispositivo o il profilo del browser.',
              'Do not share the archive or download link. Data stays in your browser; a forgotten passphrase cannot be recovered. Encryption does not protect against someone who controls the device or browser profile.'
            )
          }}
        </p>
        <a class="primary-button" routerLink="/local/import">{{
          locale.text('Apri analisi locale', 'Open local analysis')
        }}</a>
      </section>
    </article>
  `,
  styles: `
    .guide {
      display: grid;
      gap: 1.5rem;
    }
    .card {
      display: grid;
      gap: 1rem;
    }
    ol {
      padding-inline-start: 1.5rem;
    }
    li {
      margin-block: 0.6rem;
    }
    .primary-button {
      justify-self: start;
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
      padding: 0.75rem;
      border-bottom: 1px solid var(--color-line);
      text-align: left;
    }
    code {
      overflow-wrap: anywhere;
    }
  `,
})
export class ExportGuideComponent {
  readonly locale = inject(LocaleService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    const previousTitle = this.title.getTitle();
    const previousDescription = this.meta.getTag('name="description"')?.content;
    inject(DestroyRef).onDestroy(() => {
      this.title.setTitle(previousTitle);
      if (previousDescription !== undefined) {
        this.meta.updateTag({ name: 'description', content: previousDescription });
      } else {
        this.meta.removeTag('name="description"');
      }
    });
    effect(() => {
      this.title.setTitle(
        this.locale.text(
          'Guida export Instagram — InstaScope',
          'Instagram export guide — InstaScope',
        ),
      );
      this.meta.updateTag({
        name: 'description',
        content: this.locale.text(
          'Guida per esportare i dati Instagram da Meta e importarli localmente in InstaScope.',
          'Learn how to export your Instagram data from Meta and import it locally into InstaScope.',
        ),
      });
    });
  }
}
