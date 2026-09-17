import { expect, test } from "@playwright/test"

test("clinic candidate selection remains in the URL and unauthorised tenant routes are rejected", async ({ page }) => {
  await page.request.post("/api/v1/prototype/session", { data: { userId: "manager-sarah" } })
  await page.goto("/clinic/org-harley/hiring/candidates?stage=all&candidateId=eng-anika-harley")
  await expect(page.getByRole("heading", { name: "Dr Anika Rao" })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/candidateId=eng-anika-harley/)
  await expect(page.getByRole("heading", { name: "Dr Anika Rao" })).toBeVisible()

  await page.goto("/clinic/org-other/today")
  await expect(page).toHaveURL(/clinic\/org-harley\/today/)
})

test("hiring workspace search and offer register remain route-aware", async ({ page }) => {
  await page.request.post("/api/v1/prototype/session", { data: { userId: "manager-sarah" } })
  await page.goto("/clinic/org-harley/hiring/candidates")
  await page.getByLabel("Search candidates").fill("Anika")
  await expect(page).toHaveURL(/q=Anika/)
  await expect(page.getByRole("link", { name: /Dr Anika Rao/ })).toBeVisible()
  await page.getByLabel("Search candidates").fill("No Such Candidate")
  await expect(page.getByRole("link", { name: /Dr Anika Rao/ })).toHaveCount(0)

  await page.getByRole("navigation", { name: "Hiring views" }).getByRole("link", { name: "Offers" }).click()
  await expect(page).toHaveURL(/hiring\/offers/)
  await expect(page.getByRole("heading", { name: "Offers" })).toBeVisible()
  await expect(page.getByText("Offer register")).toBeVisible()
})

test("doctor Profile navigation opens the resumable onboarding wizard", async ({ page }) => {
  await page.request.post("/api/v1/prototype/session", { data: { userId: "doctor-anika" } })
  await page.goto("/doctor/today")
  // The workspace always renders as the mobile-app frame, so this is the only navigation landmark that ever exists.
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Profile" }).click()
  await expect(page).toHaveURL(/onboarding\/doctor/)
  await expect(page.getByRole("heading", { name: "Complete your professional profile" })).toBeVisible()
  // The fixture's saved draft resumes at step 3 ("Work preferences"), pre-filled from her real profile.
  await expect(page.getByText("Step 3 of 5")).toBeVisible()
  await expect(page.locator('input[name="minimumRateMinor"]')).toHaveValue("600")
  await expect(page.getByRole("button", { name: "Save and continue later" })).toBeVisible()
})
