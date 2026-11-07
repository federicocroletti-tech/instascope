import { Injectable, signal } from '@angular/core';
import { createVaultSalt, decryptPayload, encryptPayload, EncryptedPayload } from './vault-crypto';

@Injectable({ providedIn: 'root' })
export class VaultService {
  private readonly salt = signal<string | null>(null);
  private readonly unlocked = signal(false);
  private currentPassphrase: string | null = null;

  readonly isUnlocked = this.unlocked.asReadonly();

  async initialize(passphrase: string): Promise<EncryptedPayload> {
    if (passphrase.length < 12) {
      throw new Error('La passphrase deve contenere almeno 12 caratteri.');
    }

    const salt = await createVaultSalt();
    const verifier = await encryptPayload({ check: 'instascope-vault' }, passphrase, salt);
    this.salt.set(verifier.salt);
    this.unlocked.set(true);
    this.currentPassphrase = passphrase;
    return verifier;
  }

  async unlock(passphrase: string, verifier: EncryptedPayload): Promise<void> {
    const result = await decryptPayload<{ check?: string }>(verifier, passphrase);
    if (result.check !== 'instascope-vault') {
      throw new Error('Passphrase non valida.');
    }

    this.currentPassphrase = passphrase;
    this.salt.set(verifier.salt);
    this.unlocked.set(true);
  }

  lock(): void {
    this.currentPassphrase = null;
    this.salt.set(null);
    this.unlocked.set(false);
  }

  async encrypt(value: unknown): Promise<EncryptedPayload> {
    const salt = this.salt();
    if (!salt || !this.unlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }

    return encryptPayload(value, this.passphraseRequired(), salt);
  }

  async decrypt<T>(value: EncryptedPayload): Promise<T> {
    if (!this.unlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }

    return decryptPayload<T>(value, this.passphraseRequired());
  }

  private passphraseRequired(): string {
    const passphrase = this.currentPassphrase;
    if (!passphrase) {
      throw new Error('La sessione dell’archivio è bloccata.');
    }
    return passphrase;
  }
}
