import { z } from "zod"
import type { DemoRole } from "@/lib/demo-data"

export const commandNames = [
  "publish",
  "apply",
  "invite",
  "express-interest",
  "send-offer",
  "accept-offer",
  "approve-scope",
  "mark-ready",
  "mark-complete",
  "submit-invoice",
  "confirm-payment",
  "resolve-case",
] as const

export type CommandName = (typeof commandNames)[number]
export type WorkflowState = "draft" | "published" | "invited" | "interested" | "offer_sent" | "offer_accepted" | "approved" | "ready" | "completed" | "invoice_submitted" | "paid" | "resolved"

export const commandSchema = z.object({
  command: z.enum(commandNames),
  recordId: z.string().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).default({}),
})

const permissions: Record<DemoRole, CommandName[]> = {
  doctor: ["apply", "express-interest", "accept-offer", "mark-complete", "submit-invoice"],
  manager: ["publish", "invite", "send-offer", "mark-complete"],
  approver: ["approve-scope", "mark-ready"],
  finance: ["submit-invoice", "confirm-payment"],
  operations: ["resolve-case"],
}

export function canExecuteCommand(role: DemoRole, command: CommandName) {
  return permissions[role].includes(command)
}

const transitions: Partial<Record<CommandName, { from: WorkflowState[]; to: WorkflowState }>> = {
  publish: { from: ["draft"], to: "published" },
  apply: { from: ["published"], to: "interested" },
  invite: { from: ["published"], to: "invited" },
  "express-interest": { from: ["invited"], to: "interested" },
  "send-offer": { from: ["interested"], to: "offer_sent" },
  "accept-offer": { from: ["offer_sent"], to: "offer_accepted" },
  "approve-scope": { from: ["offer_accepted"], to: "approved" },
  "mark-ready": { from: ["approved"], to: "ready" },
  "mark-complete": { from: ["ready"], to: "completed" },
  "submit-invoice": { from: ["completed"], to: "invoice_submitted" },
  "confirm-payment": { from: ["invoice_submitted"], to: "paid" },
  "resolve-case": { from: ["draft", "published", "invited", "interested", "offer_sent", "offer_accepted", "approved", "ready", "completed", "invoice_submitted"], to: "resolved" },
}

export function commandForTransition(current: WorkflowState, target: WorkflowState): CommandName | undefined {
  for (const command of commandNames) {
    const transition = transitions[command]
    if (transition?.to === target && transition.from.includes(current)) return command
  }
  return undefined
}

export function nextWorkflowState(current: WorkflowState, command: CommandName): WorkflowState {
  const transition = transitions[command]
  if (!transition || !transition.from.includes(current)) {
    throw new Error(`${command} cannot be performed while the workflow is ${current}.`)
  }
  return transition.to
}

export function requireCommandHeaders(headers: Headers) {
  const idempotencyKey = headers.get("idempotency-key")
  if (!idempotencyKey) throw new Error("Idempotency-Key is required.")
  const expectedRaw = headers.get("expected-version")
  if (!expectedRaw) throw new Error("Expected-Version is required.")
  const expectedVersion = Number(expectedRaw)
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new Error("Expected-Version must be a non-negative integer.")
  return { idempotencyKey, expectedVersion }
}
