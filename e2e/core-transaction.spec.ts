import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

async function session(page: import("@playwright/test").Page, userId: string) {
  await page.request.post("/api/v1/prototype/session", { data: { userId } })
}

async function reset(page: import("@playwright/test").Page) {
  await session(page, "manager-sarah")
  const response = await page.request.post("/api/v1/prototype/reset", { data: { confirmation: "RESET DOC+FIND DEMO" } })
  if (!response.ok()) throw new Error(`Demo reset failed (${response.status()}): ${await response.text()}`)
}

test("offer review is read-only and explicit acceptance remains distinct from readiness", async ({ page }) => {
  await reset(page)
  await session(page, "doctor-anika")
  await page.goto("/offers/offer-anika-v2")
  await expect(page.getByText("Reviewing this page does not accept the offer.")).toBeVisible()
  await expect(page.getByText("Sent", { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText("Sent", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Accept displayed version" }).click()
  await expect(page.locator(".df-status.success", { hasText: "Accepted" })).toBeVisible()
  await expect(page.getByText("Approval required", { exact: true })).toBeVisible()
  await expect(page.getByText("Clinical approval is required for this site and scope.")).toBeVisible()
})

test("doctor Today has no serious accessibility violations", async ({ page }) => {
  await reset(page)
  await session(page, "doctor-anika")
  await page.goto("/doctor/today")
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([])
})
