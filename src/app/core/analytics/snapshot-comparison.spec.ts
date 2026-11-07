// Runtime validation coverage for: snapshot comparison and time-range filtering.
import { describe, expect, it } from 'vitest';
import {
  compareSnapshots,
  daysAwaitingRequest,
  filterAccountsByDays,
  filterPendingRequests,
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

  it('does not report missing datasets as zero changes or false account losses', () => {
    const incompleteCurrent: Snapshot = {
      ...current,
      datasets: { following: current.datasets.following },
    };

    const result = compareSnapshots(incompleteCurrent, older);

    expect(result.followingNotFollowers).toBeNull();
    expect(result.followersNotFollowing).toBeNull();
    expect(result.newFollowers).toBeNull();
    expect(result.lostFollowers).toBeNull();
    expect(result.newFollowing?.map(({ username }) => username)).toEqual(['following-new']);
    expect(result.removedFollowing?.map(({ username }) => username)).toEqual(['following-removed']);
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

  it('searches and sorts pending requests, keeping missing and future dates last', () => {
    const now = new Date('2026-11-07T12:00:00.000Z');
    const accounts = [
      { username: 'demo_newest', timestamp: '2026-11-06T00:00:00.000Z' },
      { username: 'demo_oldest', timestamp: '2026-10-01T00:00:00.000Z' },
      { username: 'demo_missing' },
      { username: 'demo_future', timestamp: '2026-11-08T00:00:00.000Z' },
    ];

    expect(
      filterPendingRequests(accounts, 'DEMO_', 'oldest', now).map(({ username }) => username),
    ).toEqual(['demo_oldest', 'demo_newest', 'demo_missing', 'demo_future']);
    expect(
      filterPendingRequests(accounts, 'newest', 'username', now).map(({ username }) => username),
    ).toEqual(['demo_newest']);
    expect(
      filterPendingRequests(accounts, '', 'newest', now).map(({ username }) => username),
    ).toEqual(['demo_newest', 'demo_oldest', 'demo_missing', 'demo_future']);

    expect(daysAwaitingRequest('2026-11-04T11:59:00.000Z', now)).toBe(3);
    expect(daysAwaitingRequest(undefined, now)).toBeNull();
    expect(daysAwaitingRequest('invalid-date', now)).toBeNull();
    expect(daysAwaitingRequest('2026-11-08T00:00:00.000Z', now)).toBeNull();
  });
});
