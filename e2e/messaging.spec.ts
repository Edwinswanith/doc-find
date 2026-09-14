import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

async function switchUser(page: import("@playwright/test").Page, userId: string) {
  await page.getByLabel("Switch prototype user").selectOption(userId)
}

async function openInbox(page: import("@playwright/test").Page) {
  const desktopTab = page.getByRole("tab", { name: "Inbox" })
  if (await desktopTab.isVisible()) await desktopTab.click()
  else await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("button", { name: "Inbox" }).click()
}

test("clinic reviews multiple doctor approaches and the doctor receives a seen timestamp", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached()
  await switchUser(page, "manager-sarah")

  await page.getByRole("button", { name: /Open notifications, 3 unread/ }).click()
  await expect(page.getByText("3 conversations need attention")).toBeVisible()
  await page.getByRole("button", { name: /Dr Theo Martin approached your clinic/ }).click()

  await expect(page.getByRole("heading", { name: "Dr Theo Martin" })).toBeVisible()
  await expect(page.locator(".thread-messages").getByText("I am available for all three October dates", { exact: false })).toBeVisible()

  await switchUser(page, "doctor-theo")
  await openInbox(page)
  await expect(page.getByText(/Seen 14 Sept, \d{2}:\d{2}/)).toBeVisible()
})

test("clinic sends a message with a price and receives a read receipt after the doctor opens it", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached()
  await switchUser(page, "manager-sarah")
  await openInbox(page)

  await page.getByRole("button", { name: /Dr Anika Rao October outpatient clinics/ }).click()
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("We can offer two supported Tuesday sessions. Would £625 per session work for you?")
  await page.getByLabel("Price per session").fill("625")
  await page.getByRole("button", { name: "Send message + price" }).click()
  await expect(page.getByText("£625", { exact: true })).toBeVisible()
  await expect(page.getByText(/Sent 14 Sept, \d{2}:\d{2}/).last()).toBeVisible()

  await switchUser(page, "doctor-anika")
  await page.getByRole("button", { name: /Open notifications, 2 unread/ }).click()
  await page.getByRole("button", { name: /Harley Street Skin Centre contacted you/ }).click()
  await expect(page.locator(".thread-messages").getByText("Would £625 per session work for you?", { exact: false })).toBeVisible()
  await expect(page.getByText("£625", { exact: true })).toBeVisible()

  await switchUser(page, "manager-sarah")
  await openInbox(page)
  await page.getByRole("button", { name: /Dr Anika Rao October outpatient clinics/ }).click()
  await expect(page.getByText(/Seen 14 Sept, \d{2}:\d{2}/).last()).toBeVisible()
})

test("engagement inbox has no serious accessibility violations", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached()
  await switchUser(page, "manager-sarah")
  await openInbox(page)

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([])
})
