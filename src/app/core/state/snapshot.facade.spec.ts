import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Snapshot } from '../../shared/models/snapshot.model';
import { SnapshotRepository } from '../storage/snapshot.repository';
import { SnapshotFacade } from './snapshot.facade';

describe('SnapshotFacade', () => {
  let facade: SnapshotFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SnapshotFacade, { provide: SnapshotRepository, useValue: {} }],
    });
    facade = TestBed.inject(SnapshotFacade);
  });

  it('recomputes mode changes from the same base and integrates successive memory imports', () => {
    const base: Snapshot = {
      id: 'base',
      createdAt: '2026-11-01T10:00:00.000Z',
      sourceHash: 'base-hash',
      importedAt: '2026-11-01T10:00:00.000Z',
      datasets: {
        followers: [{ username: 'Alice', profileUrl: 'https://www.instagram.com/alice/' }],
      },
      invalidRecords: 0,
      duplicateRecords: 0,
      warnings: [],
    };
    const archive = {
      sourceHash: 'first-import',
      importedAt: '2026-11-02T10:00:00.000Z',
      datasets: {
        followers: [
          { username: 'alice', profileUrl: 'https://www.instagram.com/alice-updated/' },
          { username: 'bob' },
        ],
      },
      invalidRecords: 0,
      duplicateRecords: 0,
      warnings: [],
    };
    facade.currentSnapshot.set(base);

    const integrated = facade.previewInMemory(archive, 'integrate-new');
    expect(integrated.datasets.followers?.[0]).toEqual(base.datasets.followers?.[0]);

    const merged = facade.previewInMemory(archive, 'merge-update');
    expect(merged.datasets.followers?.[0]).toEqual(archive.datasets.followers[0]);

    const next = facade.previewInMemory(
      {
        ...archive,
        sourceHash: 'second-import',
        datasets: { followers: [{ username: 'carol' }] },
      },
      'integrate-new',
    );
    expect(next.datasets.followers?.map((account) => account.username)).toEqual([
      'alice',
      'bob',
      'carol',
    ]);
  });
});
