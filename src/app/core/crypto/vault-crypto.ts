const FORMAT_VERSION = new TextEncoder().encode('instascope-snapshot-v1');
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 310_000;

function bytesToBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  cryptoApi: Crypto,
): Promise<CryptoKey> {
  const material = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return cryptoApi.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedPayload {
  salt: string;
  iv: string;
  ciphertext: string;
}

export async function createVaultSalt(cryptoApi: Crypto = globalThis.crypto): Promise<string> {
  return bytesToBase64(cryptoApi.getRandomValues(new Uint8Array(SALT_LENGTH)));
}

export async function encryptPayload(
  value: unknown,
  passphrase: string,
  salt: string,
  cryptoApi: Crypto = globalThis.crypto,
): Promise<EncryptedPayload> {
  if (passphrase.length < 12) {
    throw new Error('La passphrase deve contenere almeno 12 caratteri.');
  }

  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH));
  const saltBytes = base64ToBytes(salt);
  if (saltBytes.length !== SALT_LENGTH) {
    throw new Error('Salt di cifratura non valido.');
  }

  const key = await deriveKey(passphrase, saltBytes, cryptoApi);
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: FORMAT_VERSION },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );

  return {
    salt,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptPayload<T>(
  encrypted: EncryptedPayload,
  passphrase: string,
  cryptoApi: Crypto = globalThis.crypto,
): Promise<T> {
  const salt = base64ToBytes(encrypted.salt);
  const iv = base64ToBytes(encrypted.iv);
  if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH) {
    throw new Error('Payload cifrato non valido.');
  }

  const key = await deriveKey(passphrase, salt, cryptoApi);
  const plaintext = await cryptoApi.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: FORMAT_VERSION },
    key,
    base64ToBytes(encrypted.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
