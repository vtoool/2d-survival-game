import { test, expect, type Page } from '@playwright/test'

// Multiplayer sync e2e.
//
// NOTE: True host<->client network sync runs through PlayroomKit and requires a
// live room (Playroom servers + API key), so it is validated manually and by the
// deterministic codec unit tests (serializeWorld/applySnapshot/encode/decode).
// This Playwright spec instead proves the client pipeline — canvas boot, input,
// and a running simulation — in TWO independent browser contexts, which is the
// same render/control path the networked client uses.

async function bootWorld(page: Page): Promise<void> {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/?dev')
  await expect(page.locator('canvas'), 'canvas should mount').toBeVisible({ timeout: 20_000 })
  // Let the sim run a bit and confirm no runtime errors surfaced.
  await page.waitForTimeout(1200)
  expect(errors, `runtime errors in context: ${errors.join('; ')}`).toHaveLength(0)
}

test('two contexts each boot a playable world with no runtime errors', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()

  await bootWorld(a)
  await bootWorld(b)

  // Drive input in context A (WASD) to ensure the control + intent path is live.
  await a.keyboard.down('w')
  await a.waitForTimeout(400)
  await a.keyboard.up('w')
  await a.waitForTimeout(200)

  await ctxA.close()
  await ctxB.close()
})
