import {
  DatasetKey,
  InstagramAccount,
  Snapshot,
  SnapshotComparison,
} from '../../shared/models/snapshot.model';

function accountMap(
  accounts: InstagramAccount[] | undefined,
): Map<string, InstagramAccount> | null {
  if (!accounts) {
    return null;
  }

  return new Map(accounts.map((account) => [account.username.toLocaleLowerCase(), account]));
}

function difference(
  left: Map<string, InstagramAccount> | null,
  right: Map<string, InstagramAccount> | null,
): InstagramAccount[] | null {
  if (!left || !right) {
    return null;
  }

  return [...left.entries()]
    .filter(([username]) => !right.has(username))
    .map(([, account]) => account)
    .sort((a, b) => a.username.localeCompare(b.username));
}

function byDataset(snapshot: Snapshot, key: DatasetKey): Map<string, InstagramAccount> | null {
  return accountMap(snapshot.datasets[key]);
}

export function compareSnapshots(current: Snapshot, previous?: Snapshot): SnapshotComparison {
  const followers = byDataset(current, 'followers');
  const following = byDataset(current, 'following');
  const priorFollowers = previous ? byDataset(previous, 'followers') : null;
  const priorFollowing = previous ? byDataset(previous, 'following') : null;

  return {
    followingNotFollowers: difference(following, followers),
    followersNotFollowing: difference(followers, following),
    lostFollowers: previous ? difference(priorFollowers, followers) : null,
    removedFollowing: previous ? difference(priorFollowing, following) : null,
    newFollowers: previous ? difference(followers, priorFollowers) : null,
    newFollowing: previous ? difference(following, priorFollowing) : null,
  };
}

export function filterAccountsByDays(
  accounts: InstagramAccount[],
  days: number,
  now: Date = new Date(),
): InstagramAccount[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;

  return accounts.filter((account) => {
    if (!account.timestamp) {
      return false;
    }

    const time = Date.parse(account.timestamp);
    return Number.isFinite(time) && time >= cutoff && time <= now.getTime();
  });
}

export type PendingRequestSort = 'oldest' | 'newest' | 'username';

export function filterPendingRequests(
  accounts: readonly InstagramAccount[],
  query: string,
  sort: PendingRequestSort,
  now: Date = new Date(),
): InstagramAccount[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = accounts.filter((account) =>
    account.username.toLocaleLowerCase().includes(normalizedQuery),
  );

  return [...filtered].sort((left, right) => {
    if (sort === 'username') {
      return left.username.localeCompare(right.username, undefined, { sensitivity: 'base' });
    }

    const leftTime = pastTimestamp(left.timestamp, now.getTime());
    const rightTime = pastTimestamp(right.timestamp, now.getTime());
    if (leftTime === undefined) return rightTime === undefined ? 0 : 1;
    if (rightTime === undefined) return -1;
    return sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
  });
}

export function daysAwaitingRequest(
  value: string | undefined,
  now: Date = new Date(),
): number | null {
  const timestamp = pastTimestamp(value, now.getTime());
  if (timestamp === undefined) return null;
  return Math.floor((now.getTime() - timestamp) / (24 * 60 * 60 * 1_000));
}

function validTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function pastTimestamp(value: string | undefined, now: number): number | undefined {
  const timestamp = validTimestamp(value);
  return timestamp !== undefined && timestamp <= now ? timestamp : undefined;
}
