import { expect, test } from "@playwright/test"

async function session(page: import("@playwright/test").Page, userId: string) {
  await page.request.post("/api/v1/prototype/session", { data: { userId } })
}

async function reset(page: import("@playwright/test").Page) {
  await session(page, "manager-sarah")
  const response = await page.request.post("/api/v1/prototype/reset", { data: { confirmation: "RESET DOC+FIND DEMO" } })
  if (!response.ok()) throw new Error(`Demo reset failed (${response.status()}): ${await response.text()}`)
}

test("clinic can approve readiness once a doctor accepts, and both Today pages show Confirmed & ready", async ({ page }) => {
  await reset(page)

  await session(page, "doctor-anika")
  await page.goto("/offers/offer-anika-v2")
  await page.getByRole("button", { name: "Accept displayed version" }).click()
  await expect(page.locator(".df-status.success", { hasText: "Accepted" })).toBeVisible()

  await page.goto("/doctor/today")
  const doctorEntry = page.locator(".df-record", { hasText: "Harley Street" }).first()
  await expect(doctorEntry.getByText("Confirmed · readiness pending")).toBeVisible()

  await session(page, "manager-sarah")
  await page.goto("/clinic/org-harley/today")
  const clinicEntry = page.locator(".df-record", { hasText: "Dr Anika Rao" }).first()
  await expect(clinicEntry.getByText("Confirmed · readiness pending")).toBeVisible()
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/v1/workflow/command") && response.status() === 200),
    clinicEntry.getByRole("button", { name: "Approve readiness" }).click(),
  ])
  await expect(clinicEntry.getByText("Confirmed & ready")).toBeVisible()

  await session(page, "doctor-anika")
  await page.goto("/doctor/today")
  await expect(page.locator(".df-record", { hasText: "Harley Street" }).first().getByText("Confirmed & ready")).toBeVisible()
})
