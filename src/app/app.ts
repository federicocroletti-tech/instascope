import { Component, HostListener, signal, computed, DOCUMENT, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SnapshotFacade } from './core/state/snapshot.facade';
import { Meta } from '@angular/platform-browser';

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

  readonly menuOpen = signal(false);
  readonly commandOpen = signal(false);
  readonly commandQuery = signal('');
  readonly isLight = signal(false);
  readonly isDemo = signal(false);

  private readonly commands = [
    { path: '/', label: 'Panoramica' },
    { path: '/demo', label: 'Dashboard demo' },
    { path: '/login', label: 'Accesso area privata' },
    { path: '/demo/import', label: 'Procedura import demo' },
    { path: '/demo/pending-requests', label: 'Richieste demo' },
    { path: '/demo/relationships', label: 'Relazioni demo' },
    { path: '/demo/recent', label: 'Ultimi aggiunti demo' },
    { path: '/demo/recommendations', label: 'Suggerimenti demo' },
    { path: '/demo/insights', label: 'Limiti e consigli demo' },
    { path: '/demo/privacy', label: 'Privacy demo' },
    { path: '/demo/demographics', label: 'Informazioni demografiche demo' },
    { path: '/demo/settings', label: 'Impostazioni demo' },
    { path: '/app/imports', label: 'Importazioni' },
    { path: '/app/pending-requests', label: 'Richieste pendenti' },
    { path: '/app/relationships', label: 'Relazioni' },
    { path: '/app/recent', label: 'Ultimi aggiunti' },
    { path: '/app/recommendations', label: 'Suggerimenti' },
    { path: '/app/insights', label: 'Limiti e consigli' },
    { path: '/app/privacy', label: 'Centro privacy' },
    { path: '/app/demographics', label: 'Informazioni demografiche' },
    { path: '/app/settings', label: 'Impostazioni' },
  ];
  readonly filteredCommands = computed(() => {
    const query = this.commandQuery().trim().toLocaleLowerCase();
    return this.commands.filter((item) => item.label.toLocaleLowerCase().includes(query));
  });

  constructor() {
    this.isDemo.set(this.router.url.startsWith('/demo'));
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isDemo.set(event.urlAfterRedirects.startsWith('/demo'));
        this.menuOpen.set(false);
        const isPrivate =
          event.urlAfterRedirects.startsWith('/app') ||
          event.urlAfterRedirects.startsWith('/login');
        this.meta.updateTag({
          name: 'robots',
          content: isPrivate ? 'noindex, nofollow, noarchive' : 'index, follow',
        });
        if (isPrivate) {
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
