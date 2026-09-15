import { describe, expect, it } from "vitest"
import { createWorkspaceFixture } from "./fixture"
import { authorisedWorkspaceState, canOpenWorkspaceView } from "./policy"

describe("workspace record-level policy", () => {
  const state = createWorkspaceFixture()

  it("rejects a clinic manager route for another organisation", () => {
    const manager = state.users.find((item) => item.id === "manager-sarah")!
    expect(canOpenWorkspaceView(manager, "clinic-today", "org-harley")).toBe(true)
    expect(canOpenWorkspaceView(manager, "clinic-today", "org-riverside")).toBe(false)
  })

  it("returns only participant conversations and messages", () => {
    const doctor = state.users.find((item) => item.id === "doctor-theo")!
    const permitted = authorisedWorkspaceState(state, doctor)
    expect(permitted.conversations.map((item) => item.id)).toEqual(["conversation-theo-harley"])
    expect(permitted.messages.every((item) => item.conversationId === "conversation-theo-harley")).toBe(true)
    expect(permitted.notifications.every((item) => item.recipientId === doctor.id)).toBe(true)
  })

  it("does not expose internal idempotency results", () => {
    const manager = state.users.find((item) => item.id === "manager-sarah")!
    state.idempotency["secret"] = { stateVersion: 2, recordId: "private", command: "accept-offer" }
    expect(authorisedWorkspaceState(state, manager).idempotency).toEqual({})
  })
})
