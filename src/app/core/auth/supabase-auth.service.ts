import { Injectable, PLATFORM_ID, signal, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRuntimeConfig } from '../config/runtime-config';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly client: SupabaseClient | null;
  readonly error = signal<string | null>(null);
  readonly isConfigured: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    const config = getRuntimeConfig();
    this.isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

    if (isPlatformBrowser(platformId) && this.isConfigured) {
      this.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storage: window.sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } else {
      this.client = null;
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = this.client;
    if (!client) {
      throw new Error('Autenticazione non configurata. L’area privata resta chiusa.');
    }
    this.error.set(null);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      this.error.set('Accesso non riuscito. Verifica la configurazione e riprova.');
      throw new Error('Autenticazione non riuscita.');
    }
  }

  async isOwner(): Promise<boolean> {
    const client = this.client;
    if (!client) {
      return false;
    }
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      this.error.set('Sessione non valida o scaduta.');
      return false;
    }
    return data.user.app_metadata['role'] === 'owner';
  }

  async accessToken(): Promise<string | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.auth.getSession();
    return error ? null : (data.session?.access_token ?? null);
  }

  async signOut(): Promise<void> {
    const client = this.client;
    if (!client) {
      return;
    }
    const { error } = await client.auth.signOut();
    if (error) {
      throw new Error('Logout non riuscito.');
    }
  }
}
