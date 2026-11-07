import JSZip from 'jszip';
import {
  DATASET_KEYS,
  DatasetKey,
  InstagramAccount,
  ParsedArchive,
} from '../../shared/models/snapshot.model';

export const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
export const MAX_JSON_ENTRY_BYTES = 50 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BYTES = 150 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 2_000;
export const MAX_EXPANSION_RATIO = 100;

interface ZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  directory: boolean;
}

interface RecordResult {
  accounts: InstagramAccount[];
  invalid: number;
}

function normalizePath(name: string): string {
  const path = name.replaceAll('\\', '/');
  if (
    path.startsWith('/') ||
    /^[a-zA-Z]:/.test(path) ||
    path.split('/').some((part) => part === '..') ||
    /[\u0000-\u001f]/.test(path)
  ) {
    throw new Error('Percorso ZIP non sicuro.');
  }
  return path.replace(/\/+/g, '/');
}

function zipCentralDirectory(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const lowerBound = Math.max(0, view.byteLength - 65_557);
  let eocd = -1;

  for (let offset = view.byteLength - 22; offset >= lowerBound; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }

  if (eocd < 0) {
    throw new Error('Archivio ZIP corrotto o non supportato.');
  }

  const diskNumber = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entriesOnDisk = view.getUint16(eocd + 8, true);
  const entryCount = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);

  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    directoryOffset === 0xffffffff ||
    directorySize === 0xffffffff
  ) {
    throw new Error('Archivio multi-volume o ZIP64 non supportato.');
  }
  if (entryCount > MAX_ARCHIVE_ENTRIES || directoryOffset + directorySize > eocd) {
    throw new Error('Archivio oltre i limiti consentiti.');
  }

  const decoder = new TextDecoder('utf-8', { fatal: true });
  const entries: ZipEntry[] = [];
  let offset = directoryOffset;
  let totalUncompressed = 0;
  let totalCompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > directoryOffset + directorySize ||
      view.getUint32(offset, true) !== 0x02014b50
    ) {
      throw new Error('Directory centrale ZIP non valida.');
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const diskStart = view.getUint16(offset + 34, true);
    const recordEnd = offset + 46 + nameLength + extraLength + commentLength;

    if (recordEnd > directoryOffset + directorySize || diskStart !== 0) {
      throw new Error('Directory centrale ZIP non valida.');
    }
    if ((flags & 1) !== 0 || ![0, 8].includes(method)) {
      throw new Error('File ZIP cifrato o con metodo non supportato.');
    }
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw new Error('Entry ZIP64 non supportata.');
    }

    const nameOffset = offset + 46;
    const rawName = decoder.decode(new Uint8Array(buffer, nameOffset, nameLength));
    const name = normalizePath(rawName);
    const directory = name.endsWith('/');
    totalCompressed += compressedSize;
    totalUncompressed += uncompressedSize;

    if (
      totalUncompressed > MAX_UNCOMPRESSED_BYTES ||
      uncompressedSize > MAX_JSON_ENTRY_BYTES ||
      (compressedSize === 0 && uncompressedSize > 0) ||
      (compressedSize > 0 && uncompressedSize / compressedSize > MAX_EXPANSION_RATIO)
    ) {
      throw new Error('Archivio oltre i limiti di decompressione consentiti.');
    }

    entries.push({ name, compressedSize, uncompressedSize, directory });
    offset = recordEnd;
  }

  if (totalCompressed > 0 && totalUncompressed / totalCompressed > MAX_EXPANSION_RATIO) {
    throw new Error('Rapporto di compressione ZIP non consentito.');
  }
  return entries;
}

function datasetFromName(name: string): DatasetKey | null {
  const file = name.split('/').pop()?.toLowerCase().replace(/[-\s]/g, '_') ?? '';
  if (file.includes('pending') || file.includes('follow_requests_sent')) {
    return 'pendingRequests';
  }
  if (file.includes('recently_unfollowed')) {
    return 'recentlyUnfollowed';
  }
  if (file.includes('close_friends')) {
    return 'closeFriends';
  }
  if (file.includes('followers') && !file.includes('following')) {
    return 'followers';
  }
  if (file.includes('following')) {
    return 'following';
  }
  return null;
}

function datasetFromKey(key: string): DatasetKey | null {
  const name = key.toLowerCase().replace(/[^a-z]/g, '');
  if (name.includes('pending') || name.includes('followrequestssent')) {
    return 'pendingRequests';
  }
  if (name.includes('recentlyunfollowed')) {
    return 'recentlyUnfollowed';
  }
  if (name.includes('closefriends')) {
    return 'closeFriends';
  }
  if (name.includes('followers') && !name.includes('following')) {
    return 'followers';
  }
  if (name.includes('following')) {
    return 'following';
  }
  return null;
}

function accountUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (
      url.protocol === 'https:' &&
      (url.hostname === 'instagram.com' || url.hostname === 'www.instagram.com')
    ) {
      return url.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function validTimestamp(value: unknown, now: number): string | undefined {
  let date: Date;
  if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value * 1000);
  } else if (typeof value === 'string' && value.length <= 64) {
    date = new Date(value);
  } else {
    return undefined;
  }
  const time = date.getTime();
  return Number.isFinite(time) && time > 0 && time <= now + 24 * 60 * 60 * 1000
    ? date.toISOString()
    : undefined;
}

function parseRecords(value: unknown, now: number): RecordResult {
  if (!Array.isArray(value)) {
    return { accounts: [], invalid: 0 };
  }

  const accounts: InstagramAccount[] = [];
  let invalid = 0;
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      invalid += 1;
      continue;
    }
    const record = item as Record<string, unknown>;
    const listData = Array.isArray(record['string_list_data'])
      ? record['string_list_data']
      : [record];

    for (const entry of listData) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        invalid += 1;
        continue;
      }

      const data = entry as Record<string, unknown>;
      const rawUsername =
        typeof data['value'] === 'string'
          ? data['value']
          : typeof record['title'] === 'string'
            ? record['title']
            : typeof record['username'] === 'string'
              ? record['username']
              : null;
      const username = rawUsername?.trim() ?? '';
      if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
        invalid += 1;
        continue;
      }

      const timestamp = validTimestamp(data['timestamp'] ?? record['timestamp'], now);
      const profileUrl = accountUrl(data['href'] ?? record['href']);
      accounts.push({
        username,
        ...(profileUrl ? { profileUrl } : {}),
        ...(timestamp ? { timestamp } : {}),
      });
    }
  }
  return { accounts, invalid };
}

function findDatasetArray(value: unknown, dataset: DatasetKey): unknown[] | null {
  const matches: unknown[][] = [];
  const visit = (node: unknown, depth: number): void => {
    if (depth > 20 || typeof node !== 'object' || node === null) {
      return;
    }
    if (Array.isArray(node)) {
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (Array.isArray(child) && datasetFromKey(key) === dataset) {
        matches.push(child);
      } else {
        visit(child, depth + 1);
      }
    }
  };
  visit(value, 0);
  if (matches.length > 0) {
    return matches.flat();
  }
  return Array.isArray(value) ? value : null;
}

function emptyDatasets(): ParsedArchive['datasets'] {
  return {};
}

function finalize(
  datasets: ParsedArchive['datasets'],
  sourceHash: string,
  invalidRecords: number,
  duplicateRecords: number,
  warnings: string[],
): ParsedArchive {
  if (Object.keys(datasets).length === 0) {
    throw new Error('Schema Instagram non riconosciuto: nessun dataset supportato.');
  }
  return {
    sourceHash,
    importedAt: new Date().toISOString(),
    datasets,
    invalidRecords,
    duplicateRecords,
    warnings,
  };
}

async function sha256(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error('File JSON corrotto o codifica non supportata.');
  }
}

function collectJsonFiles(
  value: unknown,
  result: Array<{ key: string; value: unknown }> = [],
): Array<{ key: string; value: unknown }> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    if (datasetFromKey(key) && Array.isArray(child)) {
      result.push({ key, value: child });
    } else {
      collectJsonFiles(child, result);
    }
  }
  return result;
}

export async function parseInstagramFile(file: File): Promise<ParsedArchive> {
  if (file.size === 0 || file.size > MAX_ARCHIVE_BYTES) {
    throw new Error('Il file è vuoto o supera il limite di 50 MB.');
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const hash = await sha256(buffer);
  const datasets = emptyDatasets();
  const warnings: string[] = [];
  let invalidRecords = 0;
  let duplicateRecords = 0;
  const now = Date.now();
  const signature = bytes.length >= 4 ? new DataView(buffer).getUint32(0, true) : 0;

  if (signature === 0x04034b50) {
    const entries = zipCentralDirectory(buffer);
    const archive = await JSZip.loadAsync(buffer, { checkCRC32: true, createFolders: false });

    for (const entry of entries) {
      if (entry.directory || !entry.name.toLowerCase().endsWith('.json')) {
        continue;
      }
      const namedDataset = datasetFromName(entry.name);
      const zipFile = archive.file(entry.name);
      if (!zipFile || entry.uncompressedSize > MAX_JSON_ENTRY_BYTES) {
        continue;
      }

      let raw: unknown;
      try {
        const content = await zipFile.async('uint8array');
        raw = decodeJson(content);
      } catch {
        invalidRecords += 1;
        warnings.push('Un file JSON non valido è stato ignorato.');
        continue;
      }

      const candidates = namedDataset
        ? [{ key: namedDataset, value: findDatasetArray(raw, namedDataset) }]
        : collectJsonFiles(raw).map((candidate) => ({
            key: datasetFromKey(candidate.key),
            value: candidate.value,
          }));

      let recognized = false;
      for (const candidate of candidates) {
        const dataset =
          typeof candidate.key === 'string' && DATASET_KEYS.includes(candidate.key as DatasetKey)
            ? (candidate.key as DatasetKey)
            : null;
        if (!dataset || !Array.isArray(candidate.value)) {
          continue;
        }
        recognized = true;
        const parsed = parseRecords(candidate.value, now);
        invalidRecords += parsed.invalid;
        const current = datasets[dataset] ?? [];
        const unique = new Map(current.map((account) => [account.username.toLowerCase(), account]));
        for (const account of parsed.accounts) {
          const key = account.username.toLowerCase();
          if (unique.has(key)) {
            duplicateRecords += 1;
          } else {
            unique.set(key, account);
          }
        }
        datasets[dataset] = [...unique.values()];
      }
      if (!recognized) {
        warnings.push('Un file JSON con schema non riconosciuto è stato ignorato.');
      }
    }
  } else {
    const first = new TextDecoder()
      .decode(bytes.subarray(0, Math.min(bytes.length, 256)))
      .trimStart()[0];
    if (first !== '{' && first !== '[') {
      throw new Error(
        'Formato file non riconosciuto. Seleziona un archivio ZIP o un JSON Instagram.',
      );
    }
    if (file.size > MAX_JSON_ENTRY_BYTES) {
      throw new Error('Il file JSON supera il limite di 50 MB.');
    }

    const raw = decodeJson(bytes);
    const directDataset = datasetFromName(file.name);
    const candidates = directDataset
      ? [{ key: directDataset, value: findDatasetArray(raw, directDataset) }]
      : collectJsonFiles(raw).map((candidate) => ({
          key: datasetFromKey(candidate.key),
          value: candidate.value,
        }));

    for (const candidate of candidates) {
      const dataset =
        typeof candidate.key === 'string' && DATASET_KEYS.includes(candidate.key as DatasetKey)
          ? (candidate.key as DatasetKey)
          : null;
      if (!dataset || !Array.isArray(candidate.value)) {
        continue;
      }
      const parsed = parseRecords(candidate.value, now);
      invalidRecords += parsed.invalid;
      const unique = new Map<string, InstagramAccount>();
      for (const account of parsed.accounts) {
        const key = account.username.toLowerCase();
        if (unique.has(key)) {
          duplicateRecords += 1;
        } else {
          unique.set(key, account);
        }
      }
      datasets[dataset] = [...unique.values()];
    }
  }

  return finalize(datasets, hash, invalidRecords, duplicateRecords, warnings);
}
