// Runtime validation coverage for: local Instagram export parsing and validation.
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parseInstagramFile } from './archive-parser';

describe('parseInstagramFile', () => {
  it('deduplicates usernames and rejects invalid records and external profile links', async () => {
    const records = [
      {
        title: 'alice',
        string_list_data: [
          {
            value: 'alice',
            href: 'https://www.instagram.com/alice/',
            timestamp: 1_700_000_000,
          },
        ],
      },
      {
        title: 'ALICE',
        string_list_data: [
          {
            value: 'ALICE',
            href: 'https://external.invalid/alice',
            timestamp: 4_102_444_800,
          },
        ],
      },
      { title: '../invalid', string_list_data: [{ value: '../invalid' }] },
    ];
    const file = new File([JSON.stringify(records)], 'followers_1.json', {
      type: 'application/json',
    });

    const parsed = await parseInstagramFile(file);

    expect(parsed.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.datasets.followers).toEqual([
      {
        username: 'alice',
        profileUrl: 'https://www.instagram.com/alice/',
        timestamp: new Date(1_700_000_000 * 1000).toISOString(),
      },
    ]);
    expect(parsed.duplicateRecords).toBe(1);
    expect(parsed.invalidRecords).toBe(1);
    expect(parsed.categoryDetection?.followers).toEqual({
      filesFound: 1,
      recordsRead: 3,
      validRecords: 2,
      invalidRecords: 1,
    });
    expect(parsed.categoryDetection?.following?.filesFound).toBe(0);
  });

  it('distinguishes present-empty categories from categories absent in the archive', async () => {
    const zip = new JSZip();
    zip.file('followers_1.json', JSON.stringify([{ value: 'alice' }]));
    zip.file('following.json', JSON.stringify([]));
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });

    const parsed = await parseInstagramFile(
      new File([buffer], 'export.zip', { type: 'application/zip' }),
    );

    expect(parsed.categoryDetection?.followers).toEqual({
      filesFound: 1,
      recordsRead: 1,
      validRecords: 1,
      invalidRecords: 0,
    });
    expect(parsed.datasets.following).toEqual([]);
    expect(parsed.categoryDetection?.following).toEqual({
      filesFound: 1,
      recordsRead: 0,
      validRecords: 0,
      invalidRecords: 0,
    });
    expect(parsed.categoryDetection?.closeFriends?.filesFound).toBe(0);
    expect(parsed.warnings.some((warning) => warning.includes('closeFriends'))).toBe(true);
  });

  it('combines nested Meta follower files and deduplicates accounts across shards', async () => {
    const zip = new JSZip();
    zip.file(
      'connections/followers_and_following/followers_1.json',
      JSON.stringify([{ string_list_data: [{ value: 'alice' }] }]),
    );
    zip.file(
      'connections/followers_and_following/followers_2.json',
      JSON.stringify([
        { string_list_data: [{ value: 'bob' }] },
        { string_list_data: [{ value: 'ALICE' }] },
      ]),
    );
    zip.file(
      'connections/followers_and_following/following.json',
      JSON.stringify([{ string_list_data: [{ value: 'charlie' }] }]),
    );
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });

    const parsed = await parseInstagramFile(
      new File([buffer], 'instagram-export.zip', { type: 'application/zip' }),
    );

    expect(parsed.datasets.followers?.map(({ username }) => username)).toEqual(['alice', 'bob']);
    expect(parsed.datasets.following?.map(({ username }) => username)).toEqual(['charlie']);
    expect(parsed.duplicateRecords).toBe(1);
    expect(parsed.categoryDetection?.followers).toEqual({
      filesFound: 2,
      recordsRead: 3,
      validRecords: 3,
      invalidRecords: 0,
    });
  });

  it('rejects files that are not JSON or ZIP', async () => {
    const file = new File(['not an export'], 'export.txt');

    await expect(parseInstagramFile(file)).rejects.toThrow(
      'Formato file non riconosciuto. Seleziona un archivio ZIP o un JSON Instagram.',
    );
  });

  it('rejects ZIP entries with path traversal', async () => {
    const zip = new JSZip();
    zip.file('foo/bar.json', JSON.stringify([{ value: 'alice' }]));
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    const bytes = new Uint8Array(buffer);
    const encoder = new TextEncoder();
    const originalName = encoder.encode('foo/bar.json');
    const traversalName = encoder.encode('../evil.json');
    let replaced = 0;

    for (let offset = 0; offset <= bytes.length - originalName.length; offset += 1) {
      if (originalName.every((byte, index) => bytes[offset + index] === byte)) {
        bytes.set(traversalName, offset);
        replaced += 1;
      }
    }

    expect(replaced).toBe(2);
    await expect(
      parseInstagramFile(new File([buffer], 'export.zip', { type: 'application/zip' })),
    ).rejects.toThrow('Percorso ZIP non sicuro.');
  });

  it('rejects highly compressible ZIP entries before extraction', async () => {
    const zip = new JSZip();
    zip.file('followers_1.json', JSON.stringify({ followers: ['a'.repeat(30_000)] }));
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    await expect(
      parseInstagramFile(new File([blob], 'export.zip', { type: 'application/zip' })),
    ).rejects.toThrow('Archivio oltre i limiti di decompressione consentiti.');
  });
});
