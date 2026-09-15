import { expect, test } from "@playwright/test"

test("clinic candidate selection remains in the URL and unauthorised tenant routes are rejected", async ({ page }) => {
  await page.request.post("/api/v1/prototype/session", { data: { userId: "manager-sarah" } })
  await page.goto("/clinic/org-harley/hiring/candidates?stage=applied&candidateId=eng-theo-harley")
  await expect(page.getByRole("heading", { name: "Dr Theo Martin" })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/candidateId=eng-theo-harley/)
  await expect(page.getByRole("heading", { name: "Dr Theo Martin" })).toBeVisible()

  await page.goto("/clinic/org-riverside/today")
  await expect(page).toHaveURL(/clinic\/org-harley\/today/)
})

test("hiring workspace search and offer register remain route-aware", async ({ page }) => {
  await page.request.post("/api/v1/prototype/session", { data: { userId: "manager-sarah" } })
  await page.goto("/clinic/org-harley/hiring/candidates")
  await page.getByLabel("Search candidates").fill("Theo")
  await expect(page).toHaveURL(/q=Theo/)
  await expect(page.getByRole("link", { name: /Dr Theo Martin/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /Dr Priya Shah/ })).toHaveCount(0)

  await page.getByRole("navigation", { name: "Hiring views" }).getByRole("link", { name: "Offers" }).click()
  await expect(page).toHaveURL(/hiring\/offers/)
  await expect(page.getByRole("heading", { name: "Offers" })).toBeVisible()
  await expect(page.getByText("Offer register")).toBeVisible()
  await expect(page.locator("tbody tr")).toHaveCount(3)
})

test("doctor Profile navigation opens the resumable onboarding page", async ({ page }) => {
  await page.request.post("/api/v1/prototype/session", { data: { userId: "doctor-anika" } })
  await page.goto("/doctor/today")
  const navigationName = (page.viewportSize()?.width ?? 0) < 768 ? "Mobile navigation" : "Account navigation"
  await page.getByRole("navigation", { name: navigationName }).getByRole("link", { name: "Profile" }).click()
  await expect(page).toHaveURL(/onboarding\/doctor/)
  await expect(page.getByRole("heading", { name: "Professional profile" })).toBeVisible()
  await expect(page.getByLabel("Specialty")).toHaveValue("Dermatology")
  await expect(page.getByRole("button", { name: "Save and continue later" })).toBeVisible()
})
