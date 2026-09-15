import { expect, test } from "@playwright/test"

async function session(page: import("@playwright/test").Page, userId: string) { await page.request.post("/api/v1/prototype/session", { data: { userId } }) }

test("clinic message, price proposal and first-seen timestamp persist across roles", async ({ page }) => {
  await session(page, "manager-sarah")
  await page.request.post("/api/v1/prototype/reset", { data: { confirmation: "RESET DOC+FIND DEMO" } })
  await page.goto("/engagements/eng-theo-harley")
  await page.getByPlaceholder("Write a clear staffing message").fill("We can offer £625 per four-hour clinic. Please review the dates.")
  await page.getByRole("spinbutton").fill("625")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByText("£625 per session")).toBeVisible()
  await expect(page.getByText(/Delivered/)).toBeVisible()

  await session(page, "doctor-theo")
  await page.goto("/engagements/eng-theo-harley")
  await expect(page.getByText("We can offer £625 per four-hour clinic. Please review the dates.")).toBeVisible()
  await page.getByPlaceholder("Write a clear staffing message").fill("Thank you. The dates work for me and I am happy to discuss the terms.")
  await page.getByRole("button", { name: "Send message" }).click()

  await session(page, "manager-sarah")
  await page.goto("/clinic/org-harley/inbox")
  const unreadConversation = page.locator(".df-message-preview.unread").filter({ hasText: "Dr Theo Martin" })
  await expect(unreadConversation).toBeVisible()
  await unreadConversation.click()
  await expect(page).toHaveURL(/engagements\/eng-theo-harley/)
  await expect(page.locator(".df-bubble").getByText("Thank you. The dates work for me and I am happy to discuss the terms.")).toBeVisible()
  await expect(page.getByText(/Seen 15 Sept 2026/)).toBeVisible()

  await session(page, "doctor-theo")
  await page.goto("/engagements/eng-theo-harley")
  await expect(page.getByText(/Seen 15 Sept 2026/).last()).toBeVisible()
})
