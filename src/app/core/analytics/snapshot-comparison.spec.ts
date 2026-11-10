// Runtime validation coverage for: snapshot comparison and time-range filtering.
import { describe, expect, it } from 'vitest';
import {
  compareSnapshots,
  filterAccountsByDays,
  partitionLostFollowers,
} from './snapshot-comparison';
import { Snapshot } from '../../shared/models/snapshot.model';

const older: Snapshot = {
  id: 'older',
  createdAt: '2026-10-01T00:00:00.000Z',
  importedAt: '2026-10-01T00:00:00.000Z',
  sourceHash: 'synthetic',
  invalidRecords: 0,
  duplicateRecords: 0,
  warnings: [],
  datasets: {
    followers: [{ username: 'same' }, { username: 'lost' }],
    following: [{ username: 'following-removed' }, { username: 'same' }],
  },
};

const current: Snapshot = {
  id: 'current',
  createdAt: '2026-11-01T00:00:00.000Z',
  importedAt: '2026-11-01T00:00:00.000Z',
  sourceHash: 'synthetic',
  invalidRecords: 0,
  duplicateRecords: 0,
  warnings: [],
  datasets: {
    followers: [{ username: 'SAME' }, { username: 'new' }],
    following: [{ username: 'same' }, { username: 'following-new' }],
  },
};

describe('snapshot comparison', () => {
  it('compares usernames case-insensitively and reports unavailable datasets as null', () => {
    const result = compareSnapshots(current, older);

    expect(result.lostFollowers?.map(({ username }) => username)).toEqual(['lost']);
    expect(result.newFollowers?.map(({ username }) => username)).toEqual(['new']);
    expect(result.removedFollowing?.map(({ username }) => username)).toEqual(['following-removed']);
    expect(result.followingNotFollowers).toEqual([{ username: 'following-new' }]);
    expect(compareSnapshots(current).lostFollowers).toBeNull();
  });

  it('filters only valid timestamps within the inclusive range', () => {
    const now = new Date('2026-11-01T00:00:00.000Z');
    const accounts = [
      { username: 'inside', timestamp: '2026-10-15T00:00:00.000Z' },
      { username: 'outside', timestamp: '2026-09-01T00:00:00.000Z' },
      { username: 'future', timestamp: '2026-11-02T00:00:00.000Z' },
      { username: 'invalid', timestamp: 'not-a-date' },
      { username: 'missing' },
    ];

    expect(filterAccountsByDays(accounts, 30, now).map(({ username }) => username)).toEqual([
      'inside',
    ]);
  });

  it('partitions lost followers by whether they are still followed', () => {
    const groups = partitionLostFollowers(
      [{ username: 'still-followed' }, { username: 'not-followed' }],
      [{ username: 'STILL-FOLLOWED' }],
    );

    expect(groups?.followedByMe.map(({ username }) => username)).toEqual(['still-followed']);
    expect(groups?.notFollowedByMe.map(({ username }) => username)).toEqual(['not-followed']);
  });

  it('does not classify lost followers without a current following dataset', () => {
    expect(partitionLostFollowers([{ username: 'unknown' }], undefined)).toBeNull();
  });
});
