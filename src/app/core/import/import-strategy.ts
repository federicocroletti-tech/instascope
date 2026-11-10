import {
  DATASET_KEYS,
  ImportMode,
  InstagramAccount,
  SnapshotDatasets,
} from '../../shared/models/snapshot.model';

export interface ImportStrategyResult {
  datasets: SnapshotDatasets;
  recordsAdded: number;
  recordsUpdated: number;
  recordsIgnored: number;
  recordsReplaced: number;
}

function accountChanged(existing: InstagramAccount, incoming: InstagramAccount): boolean {
  return (
    existing.username !== incoming.username ||
    existing.profileUrl !== incoming.profileUrl ||
    existing.timestamp !== incoming.timestamp
  );
}

export function applyImportMode(
  existing: SnapshotDatasets | null,
  incoming: SnapshotDatasets,
  mode: ImportMode,
): ImportStrategyResult {
  if (mode === 'replace') {
    const recordsReplaced = DATASET_KEYS.reduce(
      (total, key) => total + (existing?.[key]?.length ?? 0),
      0,
    );
    const recordsAdded = DATASET_KEYS.reduce(
      (total, key) => total + (incoming[key]?.length ?? 0),
      0,
    );
    return {
      datasets: Object.fromEntries(
        DATASET_KEYS.flatMap((key) => (incoming[key] ? [[key, incoming[key]]] : [])),
      ) as SnapshotDatasets,
      recordsAdded,
      recordsUpdated: 0,
      recordsIgnored: 0,
      recordsReplaced,
    };
  }

  const datasets: SnapshotDatasets = Object.fromEntries(
    DATASET_KEYS.flatMap((key) => (existing?.[key] ? [[key, [...existing[key]]]] : [])),
  ) as SnapshotDatasets;
  let recordsAdded = 0;
  let recordsUpdated = 0;
  let recordsIgnored = 0;

  for (const key of DATASET_KEYS) {
    const imported = incoming[key];
    if (!imported) {
      continue;
    }

    const current = datasets[key] ?? [];
    const byUsername = new Map(current.map((account) => [account.username.toLowerCase(), account]));
    for (const account of imported) {
      const username = account.username.toLowerCase();
      const previous = byUsername.get(username);
      if (!previous) {
        byUsername.set(username, account);
        recordsAdded += 1;
      } else if (mode === 'merge-update' && accountChanged(previous, account)) {
        byUsername.set(username, account);
        recordsUpdated += 1;
      } else {
        recordsIgnored += 1;
      }
    }
    datasets[key] = [...byUsername.values()];
  }

  return {
    datasets,
    recordsAdded,
    recordsUpdated,
    recordsIgnored,
    recordsReplaced: 0,
  };
}
