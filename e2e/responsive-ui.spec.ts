import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

async function session(page: import("@playwright/test").Page, userId: string) {
  await page.request.post("/api/v1/prototype/session", { data: { userId } })
}

test("primary workspaces remain within the document at all supported widths", async ({ page }) => {
  await session(page, "manager-sarah")
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
    await page.goto("/clinic/org-harley/hiring/candidates?stage=all")
    await expect(page.getByRole("heading", { name: "Candidates" })).toBeVisible()
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
    expect(dimensions.scroll, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.client)
  }
})

test("mobile candidates use readable records instead of a horizontally panned table", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await session(page, "manager-sarah")
  await page.goto("/clinic/org-harley/hiring/candidates?stage=all")
  const firstRecord = page.locator(".df-responsive-table tbody tr").first()
  await expect(firstRecord).toHaveCSS("display", "grid")
  expect(await firstRecord.locator("td").first().evaluate((element) => getComputedStyle(element, "::before").content)).toContain("Doctor")
  await expect(firstRecord.getByRole("link")).toBeVisible()
})

test("desktop navigation can collapse and global search opens from the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await session(page, "manager-sarah")
  await page.goto("/clinic/org-harley/today")
  await page.getByRole("button", { name: "Collapse navigation" }).click()
  await expect(page.locator(".df-shell")).toHaveClass(/is-navigation-collapsed/)
  await page.keyboard.press("Control+k")
  await expect(page.getByRole("dialog", { name: "Search Doc+Find" })).toBeVisible()
  await page.getByPlaceholder("Search views, doctors or vacancies").fill("Theo")
  await expect(page.getByRole("dialog").getByRole("link", { name: /Dr Theo Martin/ })).toBeVisible()
})

test("completed demonstration lifecycle remains visible as seven separate stages", async ({ page }) => {
  await session(page, "doctor-sofia")
  await page.goto("/doctor/today")
  const lifecycle = page.getByRole("list", { name: "Engagement lifecycle" })
  await expect(lifecycle).toBeVisible()
  await expect(lifecycle.locator("li.complete")).toHaveCount(7)
  await expect(lifecycle.getByText("Accepted", { exact: true })).toBeVisible()
  await expect(lifecycle.getByText("Ready", { exact: true })).toBeVisible()
  await expect(lifecycle.getByText("Paid", { exact: true })).toBeVisible()
})

test("critical clinic and doctor destinations have no serious accessibility violations", async ({ page }) => {
  const destinations = [
    { user: "manager-sarah", route: "/clinic/org-harley/today" },
    { user: "manager-sarah", route: "/clinic/org-harley/hiring/candidates?stage=all" },
    { user: "manager-sarah", route: "/clinic/org-harley/inbox" },
    { user: "doctor-anika", route: "/doctor/today" },
    { user: "doctor-anika", route: "/offers/offer-anika-v2" },
    { user: "doctor-anika", route: "/onboarding/doctor" },
  ]
  for (const destination of destinations) {
    await session(page, destination.user)
    await page.goto(destination.route)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious"), destination.route).toEqual([])
  }
})
