import { describe, expect, it } from "vitest"
import { canExecuteCommand, commandForTransition, commandSchema, nextWorkflowState, requireCommandHeaders } from "./commands"

describe("workflow command boundary", () => {
  it("requires idempotency and expected-version headers", () => {
    expect(() => requireCommandHeaders(new Headers())).toThrowError("Idempotency-Key is required.")
    expect(() => requireCommandHeaders(new Headers({ "idempotency-key": "abc" }))).toThrowError("Expected-Version is required.")
    expect(requireCommandHeaders(new Headers({ "idempotency-key": "abc", "expected-version": "2" }))).toEqual({ idempotencyKey: "abc", expectedVersion: 2 })
    expect(() => requireCommandHeaders(new Headers({ "idempotency-key": "abc", "expected-version": "wrong" }))).toThrowError("Expected-Version must be a non-negative integer.")
  })

  it("rejects malformed commands", () => {
    expect(commandSchema.safeParse({ command: "publish", recordId: "" }).success).toBe(false)
  })

  it("keeps clinical and finance permissions separate", () => {
    expect(canExecuteCommand("manager", "approve-scope")).toBe(false)
    expect(canExecuteCommand("approver", "approve-scope")).toBe(true)
    expect(canExecuteCommand("approver", "confirm-payment")).toBe(false)
    expect(canExecuteCommand("finance", "submit-invoice")).toBe(true)
    expect(canExecuteCommand("finance", "confirm-payment")).toBe(true)
  })

  it("allows only the next truthful workflow transition", () => {
    expect(nextWorkflowState("offer_sent", "accept-offer")).toBe("offer_accepted")
    expect(nextWorkflowState("offer_accepted", "approve-scope")).toBe("approved")
    expect(() => nextWorkflowState("interested", "confirm-payment")).toThrowError("confirm-payment cannot be performed while the workflow is interested.")
  })

  it("does not replay an earlier command after the workflow has advanced", () => {
    expect(commandForTransition("published", "interested")).toBe("apply")
    expect(commandForTransition("invited", "interested")).toBe("express-interest")
    expect(commandForTransition("offer_sent", "interested")).toBeUndefined()
    expect(commandForTransition("offer_sent", "offer_sent")).toBeUndefined()
  })
})
