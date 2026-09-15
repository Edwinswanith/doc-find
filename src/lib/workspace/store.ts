import "server-only"
import { getDatabase } from "@/lib/mongodb"
import { createWorkspaceFixture } from "./fixture"
import type { WorkspaceState } from "./types"

declare global {
  var docFindWorkspaceState: WorkspaceState | undefined
}

const clone = (state: WorkspaceState) => structuredClone(state)

function memoryState() {
  global.docFindWorkspaceState ??= createWorkspaceFixture()
  return global.docFindWorkspaceState
}

export async function getWorkspaceState(): Promise<WorkspaceState> {
  if (!process.env.MONGODB_URI) return clone(memoryState())
  const database = await getDatabase()
  const record = await database.collection<{ _id: string; state: WorkspaceState }>("workspaceState").findOne({ _id: "sapphire-v1" })
  if (record) return record.state
  const state = createWorkspaceFixture()
  await database.collection<{ _id: string; state: WorkspaceState }>("workspaceState").insertOne({ _id: "sapphire-v1", state })
  return state
}

export async function saveWorkspaceState(state: WorkspaceState, expectedVersion?: number): Promise<void> {
  if (!process.env.MONGODB_URI) {
    if (expectedVersion !== undefined && memoryState().version !== expectedVersion) throw new Error("WORKSPACE_VERSION_CONFLICT")
    global.docFindWorkspaceState = clone(state)
    return
  }
  const database = await getDatabase()
  const filter = expectedVersion === undefined ? { _id: "sapphire-v1" } : { _id: "sapphire-v1", "state.version": expectedVersion }
  const result = await database.collection<{ _id: string; state: WorkspaceState }>("workspaceState").updateOne(filter, { $set: { state } }, { upsert: expectedVersion === undefined })
  if (!result.matchedCount && expectedVersion !== undefined) throw new Error("WORKSPACE_VERSION_CONFLICT")
}

export async function resetWorkspaceState(): Promise<WorkspaceState> {
  if (process.env.MONGODB_DB && process.env.MONGODB_DB !== "doc_find_demo") throw new Error("RESET_DATABASE_FORBIDDEN")
  const state = createWorkspaceFixture()
  if (!process.env.MONGODB_URI) global.docFindWorkspaceState = clone(state)
  else await saveWorkspaceState(state)
  return state
}
