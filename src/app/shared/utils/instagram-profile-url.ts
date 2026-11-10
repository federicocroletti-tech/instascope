export function instagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${encodeURIComponent(username)}/`;
}
