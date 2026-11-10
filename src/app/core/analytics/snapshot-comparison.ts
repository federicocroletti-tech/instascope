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

export interface LostFollowerGroups {
  followedByMe: InstagramAccount[];
  notFollowedByMe: InstagramAccount[];
}

export function partitionLostFollowers(
  lostFollowers: InstagramAccount[] | null,
  currentFollowing: InstagramAccount[] | undefined,
): LostFollowerGroups | null {
  if (!lostFollowers || !currentFollowing) {
    return null;
  }

  const following = new Set(currentFollowing.map((account) => account.username.toLowerCase()));
  return {
    followedByMe: lostFollowers.filter((account) => following.has(account.username.toLowerCase())),
    notFollowedByMe: lostFollowers.filter(
      (account) => !following.has(account.username.toLowerCase()),
    ),
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
