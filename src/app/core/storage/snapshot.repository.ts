import Dexie, { Table } from 'dexie';
import { Injectable, inject } from '@angular/core';
import {
  ParsedArchive,
  Snapshot,
  SnapshotEnvelope,
  VaultMetadata,
} from '../../shared/models/snapshot.model';
import { VaultService } from '../crypto/vault.service';

class InstaScopeDatabase extends Dexie {
  snapshots!: Table<SnapshotEnvelope, string>;
  vault!: Table<VaultMetadata, string>;

  constructor() {
    super('instascope-local-v1');
    this.version(1).stores({
      snapshots: 'id, createdAt',
      vault: 'id',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class SnapshotRepository {
  private readonly vault = inject(VaultService);

  private readonly db = new InstaScopeDatabase();

  async initialize(passphrase: string): Promise<void> {
    const metadata = await this.db.vault.get('vault');
    if (metadata) {
      await this.vault.unlock(passphrase, {
        salt: metadata.salt,
        iv: metadata.verifierIv,
        ciphertext: metadata.verifierCiphertext,
      });
      return;
    }

    const verifier = await this.vault.initialize(passphrase);
    try {
      await this.db.vault.put({
        id: 'vault',
        version: 1,
        salt: verifier.salt,
        verifierIv: verifier.iv,
        verifierCiphertext: verifier.ciphertext,
      });
    } catch (error) {
      this.vault.lock();
      throw error;
    }
  }

  async unlock(passphrase: string): Promise<void> {
    const metadata = await this.db.vault.get('vault');
    if (!metadata) {
      throw new Error('Archivio locale non inizializzato.');
    }
    await this.vault.unlock(passphrase, {
      salt: metadata.salt,
      iv: metadata.verifierIv,
      ciphertext: metadata.verifierCiphertext,
    });
  }

  lock(): void {
    this.vault.lock();
  }

  async save(
    archive: ParsedArchive,
    allowDuplicate = false,
  ): Promise<{ id: string; duplicate: boolean }> {
    if (!this.vault.isUnlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }
    const existing = await this.db.snapshots.toArray();
    const duplicate = await this.findDuplicate(existing, archive.sourceHash);
    if (duplicate && !allowDuplicate) {
      throw new Error(
        'Questo archivio è già presente. Conferma esplicitamente il duplicato per salvarlo.',
      );
    }

    const metadata = await this.db.vault.get('vault');
    if (!metadata) {
      throw new Error('Archivio locale non inizializzato.');
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const encrypted = await this.vault.encrypt({ ...archive, id, createdAt });
    await this.db.snapshots.add({ id, createdAt, version: 1, ...encrypted });
    return { id, duplicate };
  }

  async all(): Promise<Snapshot[]> {
    if (!this.vault.isUnlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }
    const records = await this.db.snapshots.orderBy('createdAt').toArray();
    const snapshots = await Promise.all(
      records.map(async (record) =>
        this.vault.decrypt<Snapshot>({
          salt: record.salt,
          iv: record.iv,
          ciphertext: record.ciphertext,
        }),
      ),
    );
    return snapshots.reverse();
  }

  async delete(id: string): Promise<void> {
    if (!this.vault.isUnlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }
    await this.db.snapshots.delete(id);
  }

  async clear(): Promise<void> {
    await this.db.transaction('rw', this.db.snapshots, this.db.vault, async () => {
      await this.db.snapshots.clear();
      await this.db.vault.clear();
    });
    this.lock();
  }

  private async findDuplicate(records: SnapshotEnvelope[], sourceHash: string): Promise<boolean> {
    for (const record of records) {
      const snapshot = await this.vault.decrypt<Snapshot>({
        salt: record.salt,
        iv: record.iv,
        ciphertext: record.ciphertext,
      });
      if (snapshot.sourceHash === sourceHash) {
        return true;
      }
    }
    return false;
  }
}
