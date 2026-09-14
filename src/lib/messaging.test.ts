import { describe, expect, it } from "vitest"
import {
  appendEngagementMessage,
  markConversationSeen,
  unreadConversationCount,
  type EngagementConversation,
} from "./messaging"

const conversation: EngagementConversation = {
  id: "conversation-1",
  engagementId: "engagement-1",
  doctorId: "doctor-theo",
  doctorName: "Dr Theo Martin",
  organisationId: "org-harley",
  organisationName: "Harley Street Skin Centre",
  requirementTitle: "Tuesday dermatology cover",
  origin: "doctor",
  messages: [
    {
      id: "message-1",
      senderId: "doctor-theo",
      senderName: "Dr Theo Martin",
      body: "I am available for the October sessions.",
      sentAt: "2026-09-14T10:12:00.000Z",
    },
    {
      id: "message-2",
      senderId: "manager-sarah",
      senderName: "Sarah Whitmore",
      body: "Thank you. I am reviewing your profile.",
      sentAt: "2026-09-14T10:20:00.000Z",
      readAt: "2026-09-14T10:23:00.000Z",
    },
  ],
}

describe("engagement message read receipts", () => {
  it("marks only messages received by the viewer as seen", () => {
    const result = markConversationSeen(conversation, "manager-sarah", "2026-09-14T10:30:00.000Z")

    expect(result.messages[0].readAt).toBe("2026-09-14T10:30:00.000Z")
    expect(result.messages[1].readAt).toBe("2026-09-14T10:23:00.000Z")
  })

  it("does not replace an existing seen timestamp", () => {
    const first = markConversationSeen(conversation, "manager-sarah", "2026-09-14T10:30:00.000Z")
    const second = markConversationSeen(first, "manager-sarah", "2026-09-14T11:00:00.000Z")

    expect(second.messages[0].readAt).toBe("2026-09-14T10:30:00.000Z")
  })
})

describe("engagement message creation", () => {
  it("sends a contextual message with a price in integer minor units", () => {
    const result = appendEngagementMessage(conversation, {
      senderId: "manager-sarah",
      senderName: "Sarah Whitmore",
      body: "We would like to offer you the Tuesday clinic.",
      offeredAmountMajor: 625,
      sentAt: "2026-09-14T11:00:00.000Z",
      messageId: "message-3",
    })

    expect(result.messages.at(-1)).toMatchObject({
      body: "We would like to offer you the Tuesday clinic.",
      offer: { currency: "GBP", amountMinor: 62500, status: "proposed" },
    })
  })

  it("rejects blank messages and invalid offer prices", () => {
    expect(() => appendEngagementMessage(conversation, {
      senderId: "manager-sarah",
      senderName: "Sarah Whitmore",
      body: "   ",
      sentAt: "2026-09-14T11:00:00.000Z",
      messageId: "message-3",
    })).toThrowError("Write a message before sending.")

    expect(() => appendEngagementMessage(conversation, {
      senderId: "manager-sarah",
      senderName: "Sarah Whitmore",
      body: "Offer details",
      offeredAmountMajor: 0,
      sentAt: "2026-09-14T11:00:00.000Z",
      messageId: "message-3",
    })).toThrowError("Offer price must be greater than zero.")

    expect(() => appendEngagementMessage(conversation, {
      senderId: "manager-sarah",
      senderName: "Sarah Whitmore",
      body: "Offer details",
      offeredAmountMajor: Number.NaN,
      sentAt: "2026-09-14T11:00:00.000Z",
      messageId: "message-4",
    })).toThrowError("Offer price must be a valid amount.")
  })
})

describe("unread engagement counts", () => {
  it("counts conversations with unread messages rather than every message", () => {
    const secondConversation = {
      ...conversation,
      id: "conversation-2",
      messages: [{ ...conversation.messages[0], id: "message-4" }],
    }

    expect(unreadConversationCount([conversation, secondConversation], "manager-sarah")).toBe(2)
    expect(unreadConversationCount([conversation, secondConversation], "doctor-theo")).toBe(0)
  })
})
