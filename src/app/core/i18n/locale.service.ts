import { DOCUMENT, isPlatformBrowser, registerLocaleData } from '@angular/common';
import { afterNextRender, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import localeIt from '@angular/common/locales/it';

registerLocaleData(localeIt, 'it-IT');

export type AppLocale = 'it-IT' | 'en-US';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly locale = signal<AppLocale>('it-IT');

  constructor() {
    if (this.browser) {
      afterNextRender(() => this.restoreLocale());
    }
    this.document.documentElement.lang = this.locale().slice(0, 2);
  }

  text(italian: string, english: string): string {
    return this.locale() === 'it-IT' ? italian : english;
  }

  setLocale(locale: AppLocale): void {
    this.locale.set(locale);
    this.document.documentElement.lang = locale.slice(0, 2);
    if (this.browser) {
      try {
        localStorage.setItem('instascope-locale', locale);
      } catch (error) {
        console.warn('Could not persist the selected language preference.', error);
      }
    }
  }

  private restoreLocale(): void {
    try {
      const saved = localStorage.getItem('instascope-locale');
      if (saved === 'it-IT' || saved === 'en-US') {
        this.locale.set(saved);
        this.document.documentElement.lang = saved.slice(0, 2);
      }
    } catch (error) {
      console.warn('Could not read the saved language preference.', error);
    }
  }
}
