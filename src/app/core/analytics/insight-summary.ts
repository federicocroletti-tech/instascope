import { Snapshot } from '../../shared/models/snapshot.model';
import { compareSnapshots } from './snapshot-comparison';

export function buildInsightSummary(snapshots: Snapshot[]) {
  const [current, previous] = [...snapshots].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  if (!current) return null;
  const comparison = compareSnapshots(current, previous);
  return {
    currentDate: current.createdAt,
    previousDate: previous?.createdAt ?? null,
    followers: current.datasets.followers?.length ?? null,
    following: current.datasets.following?.length ?? null,
    pendingRequests: current.datasets.pendingRequests?.length ?? null,
    newFollowers: comparison.newFollowers?.length ?? null,
    lostFollowers: comparison.lostFollowers?.length ?? null,
    nonReciprocal: comparison.followingNotFollowers?.length ?? null,
  };
}
