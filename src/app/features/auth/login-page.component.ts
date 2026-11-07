import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, MatButtonModule],
  template: `
    <section class="page login-page">
      <header class="page-heading">
        <p class="eyebrow">Area privata · noindex</p>
        <h1>Accesso</h1>
        <p class="lead">
          L’autenticazione controlla l’accesso all’interfaccia; gli export restano nel browser.
        </p>
      </header>

      @if (!auth.isConfigured) {
        <p class="status-message" role="status">
          Autenticazione non configurata. L’area privata resta chiusa. NON DISPONIBILE: progetto
          Supabase e policy owner.
        </p>
      } @else {
        <form class="card login-form" (ngSubmit)="submit()">
          <label for="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="username"
            required
            [ngModel]="email"
            (ngModelChange)="email = $event"
          />
          <label for="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            [ngModel]="password"
            (ngModelChange)="password = $event"
          />
          @if (error()) {
            <p role="alert" class="error-message">{{ error() }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="busy()">Accedi</button>
        </form>
      }

      <aside class="card limitation">
        <h2>Limite di autorizzazione</h2>
        <p>
          La route guard è un controllo dell’interfaccia, non un confine di sicurezza server-side.
          Senza backend/RLS owner verificato, l’area privata rimane disabilitata. IndexedDB è
          accessibile dal profilo browser locale.
        </p>
      </aside>
    </section>
  `,
  styles: [
    `
      .login-page {
        max-width: 48rem;
      }
      .login-form {
        display: grid;
        justify-items: start;
        gap: 0.8rem;
      }
      input {
        width: min(100%, 28rem);
        min-height: 2.75rem;
        border: 1px solid var(--color-line);
        border-radius: 0.4rem;
        background: var(--color-background-soft);
        padding-inline: 0.7rem;
      }
      .limitation {
        margin-top: 1.5rem;
      }
      .limitation h2 {
        font-family: inherit;
        font-size: 1.15rem;
      }
      .error-message {
        color: var(--color-primary-strong);
      }
    `,
  ],
})
export class LoginPageComponent {
  readonly auth = inject(SupabaseAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);

    title.setTitle('Accesso area privata — InstaScope');
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow, noarchive' });
  }

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.signIn(this.email, this.password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const destination =
        returnUrl?.startsWith('/app/') && !returnUrl.startsWith('//')
          ? returnUrl
          : '/app/dashboard';
      if (!(await this.auth.isOwner())) {
        this.error.set('Accesso negato: è richiesto il ruolo owner verificato.');
        return;
      }
      await this.router.navigateByUrl(destination);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Accesso non riuscito.');
    } finally {
      this.password = '';
      this.busy.set(false);
    }
  }
}
