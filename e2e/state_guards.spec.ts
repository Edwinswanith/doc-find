import { expect, test, type Page } from "@playwright/test"

async function openWorkspacePage(page: Page, name: string) {
  if ((page.viewportSize()?.width ?? 0) > 760) await page.getByRole("tab", { name }).click()
  else await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("button", { name }).click()
}

test("advanced engagements cannot replay apply or invite commands", async ({ page }) => {
  await page.request.post("/api/v1/prototype/reset")
  await page.goto("/")
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached()

  await openWorkspacePage(page, "Find work")
  await expect(page.getByRole("button", { name: "Application submitted" })).toBeDisabled()
  await expect(page.locator('.notice[role="alert"]')).toHaveCount(0)

  await page.getByLabel("Switch prototype user").selectOption("manager-sarah")
  await openWorkspacePage(page, "Find doctors")
  await expect(page.getByRole("button", { name: "Invitation in progress" })).toBeDisabled()
  await expect(page.locator('.notice[role="alert"]')).toHaveCount(0)
})
