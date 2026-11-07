// Runtime validation coverage for: encrypted local snapshot persistence and deletion.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { IDBKeyRange as fakeIDBKeyRange, indexedDB as fakeIndexedDB } from 'fake-indexeddb';
import type { SnapshotRepository } from './snapshot.repository';
import { ParsedArchive } from '../../shared/models/snapshot.model';

const passphrase = 'a sufficiently long passphrase';

function createArchive(sourceHash: string): ParsedArchive {
  return {
    sourceHash,
    importedAt: '2026-11-01T10:00:00.000Z',
    datasets: { followers: [{ username: 'synthetic_user' }] },
    invalidRecords: 0,
    duplicateRecords: 0,
    warnings: [],
  };
}

describe('SnapshotRepository', () => {
  let repository: SnapshotRepository;

  beforeEach(async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDB);
    vi.stubGlobal('IDBKeyRange', fakeIDBKeyRange);
    Dexie.dependencies.indexedDB = fakeIndexedDB;
    Dexie.dependencies.IDBKeyRange = fakeIDBKeyRange;
    const { SnapshotRepository: SnapshotRepositoryToken } = await import('./snapshot.repository');
    await TestBed.configureTestingModule({
      providers: [SnapshotRepositoryToken],
    }).compileComponents();
    repository = TestBed.inject(SnapshotRepositoryToken);
    await repository.clear();
  });

  it('saves encrypted snapshots and reloads them after unlocking', async () => {
    await repository.initialize(passphrase);
    const saved = await repository.save(createArchive('synthetic-hash'));
    const snapshots = await repository.all();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].id).toBe(saved.id);
    expect(snapshots[0].datasets.followers).toEqual([{ username: 'synthetic_user' }]);

    repository.lock();
    await expect(repository.all()).rejects.toThrow('Sblocca prima l’archivio locale.');
    await repository.unlock(passphrase);
    await expect(repository.all()).resolves.toHaveLength(1);
  });

  it('requires explicit confirmation to save a duplicate archive', async () => {
    await repository.initialize(passphrase);
    const archive = createArchive('same-hash');
    await repository.save(archive);

    await expect(repository.save(archive)).rejects.toThrow(
      'Questo archivio è già presente. Conferma esplicitamente il duplicato per salvarlo.',
    );

    await expect(repository.save(archive, true)).resolves.toMatchObject({ duplicate: true });
    await expect(repository.all()).resolves.toHaveLength(2);
  });

  it('deletes one snapshot and clears the local vault', async () => {
    await repository.initialize(passphrase);
    const saved = await repository.save(createArchive('delete-hash'));

    await repository.delete(saved.id);
    await expect(repository.all()).resolves.toEqual([]);

    await repository.save(createArchive('clear-hash'));
    await repository.clear();
    await expect(repository.unlock(passphrase)).rejects.toThrow(
      'Archivio locale non inizializzato.',
    );
  });
});
