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

  it('keeps imported snapshots immutable while exposing the selected current dataset view', async () => {
    await repository.initialize(passphrase);
    const first = {
      ...createArchive('first-hash'),
      datasets: {
        followers: [{ username: 'Alice' }],
        following: [{ username: 'old_following' }],
      },
    };
    const second = {
      ...createArchive('second-hash'),
      datasets: {
        followers: [
          { username: 'alice', profileUrl: 'https://www.instagram.com/alice/' },
          { username: 'new_follower' },
        ],
        pendingRequests: [{ username: 'pending_user' }],
      },
    };

    await repository.importArchive(first, 'replace');
    const integration = await repository.importArchive(second, 'integrate-new');
    const merged = await repository.currentSnapshot();

    expect(integration).toMatchObject({
      mode: 'integrate-new',
      recordsAdded: 2,
      recordsUpdated: 0,
      recordsIgnored: 1,
      recordsReplaced: 0,
    });
    expect(merged?.datasets).toEqual({
      followers: [{ username: 'Alice' }, { username: 'new_follower' }],
      following: [{ username: 'old_following' }],
      pendingRequests: [{ username: 'pending_user' }],
    });

    const update = {
      ...createArchive('third-hash'),
      datasets: {
        followers: [
          { username: 'ALICE', profileUrl: 'https://www.instagram.com/alice-updated/' },
          { username: 'NEW_FOLLOWER', profileUrl: 'https://www.instagram.com/new_follower/' },
        ],
      },
    };
    const updateReport = await repository.importArchive(update, 'merge-update');
    const afterUpdate = await repository.currentSnapshot();
    const history = await repository.all();

    expect(updateReport).toMatchObject({
      mode: 'merge-update',
      recordsAdded: 0,
      recordsUpdated: 2,
      recordsIgnored: 0,
    });
    expect(afterUpdate?.datasets.followers?.[0]).toEqual(update.datasets.followers[0]);
    expect(afterUpdate?.datasets.following).toEqual([{ username: 'old_following' }]);
    expect(history).toHaveLength(3);
    expect(history[0].datasets).toEqual(update.datasets);
    expect(history[1].datasets).toEqual(second.datasets);
    expect(history[2].datasets).toEqual(first.datasets);
  });

  it('restores the previous merged current view when deleting a later import', async () => {
    await repository.initialize(passphrase);
    const first = await repository.importArchive(createArchive('first-current-hash'), 'replace');
    const second = await repository.importArchive(
      {
        ...createArchive('second-current-hash'),
        datasets: {
          followers: [{ username: 'second_follower' }],
          following: [{ username: 'new' }],
        },
      },
      'integrate-new',
    );
    const third = await repository.importArchive(
      {
        ...createArchive('third-current-hash'),
        datasets: { pendingRequests: [{ username: 'new' }] },
      },
      'integrate-new',
    );

    await repository.delete(third.id);

    await expect(repository.currentSnapshot()).resolves.toMatchObject({
      id: second.id,
      datasets: {
        followers: [{ username: 'synthetic_user' }, { username: 'second_follower' }],
        following: [{ username: 'new' }],
      },
    });
    await expect(repository.all()).resolves.toHaveLength(2);
    expect(first.id).not.toBe(second.id);
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
