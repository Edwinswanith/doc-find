import { MongoClient } from "mongodb"
import { createWorkspaceFixture } from "../src/lib/workspace/fixture"

const uri = process.env.MONGODB_URI
const databaseName = process.env.MONGODB_DB || "doc_find_demo"

async function seed() {
  if (!uri) throw new Error("MONGODB_URI is required. Keep it in .env.local and never commit it.")
  if (databaseName !== "doc_find_demo") throw new Error("Refusing to seed any database except doc_find_demo.")
  const client = new MongoClient(uri)
  await client.connect()
  const database = client.db(databaseName)
  const state = createWorkspaceFixture()

  await database.collection<{ _id: string; state: ReturnType<typeof createWorkspaceFixture>; fictional: boolean; seededAt: Date }>("workspaceState").updateOne({ _id: "sapphire-v1" }, { $set: { state, fictional: true, seededAt: new Date() } }, { upsert: true })
  await Promise.all([
    database.collection("candidateEngagements").createIndex({ doctorId: 1, requirementId: 1 }, { unique: true }),
    database.collection("offerVersions").createIndex({ engagementId: 1, version: 1 }, { unique: true }),
    database.collection("idempotencyKeys").createIndex({ actorId: 1, command: 1, key: 1 }, { unique: true }),
    database.collection("notifications").createIndex({ recipientId: 1, sourceId: 1 }, { unique: true }),
    database.collection("conversations").createIndex({ participantIds: 1, engagementId: 1 }),
    database.collection("sessionOccurrences").createIndex({ siteId: 1, startsAt: 1, reserved: 1 }),
    database.collection("evidenceVersions").createIndex({ doctorId: 1, validUntil: 1 }),
    database.collection("approvals").createIndex({ doctorId: 1, siteId: 1, scope: 1, validUntil: 1 }),
  ])
  await client.close()
  process.stdout.write("Doc+Find Sapphire fictional demo data seeded in doc_find_demo.\n")
}

seed().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Seed failed"}\n`)
  process.exitCode = 1
})
