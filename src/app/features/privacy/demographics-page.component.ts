import { Component } from '@angular/core';

@Component({
  selector: 'app-demographics-page',
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">Analisi responsabile</p>
        <h1>Informazioni demografiche</h1>
      </header>
      <article class="card">
        <p>
          Queste informazioni non sono disponibili nell’esportazione utilizzata e non vengono
          inferite automaticamente.
        </p>
        <p>
          InstaScope non deduce genere, sesso, città, età, etnia, orientamento, religione, salute o
          opinioni politiche.
        </p>
      </article>
    </section>
  `,
})
export class DemographicsPageComponent {}
