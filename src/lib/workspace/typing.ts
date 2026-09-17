import "server-only"
import { getDatabase } from "@/lib/mongodb"

// Typing presence is ephemeral and last-write-wins, so it is kept out of the
// versioned WorkspaceState document entirely -- writing it there on every
// keystroke would spam the optimistic-concurrency check that commands and
// messages rely on (saveWorkspaceState's expectedVersion match against the
// single shared document).

const TYPING_TTL_MS = 4_000

type TypingRecord = { conversationId: string; userId: string; expiresAt: string }

declare global {
  var docFindTypingState: Map<string, TypingRecord> | undefined
}

function memoryTyping() {
  global.docFindTypingState ??= new Map()
  return global.docFindTypingState
}

function key(conversationId: string, userId: string) {
  return `${conversationId}:${userId}`
}

export async function setTyping(conversationId: string, userId: string, typing: boolean): Promise<void> {
  if (!process.env.MONGODB_URI) {
    const store = memoryTyping()
    if (typing) store.set(key(conversationId, userId), { conversationId, userId, expiresAt: new Date(Date.now() + TYPING_TTL_MS).toISOString() })
    else store.delete(key(conversationId, userId))
    return
  }
  const collection = (await getDatabase()).collection<TypingRecord & { _id: string }>("typingIndicators")
  if (typing) await collection.updateOne({ _id: key(conversationId, userId) }, { $set: { conversationId, userId, expiresAt: new Date(Date.now() + TYPING_TTL_MS).toISOString() } }, { upsert: true })
  else await collection.deleteOne({ _id: key(conversationId, userId) })
}

export async function getTypingUserIds(conversationId: string, excludingUserId: string): Promise<string[]> {
  const now = new Date().toISOString()
  if (!process.env.MONGODB_URI) {
    return [...memoryTyping().values()].filter((record) => record.conversationId === conversationId && record.userId !== excludingUserId && record.expiresAt > now).map((record) => record.userId)
  }
  const collection = (await getDatabase()).collection<TypingRecord & { _id: string }>("typingIndicators")
  const records = await collection.find({ conversationId, userId: { $ne: excludingUserId }, expiresAt: { $gt: now } }).toArray()
  return records.map((record) => record.userId)
}
