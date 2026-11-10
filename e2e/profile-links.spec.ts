import { expect, test } from '@playwright/test';

test('profile usernames link to Instagram in a new tab across data pages', async ({ page }) => {
  const cases = [
    { path: '/demo', username: 'demo_user_004' },
    { path: '/demo/unfollow', username: 'demo_user_002', tab: 'Non li seguo più' },
    { path: '/demo/pending-requests', username: 'demo_user_011' },
    { path: '/demo/relationships', username: 'demo_user_006' },
    { path: '/demo/recent', username: 'demo_user_004' },
    { path: '/demo/recommendations', username: 'demo_user_004' },
  ];

  for (const { path, username, tab } of cases) {
    await page.goto(path);
    if (tab) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
    }

    const profileLinks = page.getByRole('link', { name: username, exact: true });
    await expect(profileLinks.first()).toHaveAttribute(
      'href',
      `https://www.instagram.com/${username}/`,
    );
    const linkCount = await profileLinks.count();
    expect(linkCount, `${path} should show a profile link for ${username}`).toBeGreaterThan(0);

    for (let index = 0; index < linkCount; index += 1) {
      const profileLink = profileLinks.nth(index);
      await expect(profileLink).toHaveAttribute('href', `https://www.instagram.com/${username}/`);
      await expect(profileLink).toHaveAttribute('target', '_blank');
      await expect(profileLink).toHaveAttribute('rel', 'noopener noreferrer');
    }
  }
});
