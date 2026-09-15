import { expect, test } from "@playwright/test"

async function session(page: import("@playwright/test").Page, userId: string) {
  await page.request.post("/api/v1/prototype/session", { data: { userId } })
}

async function reset(page: import("@playwright/test").Page) {
  await session(page, "manager-sarah")
  await page.request.post("/api/v1/prototype/reset", { data: { confirmation: "RESET DOC+FIND DEMO" } })
}

test("clinic publishes a vacancy, doctor applies, clinic sends terms and doctor accepts explicitly", async ({ page }) => {
  await reset(page)
  await page.goto("/clinic/org-harley/hiring/vacancies")
  await page.getByRole("button", { name: "Create vacancy" }).click()
  await page.getByLabel("Vacancy title").fill("November community dermatology clinic")
  await page.getByLabel("Clinical scope").fill("Adult outpatient dermatology")
  await page.getByLabel("Rate per session").fill("640")
  await page.getByLabel("First session").fill("2026-11-07T09:00")
  await page.getByRole("button", { name: "Publish vacancy" }).click()
  await expect(page.getByText("November community dermatology clinic")).toBeVisible()

  await session(page, "doctor-theo")
  await page.goto("/doctor/find-work")
  const opportunity = page.locator("article").filter({ has: page.getByRole("heading", { name: "November community dermatology clinic" }) })
  await opportunity.getByRole("checkbox").check()
  await opportunity.getByRole("button", { name: "Apply for 1 date" }).click()
  await expect(opportunity.getByRole("link", { name: "View Applied" })).toBeVisible()

  await session(page, "manager-sarah")
  await page.goto("/clinic/org-harley/hiring/candidates?q=November&stage=all")
  await page.getByRole("link", { name: /Dr Theo Martin/ }).click()
  await page.getByRole("button", { name: "Shortlist" }).click()
  await page.getByRole("button", { name: "Start discussion" }).click()
  await page.getByRole("button", { name: "Create offer" }).click()
  await page.getByLabel("Rate per session").fill("640")
  await page.getByRole("button", { name: "Send £640 offer" }).click()

  const stateResponse = await page.request.get("/api/v1/workspace/state")
  const stateResult = await stateResponse.json()
  const offer = stateResult.data.offers.find((item: { status: string; rateMinor: number }) => item.status === "sent" && item.rateMinor === 64000)
  expect(offer).toBeTruthy()

  await session(page, "doctor-theo")
  await page.goto(`/offers/${offer.id}`)
  await expect(page.getByText("Reviewing this page does not accept the offer.")).toBeVisible()
  await page.getByRole("button", { name: "Accept displayed version" }).click()
  await expect(page.locator(".df-status.success", { hasText: "Accepted" })).toBeVisible()
  await expect(page.getByText("Evidence needed", { exact: true })).toBeVisible()
})

test("direct invitation merges into an existing application and preserves one engagement", async ({ page }) => {
  await reset(page)
  await page.goto("/clinic/org-harley/doctors")
  const doctor = page.locator("article").filter({ has: page.getByRole("heading", { name: "Dr Theo Martin" }) })
  await doctor.getByRole("button", { name: "Invite" }).click()

  const stateResponse = await page.request.get("/api/v1/workspace/state")
  const stateResult = await stateResponse.json()
  const matches = stateResult.data.engagements.filter((item: { doctorId: string; requirementId: string }) => item.doctorId === "doctor-theo" && item.requirementId === "req-harley-october")
  expect(matches).toHaveLength(1)
  expect(matches[0].origins).toEqual(["application", "invitation"])
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

test("mobile workspace menu switches between seeded users and role workspaces", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Mobile navigation behaviour")
  await reset(page)
  await page.goto("/clinic/org-harley/today")
  await page.getByRole("button", { name: "Open workspace menu" }).click()
  const menu = page.getByRole("dialog")
  await menu.getByLabel("Switch demo user").selectOption("doctor-anika")
  await expect(page).toHaveURL(/\/doctor\/today/)
  await expect(page.getByText("Doctor workspace", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Open workspace menu" }).click()
  await page.getByRole("dialog").getByLabel("Switch demo user").selectOption("manager-sarah")
  await expect(page).toHaveURL(/\/clinic\/org-harley\/today/)
  await expect(page.getByText("Clinic workspace", { exact: true })).toBeVisible()
})
