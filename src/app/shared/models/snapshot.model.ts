export const DATASET_KEYS = [
  'followers',
  'following',
  'pendingRequests',
  'recentlyUnfollowed',
  'closeFriends',
] as const;

export type DatasetKey = (typeof DATASET_KEYS)[number];

export interface InstagramAccount {
  username: string;
  profileUrl?: string;
  timestamp?: string;
}

export type SnapshotDatasets = Partial<Record<DatasetKey, InstagramAccount[]>>;

export interface ParsedArchive {
  sourceHash: string;
  importedAt: string;
  datasets: SnapshotDatasets;
  invalidRecords: number;
  duplicateRecords: number;
  warnings: string[];
}

export interface Snapshot extends ParsedArchive {
  id: string;
  createdAt: string;
}

export interface SnapshotEnvelope {
  id: string;
  createdAt: string;
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface VaultMetadata {
  id: 'vault';
  version: 1;
  salt: string;
  verifierIv: string;
  verifierCiphertext: string;
}

export interface SnapshotComparison {
  followingNotFollowers: InstagramAccount[] | null;
  followersNotFollowing: InstagramAccount[] | null;
  lostFollowers: InstagramAccount[] | null;
  removedFollowing: InstagramAccount[] | null;
  newFollowers: InstagramAccount[] | null;
  newFollowing: InstagramAccount[] | null;
}
