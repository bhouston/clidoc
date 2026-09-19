import { expect, test } from '@playwright/test';

test('homepage leads to generated CLI and core documentation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CLI documentation from the source' })).toBeVisible();
  await expect(page.getByText('Built upon the OpenCLI specification')).toBeVisible();

  await page.getByRole('link', { name: 'Explore the CLI' }).click();
  await expect(page).toHaveURL(/\/docs\/cli\/reference\/?$/);
  await expect(page.getByRole('heading', { name: /clidoc/i }).first()).toBeVisible();

  await page.getByRole('link', { name: 'Core API' }).click();
  await expect(page).toHaveURL(/\/docs\/api\/?$/);
  await expect(page.getByText('parse', { exact: true }).first()).toBeVisible();
});
