// Runtime validation coverage for: AES-GCM vault payload encryption.
import { describe, expect, it } from 'vitest';
import { createVaultSalt, decryptPayload, encryptPayload } from './vault-crypto';

describe('vault crypto', () => {
  it('round-trips an encrypted payload without exposing its plaintext', async () => {
    const payload = { datasets: { followers: [{ username: 'synthetic_user' }] } };
    const salt = await createVaultSalt();
    const encrypted = await encryptPayload(payload, 'a sufficiently long passphrase', salt);

    expect(encrypted.ciphertext).not.toContain('synthetic_user');
    await expect(decryptPayload(encrypted, 'a sufficiently long passphrase')).resolves.toEqual(
      payload,
    );
  });

  it('rejects short passphrases and a wrong passphrase', async () => {
    const salt = await createVaultSalt();

    await expect(encryptPayload({}, 'too short', salt)).rejects.toThrow(
      'La passphrase deve contenere almeno 12 caratteri.',
    );

    const encrypted = await encryptPayload({}, 'a sufficiently long passphrase', salt);
    await expect(decryptPayload(encrypted, 'a different long passphrase')).rejects.toThrow();
  });
});
