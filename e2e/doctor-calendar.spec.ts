import { expect, test } from "@playwright/test"

async function session(page: import("@playwright/test").Page, userId: string) {
  await page.request.post("/api/v1/prototype/session", { data: { userId } })
}

async function reset(page: import("@playwright/test").Page) {
  await session(page, "manager-sarah")
  const response = await page.request.post("/api/v1/prototype/reset", { data: { confirmation: "RESET DOC+FIND DEMO" } })
  if (!response.ok()) throw new Error(`Demo reset failed (${response.status()}): ${await response.text()}`)
}

test("doctor Today calendar surfaces pending shifts and matching vacancies, and links through to their detail pages", async ({ page }) => {
  await reset(page)
  await session(page, "doctor-anika")
  await page.goto("/doctor/today")
  await expect(page.getByRole("heading", { name: "Your work at a glance" })).toBeVisible()

  // The default selected day is today, which has no seeded activity.
  await expect(page.getByText("Nothing on this day")).toBeVisible()

  // The seeded requirement's occurrences fall in the following month relative to "today".
  await page.getByRole("button", { name: "Next month" }).click()

  // occ-06 is already part of the doctor's own offer_sent engagement -- a pending shift, not a
  // vacancy. It's the only thing happening that day, so the click both renders the entry (proving the
  // status wording) and redirects straight to its detail page (the single-item day shortcut).
  await page.getByRole("button", { name: /\b6 October/ }).click()
  const workEntry = page.locator(".df-cal-entry", { hasText: "Harley Street" }).first()
  await expect(workEntry.getByText("Awaiting offer")).toBeVisible()
  await expect(page).toHaveURL(/engagements\/eng-anika-harley/)

  // occ-20 belongs to the same published requirement but was never selected by the doctor, so it
  // surfaces as an open vacancy that matches the doctor's own specialty, and is likewise the only
  // thing on 20 October, so the click redirects straight to Find work.
  await page.goto("/doctor/today")
  await page.getByRole("button", { name: "Next month" }).click()
  await page.getByRole("button", { name: /\b20 October/ }).click()
  const vacancyEntry = page.locator(".df-cal-entry.vacancy", { hasText: "Harley Street" })
  await expect(vacancyEntry.getByText("Matches you")).toBeVisible()
  await expect(page).toHaveURL(/doctor\/find-work/)
})
