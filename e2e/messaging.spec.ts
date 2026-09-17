import { expect, test } from "@playwright/test"

async function session(page: import("@playwright/test").Page, userId: string) { await page.request.post("/api/v1/prototype/session", { data: { userId } }) }

// Matches the app's own date() helper (SapphireWorkspace.tsx) so this assertion tracks "today" instead of a fixed calendar date.
const today = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date())
const seenToday = new RegExp(`Seen ${today.replace(/\s/g, "\\s")}`)

test("clinic message, price proposal and first-seen timestamp persist across roles", async ({ page }) => {
  await session(page, "manager-sarah")
  const resetResponse = await page.request.post("/api/v1/prototype/reset", { data: { confirmation: "RESET DOC+FIND DEMO" } })
  if (!resetResponse.ok()) throw new Error(`Demo reset failed (${resetResponse.status()}): ${await resetResponse.text()}`)
  await page.goto("/engagements/eng-anika-harley")
  await page.getByPlaceholder("Write a clear staffing message").fill("We can offer £625 per four-hour clinic. Please review the dates.")
  await page.getByRole("spinbutton").fill("625")
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/messages") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Send" }).click(),
  ])
  await expect(page.getByText("£625 per session")).toBeVisible()
  await expect(page.getByText(/Delivered/).last()).toBeVisible()

  await session(page, "doctor-anika")
  await page.goto("/engagements/eng-anika-harley")
  await expect(page.getByText("We can offer £625 per four-hour clinic. Please review the dates.")).toBeVisible()
  await page.getByPlaceholder("Write a clear staffing message").fill("Thank you. The dates work for me and I am happy to discuss the terms.")
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/messages") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Send" }).click(),
  ])

  await session(page, "manager-sarah")
  await page.goto("/clinic/org-harley/inbox")
  const unreadConversation = page.locator(".df-message-preview.unread").filter({ hasText: "Dr Anika Rao" })
  await expect(unreadConversation).toBeVisible()
  await unreadConversation.click()
  await expect(page).toHaveURL(/engagements\/eng-anika-harley/)
  await expect(page.locator(".df-bubble").getByText("Thank you. The dates work for me and I am happy to discuss the terms.")).toBeVisible()
  await expect(page.getByText(seenToday).last()).toBeVisible()

  await session(page, "doctor-anika")
  await page.goto("/engagements/eng-anika-harley")
  await expect(page.getByText(seenToday).last()).toBeVisible()
})
