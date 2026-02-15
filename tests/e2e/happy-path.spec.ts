import { test, expect } from '@playwright/test';

test('happy path: add, edit, delete an agent', async ({ page }) => {
  const agentName = 'Sales Agent';
  const objective1 = 'Help sales team qualify leads';
  const objective2 = 'Updated objective for release smoke test';

  await page.goto('/e2e');

  // App boot + seeded canvas selected.
  await expect(page.locator('.toolbar__title')).toHaveText('Demo Canvas');

  // Create agent.
  await page.getByRole('banner').getByRole('button', { name: 'Add Agent' }).click();
  await page.locator('#agent-name').fill(agentName);
  await page.locator('#agent-phase').fill('Backlog');
  await page.locator('#agent-objective').fill(objective1);
  await page.getByRole('button', { name: 'Create Agent' }).click();

  const card = page.locator('[data-agent-id]').filter({ hasText: agentName });
  await expect(card).toBeVisible();
  await expect(card.locator('.agent-card__objective')).toHaveText(objective1);

  // Open Quick Look by clicking the card content (not the menu).
  await card.locator('.agent-card__name').click();
  const quickLook = page.getByRole('dialog', { name: `Agent details: ${agentName}` });
  await expect(quickLook).toBeVisible();

  // Edit from Quick Look.
  await quickLook.getByRole('button', { name: 'Edit Agent' }).click();
  await expect(page.locator('.modal__header h2')).toHaveText('Edit Agent');
  await page.locator('#agent-objective').fill(objective2);
  await page.getByRole('button', { name: 'Update Agent' }).click();
  await expect(card.locator('.agent-card__objective')).toHaveText(objective2);

  // Delete via card menu (accept native confirm).
  await card.getByRole('button', { name: 'More actions' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await card.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('[data-agent-id]').filter({ hasText: agentName })).toHaveCount(0);

  // Smoke that canvas switching still works.
  await page.getByRole('button', { name: 'Secondary Canvas' }).click();
  await expect(page.locator('.toolbar__title')).toHaveText('Secondary Canvas');
  await expect(page.getByText('No agents found')).toBeVisible();
});
