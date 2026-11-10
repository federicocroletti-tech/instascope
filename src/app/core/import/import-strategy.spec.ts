import { describe, expect, it } from 'vitest';
import { applyImportMode } from './import-strategy';
import { SnapshotDatasets } from '../../shared/models/snapshot.model';

const existing: SnapshotDatasets = {
  followers: [
    { username: 'Alice', profileUrl: 'https://www.instagram.com/alice/' },
    { username: 'bob' },
  ],
  following: [{ username: 'carol' }],
};

const incoming: SnapshotDatasets = {
  followers: [
    { username: 'alice', profileUrl: 'https://www.instagram.com/alice-new/' },
    { username: 'dave' },
  ],
  pendingRequests: [{ username: 'erin' }],
};

describe('applyImportMode', () => {
  it('replaces only the current datasets without mutating the source datasets', () => {
    const result = applyImportMode(existing, incoming, 'replace');

    expect(result.datasets).toEqual(incoming);
    expect(result).toMatchObject({
      recordsAdded: 3,
      recordsUpdated: 0,
      recordsIgnored: 0,
      recordsReplaced: 3,
    });
    expect(existing.followers).toHaveLength(2);
  });

  it('adds only unknown accounts and keeps existing values on conflicts', () => {
    const result = applyImportMode(existing, incoming, 'integrate-new');

    expect(result.datasets.followers).toEqual([
      { username: 'Alice', profileUrl: 'https://www.instagram.com/alice/' },
      { username: 'bob' },
      { username: 'dave' },
    ]);
    expect(result.datasets.following).toEqual([{ username: 'carol' }]);
    expect(result).toMatchObject({
      recordsAdded: 2,
      recordsUpdated: 0,
      recordsIgnored: 1,
      recordsReplaced: 0,
    });
  });

  it('adds unknown accounts and updates changed records using case-insensitive usernames', () => {
    const result = applyImportMode(existing, incoming, 'merge-update');

    expect(result.datasets.followers?.[0]).toEqual(incoming.followers?.[0]);
    expect(result).toMatchObject({
      recordsAdded: 2,
      recordsUpdated: 1,
      recordsIgnored: 0,
      recordsReplaced: 0,
    });
  });

  it('treats a present but empty category as empty and retains categories not in the import', () => {
    const result = applyImportMode(existing, { followers: [] }, 'merge-update');

    expect(result.datasets.followers).toEqual(existing.followers);
    expect(result.datasets.following).toEqual(existing.following);
    expect(result.recordsIgnored).toBe(0);
  });
});
