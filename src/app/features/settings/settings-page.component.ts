import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink],
  template: `
    <section class="page">
      <header class="page-heading">
        <p class="eyebrow">Preferenze locali</p>
        <h1>Impostazioni</h1>
        <p class="lead">
          Il selettore del tema e gli intervalli del grafico sono preferenze dell’interfaccia, non
          dati Instagram.
        </p>
      </header>
      <article class="card">
        <h2>Sessione e archivio</h2>
        <p>
          Per bloccare la chiave in memoria e terminare la sessione, esegui il logout o chiudi la
          pagina.
        </p>
        <a routerLink="/app/privacy">Apri il centro privacy e la gestione snapshot</a>
      </article>
    </section>
  `,
  styles: [
    `
      .card h2 {
        font-family: inherit;
        font-size: 1.15rem;
      }
    `,
  ],
})
export class SettingsPageComponent {}
