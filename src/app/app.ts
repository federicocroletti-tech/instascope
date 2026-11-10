import { Component, HostListener, signal, computed, DOCUMENT, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SnapshotFacade } from './core/state/snapshot.facade';
import { Meta } from '@angular/platform-browser';
import { AppLocale, LocaleService } from './core/i18n/locale.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly snapshots = inject(SnapshotFacade);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly meta = inject(Meta);
  readonly locale = inject(LocaleService);

  readonly menuOpen = signal(false);
  readonly commandOpen = signal(false);
  readonly commandQuery = signal('');
  readonly isLight = signal(false);
  readonly isDemo = signal(false);
  readonly isLocal = signal(false);
  readonly isWorkspace = signal(false);
  readonly navigationSections = computed(() => {
    const text = this.locale.text.bind(this.locale);
    if (this.isLocal()) {
      return [
        {
          label: text('PERCORSO', 'WORKFLOW'),
          items: [
            { path: '/guida-export', label: text('Guida export', 'Export guide'), exact: false },
            {
              path: '/local/import',
              label: text('Importa archivio', 'Import archive'),
              exact: false,
            },
            { path: '/local/dashboard', label: text('Riepilogo', 'Overview'), exact: true },
          ],
        },
        {
          label: text('RISULTATI', 'RESULTS'),
          items: [
            {
              path: '/local/unfollow',
              label: text('Confronto follower', 'Follower comparison'),
              exact: false,
            },
            {
              path: '/local/pending-requests',
              label: text('Richieste pendenti', 'Pending requests'),
              exact: false,
            },
            {
              path: '/local/relationships',
              label: text('Relazioni', 'Relationships'),
              exact: false,
            },
            {
              path: '/local/recent',
              label: text('Ultimi aggiunti', 'Recently added'),
              exact: false,
            },
            {
              path: '/local/recommendations',
              label: text('Suggerimenti', 'Suggestions'),
              exact: false,
            },
            {
              path: '/local/insights',
              label: text('Limiti e consigli', 'Limits and tips'),
              exact: false,
            },
          ],
        },
        {
          label: text('GESTIONE', 'MANAGE'),
          items: [
            {
              path: '/local/privacy',
              label: text('Dati e privacy', 'Data and privacy'),
              exact: false,
            },
          ],
        },
      ];
    }

    const base = this.isDemo() ? '/demo' : '/app';
    return [
      {
        label: text('PERCORSO', 'WORKFLOW'),
        items: [
          {
            path: this.isDemo() ? base : `${base}/dashboard`,
            label: text('Riepilogo', 'Overview'),
            exact: true,
          },
          {
            path: this.isDemo() ? `${base}/import` : `${base}/imports`,
            label: text('Importa archivio', 'Import archive'),
            exact: false,
          },
        ],
      },
      {
        label: text('RISULTATI', 'RESULTS'),
        items: [
          {
            path: `${base}/unfollow`,
            label: text('Confronto follower', 'Follower comparison'),
            exact: false,
          },
          {
            path: `${base}/pending-requests`,
            label: text('Richieste in sospeso', 'Pending requests'),
            exact: false,
          },
          {
            path: `${base}/recommendations`,
            label: text('Suggeriti', 'Suggestions'),
            exact: false,
          },
          {
            path: `${base}/relationships`,
            label: text('Relazioni', 'Relationships'),
            exact: false,
          },
          {
            path: `${base}/recent`,
            label: text('Ultimi aggiunti', 'Recently added'),
            exact: false,
          },
        ],
      },
      {
        label: text('GESTIONE', 'MANAGE'),
        items: [
          { path: `${base}/settings`, label: text('Impostazioni', 'Settings'), exact: false },
        ],
      },
    ];
  });
  readonly importPath = computed(() =>
    this.isDemo() ? '/demo/import' : this.isLocal() ? '/local/import' : '/app/imports',
  );

  private readonly commands = [
    { path: '/guida-export', it: 'Guida export', en: 'Export guide' },
    {
      path: '/local/pending-requests',
      it: 'Richieste pendenti locali',
      en: 'Local pending requests',
    },
    { path: '/local/relationships', it: 'Relazioni locali', en: 'Local relationships' },
    { path: '/local/recent', it: 'Ultimi aggiunti locali', en: 'Local recently added' },
    { path: '/local/recommendations', it: 'Suggerimenti locali', en: 'Local suggestions' },
    { path: '/local/insights', it: 'Limiti e consigli locali', en: 'Local limits and tips' },
    { path: '/', it: 'Panoramica', en: 'Overview' },
    { path: '/demo', it: 'Dashboard demo', en: 'Demo dashboard' },
    { path: '/login', it: 'Accesso area privata', en: 'Private workspace sign in' },
    { path: '/local/import', it: 'Importa senza account', en: 'Import without an account' },
    { path: '/local/dashboard', it: 'Riepilogo locale', en: 'Local dashboard' },
    { path: '/local/unfollow', it: 'Unfollow locali', en: 'Local unfollows' },
    { path: '/local/privacy', it: 'Centro privacy locale', en: 'Local privacy center' },
    { path: '/demo/import', it: 'Procedura import demo', en: 'Demo import walkthrough' },
    { path: '/demo/unfollow', it: 'Unfollow demo', en: 'Demo unfollows' },
    { path: '/demo/pending-requests', it: 'Richieste demo', en: 'Demo requests' },
    { path: '/demo/relationships', it: 'Relazioni demo', en: 'Demo relationships' },
    { path: '/demo/recent', it: 'Ultimi aggiunti demo', en: 'Demo recently added' },
    { path: '/demo/recommendations', it: 'Suggerimenti demo', en: 'Demo suggestions' },
    { path: '/demo/insights', it: 'Limiti e consigli demo', en: 'Demo limits and tips' },
    { path: '/demo/privacy', it: 'Privacy demo', en: 'Demo privacy' },
    {
      path: '/demo/demographics',
      it: 'Informazioni demografiche demo',
      en: 'Demo demographic information',
    },
    { path: '/demo/settings', it: 'Impostazioni demo', en: 'Demo settings' },
    { path: '/app/imports', it: 'Importazioni', en: 'Imports' },
    { path: '/app/unfollow', it: 'Unfollow', en: 'Unfollow' },
    { path: '/app/pending-requests', it: 'Richieste pendenti', en: 'Pending requests' },
    { path: '/app/relationships', it: 'Relazioni', en: 'Relationships' },
    { path: '/app/recent', it: 'Ultimi aggiunti', en: 'Recently added' },
    { path: '/app/recommendations', it: 'Suggerimenti', en: 'Suggestions' },
    { path: '/app/insights', it: 'Limiti e consigli', en: 'Limits and tips' },
    { path: '/app/privacy', it: 'Centro privacy', en: 'Privacy center' },
    { path: '/app/demographics', it: 'Informazioni demografiche', en: 'Demographic information' },
    { path: '/app/settings', it: 'Impostazioni', en: 'Settings' },
  ];
  readonly filteredCommands = computed(() => {
    const query = this.commandQuery().trim().toLocaleLowerCase();
    const locale = this.locale.locale();
    return this.commands
      .map((item) => ({ path: item.path, label: locale === 'it-IT' ? item.it : item.en }))
      .filter((item) => item.label.toLocaleLowerCase(locale).includes(query));
  });

  constructor() {
    this.isDemo.set(this.router.url.startsWith('/demo'));
    this.isLocal.set(this.router.url.startsWith('/local'));
    this.isWorkspace.set(
      this.router.url.startsWith('/demo') ||
        this.router.url.startsWith('/app') ||
        this.router.url.startsWith('/local'),
    );
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isDemo.set(event.urlAfterRedirects.startsWith('/demo'));
        this.isLocal.set(event.urlAfterRedirects.startsWith('/local'));
        this.isWorkspace.set(
          event.urlAfterRedirects.startsWith('/demo') ||
            event.urlAfterRedirects.startsWith('/app') ||
            event.urlAfterRedirects.startsWith('/local'),
        );
        this.menuOpen.set(false);
        const isNonPublic =
          event.urlAfterRedirects.startsWith('/app') ||
          event.urlAfterRedirects.startsWith('/local') ||
          event.urlAfterRedirects.startsWith('/login');
        this.meta.updateTag({
          name: 'robots',
          content: isNonPublic ? 'noindex, nofollow, noarchive' : 'index, follow',
        });
        if (isNonPublic) {
          this.document.head.querySelector('link[rel="canonical"]')?.remove();
        }
      });
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.snapshots.lock(), { once: true });
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  toggleTheme(): void {
    this.isLight.update((light) => !light);
    this.document.documentElement.dataset['theme'] = this.isLight() ? 'light' : 'dark';
  }

  setLocale(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'it-IT' || value === 'en-US') {
      this.locale.setLocale(value satisfies AppLocale);
    }
  }

  openCommandPalette(): void {
    this.commandOpen.set(true);
    this.commandQuery.set('');
  }

  closeCommandPalette(): void {
    this.commandOpen.set(false);
  }

  setCommandQuery(event: Event): void {
    this.commandQuery.set((event.target as HTMLInputElement).value);
  }

  @HostListener('document:keydown', ['$event'])
  handleShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openCommandPalette();
    } else if (event.key === 'Escape') {
      this.closeCommandPalette();
    }
  }
}
