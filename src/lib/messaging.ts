export type MessageOffer = {
  currency: "GBP"
  amountMinor: number
  status: "proposed"
}

export type EngagementMessage = {
  id: string
  senderId: string
  senderName: string
  body: string
  sentAt: string
  readAt?: string
  offer?: MessageOffer
}

export type EngagementConversation = {
  id: string
  engagementId: string
  doctorId: string
  doctorName: string
  organisationId: string
  organisationName: string
  requirementTitle: string
  origin: "doctor" | "clinic"
  messages: EngagementMessage[]
}

type AppendMessageInput = {
  senderId: string
  senderName: string
  body: string
  offeredAmountMajor?: number
  sentAt: string
  messageId: string
}

export function markConversationSeen(
  conversation: EngagementConversation,
  viewerId: string,
  readAt: string,
): EngagementConversation {
  const hasUnseenMessages = conversation.messages.some(
    (message) => message.senderId !== viewerId && !message.readAt,
  )
  if (!hasUnseenMessages) return conversation

  return {
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.senderId !== viewerId && !message.readAt ? { ...message, readAt } : message,
    ),
  }
}

export function appendEngagementMessage(
  conversation: EngagementConversation,
  input: AppendMessageInput,
): EngagementConversation {
  const body = input.body.trim()
  if (!body) throw new Error("Write a message before sending.")
  if (input.offeredAmountMajor !== undefined && !Number.isFinite(input.offeredAmountMajor)) {
    throw new Error("Offer price must be a valid amount.")
  }
  if (input.offeredAmountMajor !== undefined && input.offeredAmountMajor <= 0) {
    throw new Error("Offer price must be greater than zero.")
  }

  const offer = input.offeredAmountMajor === undefined
    ? undefined
    : {
        currency: "GBP" as const,
        amountMinor: Math.round(input.offeredAmountMajor * 100),
        status: "proposed" as const,
      }

  return {
    ...conversation,
    messages: [
      ...conversation.messages,
      {
        id: input.messageId,
        senderId: input.senderId,
        senderName: input.senderName,
        body,
        sentAt: input.sentAt,
        ...(offer ? { offer } : {}),
      },
    ],
  }
}

export function conversationHasUnread(conversation: EngagementConversation, viewerId: string) {
  return conversation.messages.some((message) => message.senderId !== viewerId && !message.readAt)
}

export function unreadConversationCount(conversations: EngagementConversation[], viewerId: string) {
  return conversations.filter((conversation) => conversationHasUnread(conversation, viewerId)).length
}

export function formatGbp(amountMinor: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100)
}

export function formatMessageTime(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(new Date(isoDate))
}
