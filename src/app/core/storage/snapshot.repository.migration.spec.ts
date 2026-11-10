import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { IDBKeyRange as fakeIDBKeyRange, indexedDB as fakeIndexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultService } from '../crypto/vault.service';
import { Snapshot } from '../../shared/models/snapshot.model';
import { SnapshotRepository } from './snapshot.repository';

const passphrase = 'a sufficiently long passphrase';

describe('SnapshotRepository schema migration', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', fakeIndexedDB);
    vi.stubGlobal('IDBKeyRange', fakeIDBKeyRange);
    Dexie.dependencies.indexedDB = fakeIndexedDB;
    Dexie.dependencies.IDBKeyRange = fakeIDBKeyRange;
  });

  it('creates the current state from the newest unchanged v1 snapshot', async () => {
    await Dexie.delete('instascope-local-v1');
    const database = new Dexie('instascope-local-v1');
    database.version(1).stores({
      snapshots: 'id, createdAt',
      vault: 'id',
    });
    await database.open();

    const vault = new VaultService();
    const verifier = await vault.initialize(passphrase);
    const snapshot: Snapshot = {
      id: 'legacy-snapshot',
      createdAt: '2026-11-01T10:00:00.000Z',
      sourceHash: 'legacy-hash',
      importedAt: '2026-11-01T10:00:00.000Z',
      datasets: { followers: [{ username: 'legacy_user' }] },
      invalidRecords: 0,
      duplicateRecords: 0,
      warnings: [],
    };
    const encrypted = await vault.encrypt(snapshot);
    await database.table('vault').put({
      id: 'vault',
      version: 1,
      salt: verifier.salt,
      verifierIv: verifier.iv,
      verifierCiphertext: verifier.ciphertext,
    });
    await database.table('snapshots').put({
      id: snapshot.id,
      createdAt: snapshot.createdAt,
      version: 1,
      ...encrypted,
    });
    vault.lock();
    database.close();

    await TestBed.configureTestingModule({
      providers: [SnapshotRepository],
    }).compileComponents();
    const repository = TestBed.inject(SnapshotRepository);

    await repository.unlock(passphrase);

    await expect(repository.currentSnapshot()).resolves.toEqual(snapshot);
    await expect(repository.all()).resolves.toEqual([snapshot]);
  });
});
