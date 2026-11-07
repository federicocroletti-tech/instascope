import { Snapshot } from '../../shared/models/snapshot.model';

const older: Snapshot = {
  id: 'demo-older',
  createdAt: '2026-10-20T10:00:00.000Z',
  importedAt: '2026-10-20T10:00:00.000Z',
  sourceHash: 'DEMO-SYNTHETIC-NOT-A-FILE-HASH',
  invalidRecords: 0,
  duplicateRecords: 0,
  warnings: [],
  datasets: {
    followers: [
      { username: 'demo_user_001' },
      { username: 'demo_user_002' },
      { username: 'demo_user_003' },
    ],
    following: [
      { username: 'demo_user_001' },
      { username: 'demo_user_003' },
      { username: 'demo_user_007' },
    ],
    pendingRequests: [{ username: 'demo_user_011', timestamp: '2026-09-10T10:00:00.000Z' }],
  },
};

const current: Snapshot = {
  id: 'demo-current',
  createdAt: '2026-11-01T10:00:00.000Z',
  importedAt: '2026-11-01T10:00:00.000Z',
  sourceHash: 'DEMO-SYNTHETIC-NOT-A-FILE-HASH',
  invalidRecords: 0,
  duplicateRecords: 0,
  warnings: [],
  datasets: {
    followers: [
      { username: 'demo_user_001' },
      { username: 'demo_user_003' },
      { username: 'demo_user_004', timestamp: '2026-10-28T10:00:00.000Z' },
    ],
    following: [
      { username: 'demo_user_001' },
      { username: 'demo_user_003' },
      { username: 'demo_user_006', timestamp: '2026-10-27T10:00:00.000Z' },
    ],
    pendingRequests: [
      { username: 'demo_user_011', timestamp: '2026-09-10T10:00:00.000Z' },
      { username: 'demo_user_012' },
    ],
    closeFriends: [{ username: 'demo_user_003' }],
  },
};

export const DEMO_SNAPSHOTS: readonly Snapshot[] = [current, older];
