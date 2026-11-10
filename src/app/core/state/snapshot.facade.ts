import { Injectable, computed, signal, inject } from '@angular/core';
import {
  ImportMode,
  ImportReport,
  ParsedArchive,
  Snapshot,
} from '../../shared/models/snapshot.model';
import { SnapshotRepository } from '../storage/snapshot.repository';
import { applyImportMode } from '../import/import-strategy';

@Injectable({ providedIn: 'root' })
export class SnapshotFacade {
  private readonly repository = inject(SnapshotRepository);
  private inMemoryBase: Snapshot | null = null;
  private inMemorySourceHash: string | null = null;

  readonly snapshots = signal<Snapshot[]>([]);
  readonly currentSnapshot = signal<Snapshot | null>(null);
  readonly inMemorySnapshot = signal<Snapshot | null>(null);
  readonly activeSnapshots = computed(() => {
    const inMemory = this.inMemorySnapshot();
    const current = this.currentSnapshot();
    const historical = this.snapshots().filter((snapshot) => snapshot.id !== current?.id);
    if (inMemory) {
      return [inMemory, ...historical];
    }
    return current ? [current, ...historical] : this.snapshots();
  });
  readonly persistence = signal<'memory' | 'local'>('memory');
  readonly localUnlocked = signal(false);
  readonly message = signal<string | null>(null);

  previewInMemory(archive: ParsedArchive, mode: ImportMode = 'replace'): Snapshot {
    if (this.inMemorySourceHash !== archive.sourceHash) {
      this.inMemoryBase = this.inMemorySnapshot() ?? this.currentSnapshot();
      this.inMemorySourceHash = archive.sourceHash;
    }
    const result = applyImportMode(
      this.inMemoryBase?.datasets ?? this.currentSnapshot()?.datasets ?? null,
      archive.datasets,
      mode,
    );
    const snapshot: Snapshot = {
      ...archive,
      datasets: result.datasets,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.inMemorySnapshot.set(snapshot);
    this.persistence.set('memory');
    this.message.set('Snapshot disponibile solo in memoria. Non è stato salvato.');
    return snapshot;
  }

  async save(
    archive: ParsedArchive,
    passphrase: string,
    allowDuplicate: boolean,
    mode: ImportMode,
  ): Promise<ImportReport> {
    await this.repository.initialize(passphrase);
    const report = await this.repository.importArchive(archive, mode, allowDuplicate);
    this.inMemorySnapshot.set(null);
    this.inMemoryBase = null;
    this.inMemorySourceHash = null;
    this.persistence.set('local');
    this.localUnlocked.set(true);
    await this.reload();
    this.message.set('Snapshot cifrato salvato solo in IndexedDB su questo browser.');
    return report;
  }

  async unlock(passphrase: string): Promise<void> {
    await this.repository.unlock(passphrase);
    this.persistence.set('local');
    this.localUnlocked.set(true);
    await this.reload();
    this.message.set('Archivio locale sbloccato in questa sessione del browser.');
  }

  async reload(): Promise<void> {
    const [snapshots, current] = await Promise.all([
      this.repository.all(),
      this.repository.currentSnapshot(),
    ]);
    this.snapshots.set(snapshots);
    this.currentSnapshot.set(current);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    await this.reload();
  }

  async clear(): Promise<void> {
    await this.repository.clear();
    this.snapshots.set([]);
    this.currentSnapshot.set(null);
    this.inMemorySnapshot.set(null);
    this.inMemoryBase = null;
    this.inMemorySourceHash = null;
    this.persistence.set('memory');
    this.localUnlocked.set(false);
    this.message.set('Archivio locale cancellato.');
  }

  lock(): void {
    this.repository.lock();
    this.snapshots.set([]);
    this.currentSnapshot.set(null);
    this.persistence.set('memory');
    this.localUnlocked.set(false);
    this.message.set(
      'Archivio bloccato; la chiave e la passphrase non sono conservate nel browser.',
    );
  }
}
