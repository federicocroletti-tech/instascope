import { describe, expect, it } from 'vitest';
import { instagramProfileUrl } from './instagram-profile-url';

describe('instagramProfileUrl', () => {
  it('creates a profile URL from the username', () => {
    expect(instagramProfileUrl('sample_user.1')).toBe('https://www.instagram.com/sample_user.1/');
  });

  it('encodes path separators in usernames', () => {
    expect(instagramProfileUrl('someone/else')).toBe('https://www.instagram.com/someone%2Felse/');
  });
});
