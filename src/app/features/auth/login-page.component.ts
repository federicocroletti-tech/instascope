import { Component, effect, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, MatButtonModule],
  template: `
    <section class="page login-page">
      <header class="page-heading">
        <p class="eyebrow">
          {{ locale.text('Area privata · noindex', 'Private workspace · noindex') }}
        </p>
        <h1>{{ locale.text('Accesso', 'Sign in') }}</h1>
        <p class="lead">
          {{
            locale.text(
              'L’autenticazione controlla l’accesso all’interfaccia; gli export restano nel browser.',
              'Authentication controls access to the interface; archives stay in your browser.'
            )
          }}
        </p>
      </header>

      @if (!auth.isConfigured) {
        <p class="status-message" role="status">
          {{
            locale.text(
              'Autenticazione non configurata. L’area privata resta chiusa. NON DISPONIBILE: progetto Supabase e policy owner.',
              'Authentication is not configured. The private workspace remains closed. UNAVAILABLE: Supabase project and owner policies.'
            )
          }}
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
            [(ngModel)]="email"
          />
          <label for="password">{{ locale.text('Password', 'Password') }}</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            [(ngModel)]="password"
          />
          @if (error()) {
            <p role="alert" class="error-message">{{ error() }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="busy()">
            {{ locale.text('Accedi', 'Sign in') }}
          </button>
        </form>
      }

      <aside class="card limitation">
        <h2>{{ locale.text('Limite di autorizzazione', 'Authorization boundary') }}</h2>
        <p>
          {{
            locale.text(
              'La route guard è un controllo dell’interfaccia, non un confine di sicurezza server-side. Senza backend/RLS owner verificato, l’area privata rimane disabilitata. IndexedDB è accessibile dal profilo browser locale.',
              'The route guard protects the interface, not the server. Without a verified owner backend/RLS policy, the private workspace remains disabled. IndexedDB is accessible to the local browser profile.'
            )
          }}
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
  readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const title = inject(Title);
    const meta = inject(Meta);

    effect(() =>
      title.setTitle(
        this.locale.text(
          'Accesso area privata — InstaScope',
          'Private workspace sign in — InstaScope',
        ),
      ),
    );
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow, noarchive' });
  }

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.signIn(this.email(), this.password());
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const destination =
        returnUrl?.startsWith('/app/') && !returnUrl.startsWith('//')
          ? returnUrl
          : '/app/dashboard';
      if (!(await this.auth.isOwner())) {
        this.error.set(
          this.locale.text(
            'Accesso negato: è richiesto il ruolo owner verificato.',
            'Access denied: a verified owner role is required.',
          ),
        );
        return;
      }
      await this.router.navigateByUrl(destination);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Accesso non riuscito.');
    } finally {
      this.password.set('');
      this.busy.set(false);
    }
  }
}
