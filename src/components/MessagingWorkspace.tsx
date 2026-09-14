"use client"

import { CheckCheck, Clock3, MessageSquareText, PoundSterling, Send, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { DemoUser } from "@/lib/demo-data"
import {
  appendEngagementMessage,
  conversationHasUnread,
  formatGbp,
  formatMessageTime,
  markConversationSeen,
  type EngagementConversation,
} from "@/lib/messaging"

type MessagingWorkspaceProps = {
  user: DemoUser
  conversations: EngagementConversation[]
  selectedConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onConversationsChange: (conversations: EngagementConversation[]) => void
}

function counterpartName(conversation: EngagementConversation, user: DemoUser) {
  return user.role === "doctor" ? conversation.organisationName : conversation.doctorName
}

function conversationOriginLabel(conversation: EngagementConversation) {
  return conversation.origin === "doctor" ? "Doctor approached clinic" : "Clinic approached doctor"
}

export function MessagingWorkspace({
  user,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onConversationsChange,
}: MessagingWorkspaceProps) {
  const [draft, setDraft] = useState("")
  const [price, setPrice] = useState("")
  const [sendError, setSendError] = useState<string>()

  const visibleConversations = useMemo(() => conversations.filter((conversation) => {
    if (user.role === "doctor") return conversation.doctorId === user.id
    if (user.role === "manager") return conversation.organisationId === user.organisationId
    return false
  }), [conversations, user])

  const selected = visibleConversations.find((conversation) => conversation.id === selectedConversationId)
    ?? visibleConversations[0]

  useEffect(() => {
    if (selected && selected.id !== selectedConversationId) onSelectConversation(selected.id)
  }, [onSelectConversation, selected, selectedConversationId])

  useEffect(() => {
    if (!selected || !conversationHasUnread(selected, user.id)) return
    const readAt = new Date().toISOString()
    onConversationsChange(conversations.map((conversation) =>
      conversation.id === selected.id ? markConversationSeen(conversation, user.id, readAt) : conversation,
    ))
  }, [conversations, onConversationsChange, selected, user.id])

  function sendMessage() {
    if (!selected) return
    setSendError(undefined)
    try {
      const offeredAmountMajor = price.trim() ? Number(price) : undefined
      const updated = appendEngagementMessage(selected, {
        senderId: user.id,
        senderName: user.name,
        body: draft,
        offeredAmountMajor,
        sentAt: new Date().toISOString(),
        messageId: crypto.randomUUID(),
      })
      onConversationsChange(conversations.map((conversation) => conversation.id === selected.id ? updated : conversation))
      setDraft("")
      setPrice("")
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : "The message could not be sent.")
    }
  }

  if (!selected) {
    return <section className="conversation-empty"><MessageSquareText size={28} /><h2>No conversations yet</h2><p>Messages linked to a staffing engagement will appear here.</p></section>
  }

  return (
    <section className="messaging-workspace" aria-label="Engagement inbox">
      <aside className="conversation-rail">
        <div className="conversation-rail-header">
          <p className="eyebrow">Engagement inbox</p>
          <h2>{visibleConversations.length} active conversations</h2>
          <p>Every conversation stays attached to one doctor, clinic, and requirement.</p>
        </div>
        <div className="conversation-list">
          {visibleConversations.map((conversation) => {
            const lastMessage = conversation.messages.at(-1)
            const unread = conversationHasUnread(conversation, user.id)
            return (
              <button
                type="button"
                className={`conversation-row ${selected.id === conversation.id ? "active" : ""}`}
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <span className="conversation-avatar" aria-hidden="true">{counterpartName(conversation, user).split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <span className="conversation-preview">
                  <span className="conversation-name">{counterpartName(conversation, user)}{unread && <span className="unread-dot" aria-label="Unread messages" />}</span>
                  <span className="conversation-requirement">{conversation.requirementTitle}</span>
                  <span className="conversation-snippet">{lastMessage?.body}</span>
                </span>
                <time>{lastMessage ? formatMessageTime(lastMessage.sentAt).split(",").at(-1) : ""}</time>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="conversation-thread">
        <header className="thread-header">
          <div>
            <p className="eyebrow">{conversationOriginLabel(selected)}</p>
            <h2>{counterpartName(selected, user)}</h2>
            <p>{selected.requirementTitle} · {selected.organisationName}</p>
          </div>
          <span className="secure-thread"><Sparkles size={15} /> Context protected</span>
        </header>

        <div className="thread-messages" aria-live="polite">
          {selected.messages.map((message) => {
            const mine = message.senderId === user.id
            return (
              <article className={`thread-message ${mine ? "mine" : ""}`} key={message.id}>
                <div className="message-author-row"><strong>{mine ? "You" : message.senderName}</strong><time>{formatMessageTime(message.sentAt)}</time></div>
                <p>{message.body}</p>
                {message.offer && <div className="price-proposal"><span><PoundSterling size={16} /> Proposed session price</span><strong>{formatGbp(message.offer.amountMinor)}</strong><small>Discussion only · not an accepted offer</small></div>}
                {mine && <div className={`read-receipt ${message.readAt ? "seen" : ""}`}><CheckCheck size={14} />{message.readAt ? `Seen ${formatMessageTime(message.readAt)}` : `Sent ${formatMessageTime(message.sentAt)}`}</div>}
              </article>
            )
          })}
        </div>

        <div className="message-composer">
          <div className="composer-heading"><div><strong>Reply in context</strong><span>One message can include an optional proposed session price.</span></div><span><Clock3 size={14} /> Usually replies today</span></div>
          {sendError && <div className="composer-error" role="alert">{sendError}</div>}
          <label htmlFor="engagement-message">Message</label>
          <textarea id="engagement-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={user.role === "doctor" ? "Tell the clinic about your availability or ask a question" : "Introduce the clinic, explain the session, and ask about interest"} />
          <div className="composer-actions">
            <label className="price-field"><span>{user.role === "doctor" ? "Requested price" : "Offer price"}</span><span className="price-input"><PoundSterling size={16} /><input aria-label="Price per session" inputMode="numeric" type="number" min="1" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Optional" /></span></label>
            <button className="primary" type="button" onClick={sendMessage}><Send size={16} />Send message{price ? " + price" : ""}</button>
          </div>
          <p className="composer-note">Messages are visible to the relevant clinic team. Sensitive evidence must be shared through controlled document access.</p>
        </div>
      </div>
    </section>
  )
}
