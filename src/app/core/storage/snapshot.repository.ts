import Dexie, { Table } from 'dexie';
import { Injectable, inject } from '@angular/core';
import {
  ImportMode,
  ImportReport,
  ParsedArchive,
  Snapshot,
  SnapshotEnvelope,
  VaultMetadata,
} from '../../shared/models/snapshot.model';
import { VaultService } from '../crypto/vault.service';
import { applyImportMode } from '../import/import-strategy';

class InstaScopeDatabase extends Dexie {
  snapshots!: Table<SnapshotEnvelope, string>;
  currentState!: Table<SnapshotEnvelope, string>;
  vault!: Table<VaultMetadata, string>;

  constructor() {
    super('instascope-local-v1');
    this.version(1).stores({
      snapshots: 'id, createdAt',
      vault: 'id',
    });
    this.version(2).stores({
      snapshots: 'id, createdAt',
      currentState: 'id, createdAt',
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
      await this.ensureCurrentState();
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
      await this.ensureCurrentState();
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
    await this.ensureCurrentState();
  }

  lock(): void {
    this.vault.lock();
  }

  async save(
    archive: ParsedArchive,
    allowDuplicate = false,
  ): Promise<{ id: string; duplicate: boolean }> {
    const report = await this.importArchive(archive, 'replace', allowDuplicate);
    return { id: report.id, duplicate: report.duplicateArchive };
  }

  async importArchive(
    archive: ParsedArchive,
    mode: ImportMode,
    allowDuplicate = false,
  ): Promise<ImportReport> {
    if (!this.vault.isUnlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }
    const records = await this.db.snapshots.toArray();
    const duplicate = await this.findDuplicate(records, archive.sourceHash);
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
    const existing = await this.currentSnapshot();
    const result = applyImportMode(existing?.datasets ?? null, archive.datasets, mode);
    const sourceSnapshot: Snapshot = { ...archive, id, createdAt };
    const currentSnapshot: Snapshot = { ...sourceSnapshot, datasets: result.datasets };
    const [encryptedSource, encryptedCurrent] = await Promise.all([
      this.vault.encrypt(sourceSnapshot),
      this.vault.encrypt(currentSnapshot),
    ]);

    await this.db.transaction('rw', this.db.snapshots, this.db.currentState, async () => {
      await this.db.snapshots.add({
        id,
        createdAt,
        version: 1,
        ...encryptedSource,
      });
      await this.db.currentState.put({
        id,
        createdAt,
        version: 1,
        ...encryptedCurrent,
      });
    });
    return {
      id,
      mode,
      ...result,
      duplicateArchive: duplicate,
    };
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

  async currentSnapshot(): Promise<Snapshot | null> {
    if (!this.vault.isUnlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }
    const record = await this.db.currentState.orderBy('createdAt').last();
    if (!record) {
      return null;
    }
    return this.vault.decrypt<Snapshot>({
      salt: record.salt,
      iv: record.iv,
      ciphertext: record.ciphertext,
    });
  }

  async delete(id: string): Promise<void> {
    if (!this.vault.isUnlocked()) {
      throw new Error('Sblocca prima l’archivio locale.');
    }
    await this.db.transaction('rw', this.db.snapshots, this.db.currentState, async () => {
      await this.db.snapshots.delete(id);
      await this.db.currentState.delete(id);
    });
  }

  async clear(): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.snapshots,
      this.db.currentState,
      this.db.vault,
      async () => {
        await this.db.snapshots.clear();
        await this.db.currentState.clear();
        await this.db.vault.clear();
      },
    );
    this.lock();
  }

  private async ensureCurrentState(): Promise<void> {
    await this.db.transaction('rw', this.db.snapshots, this.db.currentState, async () => {
      const snapshots = await this.db.snapshots.toArray();
      for (const snapshot of snapshots) {
        const existing = await this.db.currentState.get(snapshot.id);
        if (!existing) {
          await this.db.currentState.put(snapshot);
        }
      }
    });
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
