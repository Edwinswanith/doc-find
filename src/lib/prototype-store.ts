import { nextWorkflowState, type CommandName, type WorkflowState } from "@/lib/domain/commands"

type WorkflowRecord = {
  recordId: string
  command: CommandName
  state: WorkflowState
  version: number
  actorId: string
  updatedAt: string
}

type MemoryCommand = {
  actorId: string
  command: CommandName
  recordId: string
  expectedVersion: number
  idempotencyKey: string
}

declare global {
  var medilinkMemoryWorkflow: { state: WorkflowState; version: number } | undefined
  var medilinkMemoryIdempotency: Map<string, WorkflowRecord> | undefined
}

function workflow() {
  global.medilinkMemoryWorkflow ??= { state: "offer_sent", version: 0 }
  return global.medilinkMemoryWorkflow
}

function idempotencyStore() {
  global.medilinkMemoryIdempotency ??= new Map()
  return global.medilinkMemoryIdempotency
}

export function applyMemoryCommand(input: MemoryCommand): WorkflowRecord {
  const idempotencyId = `${input.actorId}:${input.command}:${input.idempotencyKey}`
  const previous = idempotencyStore().get(idempotencyId)
  if (previous) return previous

  const current = workflow()
  if (current.version !== input.expectedVersion) {
    throw Object.assign(new Error("This record changed while you were reviewing it."), {
      code: "VERSION_CONFLICT",
      currentVersion: current.version,
    })
  }

  const next: WorkflowRecord = {
    recordId: input.recordId,
    command: input.command,
    state: nextWorkflowState(current.state, input.command),
    version: current.version + 1,
    actorId: input.actorId,
    updatedAt: new Date().toISOString(),
  }
  global.medilinkMemoryWorkflow = { state: next.state, version: next.version }
  idempotencyStore().set(idempotencyId, next)
  return next
}

export function resetMemoryWorkflow() {
  global.medilinkMemoryWorkflow = { state: "offer_sent", version: 0 }
  global.medilinkMemoryIdempotency = new Map()
}
