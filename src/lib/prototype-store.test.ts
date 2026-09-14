import { beforeEach, describe, expect, it } from "vitest"
import { applyMemoryCommand, resetMemoryWorkflow } from "./prototype-store"

describe("prototype memory command store", () => {
  beforeEach(() => resetMemoryWorkflow())

  it("applies versioned commands and returns idempotent retries", () => {
    const first = applyMemoryCommand({ actorId: "doctor-anika", command: "accept-offer", recordId: "eng-1", expectedVersion: 0, idempotencyKey: "one" })
    const retry = applyMemoryCommand({ actorId: "doctor-anika", command: "accept-offer", recordId: "eng-1", expectedVersion: 0, idempotencyKey: "one" })
    expect(first).toMatchObject({ state: "offer_accepted", version: 1 })
    expect(retry).toEqual(first)
  })

  it("rejects stale expected versions", () => {
    applyMemoryCommand({ actorId: "doctor-anika", command: "accept-offer", recordId: "eng-1", expectedVersion: 0, idempotencyKey: "one" })
    expect(() => applyMemoryCommand({ actorId: "approver-james", command: "approve-scope", recordId: "eng-1", expectedVersion: 0, idempotencyKey: "two" })).toThrowError("This record changed while you were reviewing it.")
  })
})
