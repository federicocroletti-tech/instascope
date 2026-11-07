import { Injectable, computed, signal, inject } from '@angular/core';
import { ParsedArchive, Snapshot } from '../../shared/models/snapshot.model';
import { SnapshotRepository } from '../storage/snapshot.repository';

@Injectable({ providedIn: 'root' })
export class SnapshotFacade {
  private readonly repository = inject(SnapshotRepository);

  readonly snapshots = signal<Snapshot[]>([]);
  readonly inMemorySnapshot = signal<Snapshot | null>(null);
  readonly activeSnapshots = computed(() => {
    const inMemory = this.inMemorySnapshot();
    return inMemory ? [inMemory, ...this.snapshots()] : this.snapshots();
  });
  readonly persistence = signal<'memory' | 'local'>('memory');
  readonly message = signal<string | null>(null);

  previewInMemory(archive: ParsedArchive): Snapshot {
    const snapshot: Snapshot = {
      ...archive,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.inMemorySnapshot.set(snapshot);
    this.persistence.set('memory');
    this.message.set('Snapshot disponibile solo in memoria. Non è stato salvato.');
    return snapshot;
  }

  async save(archive: ParsedArchive, passphrase: string, allowDuplicate: boolean): Promise<void> {
    await this.repository.initialize(passphrase);
    await this.repository.save(archive, allowDuplicate);
    this.inMemorySnapshot.set(null);
    this.persistence.set('local');
    await this.reload();
    this.message.set('Snapshot cifrato salvato solo in IndexedDB su questo browser.');
  }

  async unlock(passphrase: string): Promise<void> {
    await this.repository.unlock(passphrase);
    this.persistence.set('local');
    await this.reload();
    this.message.set('Archivio locale sbloccato in questa sessione del browser.');
  }

  async reload(): Promise<void> {
    this.snapshots.set(await this.repository.all());
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    await this.reload();
  }

  async clear(): Promise<void> {
    await this.repository.clear();
    this.snapshots.set([]);
    this.inMemorySnapshot.set(null);
    this.persistence.set('memory');
    this.message.set('Archivio locale cancellato.');
  }

  lock(): void {
    this.repository.lock();
    this.snapshots.set([]);
    this.persistence.set('memory');
    this.message.set(
      'Archivio bloccato; la chiave e la passphrase non sono conservate nel browser.',
    );
  }
}
