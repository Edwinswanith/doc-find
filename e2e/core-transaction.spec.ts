import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test("core transaction remains distinct from readiness and payment", async ({ page }) => {
  await page.request.post("/api/v1/prototype/reset")
  await page.goto("/")
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached()
  await expect(page.getByRole("heading", { name: "Good afternoon, Anika" })).toBeVisible()
  await page.getByRole("button", { name: "Review offer" }).click()
  await expect(page.getByText("Confirmed · checks outstanding")).toBeVisible()

  await page.getByLabel("Switch prototype user").selectOption("approver-james")
  await page.getByRole("button", { name: "Approve this scope" }).click()
  await page.getByRole("button", { name: "Mark ready for work" }).click()

  await page.getByLabel("Switch prototype user").selectOption("doctor-anika")
  await expect(page.getByText("Ready for work").first()).toBeVisible()
  await page.getByRole("button", { name: "Mark session complete" }).click()

  await page.getByLabel("Switch prototype user").selectOption("finance-maya")
  await page.getByRole("button", { name: "Record invoice submission" }).click()
  await expect(page.getByText("Invoice submitted").first()).toBeVisible()
  await page.getByRole("button", { name: "Confirm payment received" }).click()
  await expect(page.getByText("Payment confirmed")).toBeVisible()
})

test("critical mobile screen has no serious axe violations", async ({ page }) => {
  await page.request.post("/api/v1/prototype/reset")
  await page.goto("/")
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([])
})
