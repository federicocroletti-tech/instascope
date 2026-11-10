import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-demographics-page',
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">{{ locale.text('Analisi responsabile', 'Responsible analysis') }}</p>
        <h1>{{ locale.text('Informazioni demografiche', 'Demographic information') }}</h1>
      </header>
      <article class="card">
        <p>
          {{
            locale.text(
              'Queste informazioni non sono disponibili nell’archivio utilizzato e non vengono inferite automaticamente.',
              'This information is not available in the archive and is not inferred automatically.'
            )
          }}
        </p>
        <p>
          {{
            locale.text(
              'InstaScope non deduce genere, sesso, città, età, etnia, orientamento, religione, salute o opinioni politiche.',
              'InstaScope does not infer gender, sex, city, age, ethnicity, orientation, religion, health, or political opinions.'
            )
          }}
        </p>
      </article>
    </section>
  `,
})
export class DemographicsPageComponent {
  readonly locale = inject(LocaleService);
}
