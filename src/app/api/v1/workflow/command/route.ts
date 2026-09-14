import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { commandSchema, canExecuteCommand, nextWorkflowState, requireCommandHeaders, type WorkflowState } from "@/lib/domain/commands"
import { getDatabase } from "@/lib/mongodb"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { applyMemoryCommand } from "@/lib/prototype-store"

function error(code: string, message: string, status: number, currentVersion?: number) {
  return NextResponse.json({ success: false, error: { code, message, currentVersion } }, { status })
}

function runMemoryCommand(actorId: string, command: typeof commandSchema._output, headers: ReturnType<typeof requireCommandHeaders>) {
  try {
    const data = applyMemoryCommand({ actorId, command: command.command, recordId: command.recordId, expectedVersion: headers.expectedVersion, idempotencyKey: headers.idempotencyKey })
    return NextResponse.json({ success: true, data, meta: { persistence: "process_memory" } })
  } catch (cause) {
    const detail = cause as Error & { code?: string; currentVersion?: number }
    return error(detail.code ?? "INVALID_TRANSITION", detail.message, 409, detail.currentVersion)
  }
}

export async function POST(request: Request) {
  let commandHeaders: ReturnType<typeof requireCommandHeaders>
  try {
    commandHeaders = requireCommandHeaders(request.headers)
  } catch (cause) {
    return error("INVALID_COMMAND_HEADERS", cause instanceof Error ? cause.message : "Invalid command headers.", 400)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error("INVALID_JSON", "The request body must be valid JSON.", 400)
  }
  const parsed = commandSchema.safeParse(body)
  if (!parsed.success) return error("INVALID_COMMAND", "The workflow command is invalid.", 400)

  const cookieStore = await cookies()
  const actor = verifyPrototypeCookie(cookieStore.get(COOKIE_NAME)?.value)
  if (!actor) return error("UNAUTHENTICATED", "Select a seeded prototype user before sending commands.", 401)
  if (!canExecuteCommand(actor.role, parsed.data.command)) {
    return error("FORBIDDEN", `${actor.roleLabel} cannot perform ${parsed.data.command}.`, 403)
  }

  if (!process.env.MONGODB_URI) return runMemoryCommand(actor.id, parsed.data, commandHeaders)

  try {
    const database = await getDatabase()
    const client = database.client
    const session = client.startSession()
    let responseData: Record<string, unknown> | undefined

    try {
      await session.withTransaction(async () => {
        const idempotency = database.collection("idempotencyKeys")
        const previous = await idempotency.findOne({ actorId: actor.id, command: parsed.data.command, key: commandHeaders.idempotencyKey }, { session })
        if (previous) {
          responseData = previous.response as Record<string, unknown>
          return
        }

        const workflows = database.collection("demoWorkflows")
        const current = await workflows.findOne({ _id: parsed.data.recordId as never }, { session })
        const currentVersion = Number(current?.version ?? 0)
        if (currentVersion !== commandHeaders.expectedVersion) {
          throw Object.assign(new Error("This record changed while you were reviewing it."), { code: "VERSION_CONFLICT", currentVersion })
        }

        const currentState = (current?.state ?? "draft") as WorkflowState
        let nextState: WorkflowState
        try {
          nextState = nextWorkflowState(currentState, parsed.data.command)
        } catch (cause) {
          throw Object.assign(cause instanceof Error ? cause : new Error("Invalid transition."), { code: "INVALID_TRANSITION", currentVersion })
        }
        const next = { recordId: parsed.data.recordId, command: parsed.data.command, state: nextState, version: currentVersion + 1, actorId: actor.id, updatedAt: new Date().toISOString() }
        await workflows.updateOne({ _id: parsed.data.recordId as never }, { $set: { ...next, _id: parsed.data.recordId as never } }, { upsert: true, session })
        await database.collection("auditEvents").insertOne({ ...next, payload: parsed.data.payload }, { session })
        await idempotency.insertOne({ actorId: actor.id, command: parsed.data.command, key: commandHeaders.idempotencyKey, response: next }, { session })
        responseData = next
      })
    } finally {
      await session.endSession()
    }
    return NextResponse.json({ success: true, data: responseData })
  } catch (cause) {
    const detail = cause as Error & { code?: string; currentVersion?: number }
    if (detail.code === "VERSION_CONFLICT") return error(detail.code, detail.message, 409, detail.currentVersion)
    if (detail.code === "INVALID_TRANSITION") return error(detail.code, detail.message, 409, detail.currentVersion)
    return error("COMMAND_FAILED", "The command could not be committed to the configured local MongoDB database.", 503)
  }
}
