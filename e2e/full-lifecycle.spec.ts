import { expect, test } from "@playwright/test"

async function session(page: import("@playwright/test").Page, userId: string) {
  await page.request.post("/api/v1/prototype/session", { data: { userId } })
}

async function reset(page: import("@playwright/test").Page) {
  await session(page, "manager-sarah")
  const response = await page.request.post("/api/v1/prototype/reset", { data: { confirmation: "RESET DOC+FIND DEMO" } })
  if (!response.ok()) throw new Error(`Demo reset failed (${response.status()}): ${await response.text()}`)
}

test("clinic publishes a vacancy, doctor applies, clinic sends terms and doctor accepts explicitly", async ({ page }) => {
  await reset(page)
  await page.goto("/clinic/org-harley/hiring/vacancies")
  await page.getByRole("button", { name: "Create vacancy" }).click()
  await page.getByLabel("Vacancy title").fill("November community dermatology clinic")
  await page.getByLabel("Clinical scope").fill("Adult outpatient dermatology")
  await page.getByLabel("Rate per session").fill("640")
  await page.getByLabel("First session date").fill("2026-11-07")
  await page.getByRole("button", { name: "Publish vacancy" }).click()
  await expect(page.getByText("November community dermatology clinic")).toBeVisible()

  await session(page, "doctor-anika")
  await page.goto("/doctor/find-work")
  const opportunity = page.locator("article").filter({ has: page.getByRole("heading", { name: "November community dermatology clinic" }) })
  await opportunity.getByRole("checkbox").check()
  await opportunity.getByRole("button", { name: "Apply for 1 date" }).click()
  await expect(opportunity.getByRole("link", { name: "View Applied" })).toBeVisible()

  await session(page, "manager-sarah")
  await page.goto("/clinic/org-harley/hiring/candidates?q=November&stage=all")
  await page.getByRole("link", { name: /Dr Anika Rao/ }).click()
  await page.getByRole("button", { name: "Shortlist" }).click()
  await page.getByRole("button", { name: "Start discussion" }).click()
  await page.getByRole("button", { name: "Create offer" }).click()
  await page.getByLabel("Rate per session").fill("640")
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/v1/workflow/command") && response.status() === 200),
    page.getByRole("button", { name: "Send £640 offer" }).click(),
  ])

  const stateResponse = await page.request.get("/api/v1/workspace/state")
  const stateResult = await stateResponse.json()
  const offer = stateResult.data.offers.find((item: { status: string; rateMinor: number }) => item.status === "sent" && item.rateMinor === 64000)
  expect(offer).toBeTruthy()

  await session(page, "doctor-anika")
  await page.goto(`/offers/${offer.id}`)
  await expect(page.getByText("Reviewing this page does not accept the offer.")).toBeVisible()
  await page.getByRole("button", { name: "Accept displayed version" }).click()
  await expect(page.locator(".df-status.success", { hasText: "Accepted" })).toBeVisible()
  await expect(page.getByText("Approval required", { exact: true })).toBeVisible()
})

test("mobile workspace menu exposes every authorised hiring destination", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Mobile navigation behaviour")
  await reset(page)
  await page.goto("/clinic/org-harley/today")
  await page.getByRole("button", { name: "Open workspace menu" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("dialog").getByLabel("Filter workspace navigation").fill("Offers")
  await page.getByRole("dialog").getByRole("link", { name: "Offers" }).click()
  await expect(page).toHaveURL(/hiring\/offers/)
  await expect(page.getByRole("heading", { name: "Offers" })).toBeVisible()
})
