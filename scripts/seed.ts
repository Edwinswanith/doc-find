import { MongoClient } from "mongodb"
import { demoUsers, evidence, notificationSeed, sessions } from "../src/lib/demo-data"

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medilink?replicaSet=rs0&directConnection=true"

const now = new Date("2026-09-14T12:00:00.000Z")
const organisationId = "org-harley-skin"
const siteId = "site-harley"
const requirementId = "req-1042"
const doctorId = "doctor-anika"

async function seed() {
  const client = new MongoClient(uri)
  await client.connect()
  const database = client.db()
  const collection = (name: string) => database.collection<{ _id: string; [key: string]: unknown }>(name)
  const collections = [
    "users", "doctorProfiles", "professionalChecks", "evidenceVersions", "organisations", "sites", "memberships",
    "requirements", "sessionOccurrences", "candidateEngagements", "applications", "invitations", "conversations",
    "messages", "offerVersions", "approvals", "bookings", "completionRecords", "paymentRecords", "notifications",
    "relationships", "reviewCases", "auditEvents", "idempotencyKeys", "demoWorkflows",
  ]

  await Promise.all(collections.map((name) => collection(name).deleteMany({})))

  await collection("users").insertMany(demoUsers.map((user) => ({ _id: user.id, ...user, fictional: true, createdAt: now })))
  await collection("doctorProfiles").insertOne({
    _id: doctorId,
    displayName: "Dr Anika Rao",
    specialty: "Dermatology",
    scope: ["Adult general dermatology", "Outpatient consultations"],
    baseArea: "London",
    discoverability: "verified_organisations",
    phonePolicy: { mode: "request", disclosedOrganisationIds: [] },
    rate: { currency: "GBP", minorUnits: 60000, unit: "four_hour_session" },
    completeness: 92,
    fictional: true,
    version: 1,
  })
  await collection("evidenceVersions").insertMany(evidence.slice(0, 3).map((item, index) => ({
    _id: `evidence-${index + 1}`, doctorId, category: ["identity", "registration", "indemnity"][index], status: "checked",
    display: item, validUntil: index === 2 ? new Date("2026-12-31T23:59:59.000Z") : new Date("2027-09-14T23:59:59.000Z"), fictional: true, version: 1,
  })))
  await collection("organisations").insertOne({ _id: organisationId, legalName: "Harley Street Skin Centre Ltd", tradingName: "Harley Street Skin Centre", status: "approved", fictional: true, version: 1 })
  await collection("sites").insertOne({ _id: siteId, organisationId, name: "Harley Street", area: "Marylebone, London", scope: ["Adult outpatient dermatology"], status: "approved", fictional: true, version: 1 })
  await collection("memberships").insertMany(demoUsers.filter((user) => user.organisation?.includes("Harley")).map((user) => ({ _id: `member-${user.id}`, userId: user.id, organisationId, siteIds: [siteId], role: user.role, status: "active" })))
  await collection("requirements").insertOne({ _id: requirementId, organisationId, siteId, title: "Consultant Dermatologist · Outpatient clinic", scope: "Dermatology outpatient clinic", status: "open", rate: { currency: "GBP", minorUnits: 60000, unit: "four_hour_session" }, version: 2, fictional: true })
  await collection("sessionOccurrences").insertMany(sessions.map((session) => ({ _id: session.id, requirementId, siteId, startsAt: new Date(`2026-10-${session.day}T08:00:00.000Z`), endsAt: new Date(`2026-10-${session.day}T12:00:00.000Z`), timezone: "Europe/London", capacity: 1, reserved: session.id === "s3" ? 0 : 1, version: 1 })))
  await collection("candidateEngagements").insertOne({ _id: "eng-1", doctorId, requirementId, origin: "application", stage: "offer_issued", selectedOccurrenceIds: ["s1", "s2"], version: 3 })
  await collection("applications").insertOne({ _id: "application-1", engagementId: "eng-1", selectedOccurrenceIds: ["s1", "s2"], status: "shortlisted", version: 1 })
  await collection("invitations").insertOne({ _id: "invitation-1", engagementId: "eng-1", status: "interested", deadline: new Date("2026-09-30T17:00:00.000Z"), version: 1 })
  await collection("conversations").insertOne({ _id: "conversation-1", engagementId: "eng-1", participantIds: [doctorId, "manager-sarah"], version: 1 })
  await collection("messages").insertMany([
    { _id: "message-1", conversationId: "conversation-1", actorId: "manager-sarah", body: "We have two Tuesday dermatology sessions and would like you to review the scope.", createdAt: now },
    { _id: "message-2", conversationId: "conversation-1", actorId: doctorId, body: "The dates suit me. Could you confirm nursing support and results follow-up?", createdAt: new Date(now.getTime() + 60_000) },
  ])
  await collection("offerVersions").insertMany([
    { _id: "offer-1", engagementId: "eng-1", version: 1, status: "superseded", occurrenceIds: ["s1"], amount: { currency: "GBP", minorUnits: 60000 } },
    { _id: "offer-2", engagementId: "eng-1", version: 2, status: "sent", occurrenceIds: ["s1", "s2"], amount: { currency: "GBP", minorUnits: 120000 }, expiresAt: new Date("2026-10-01T12:00:00.000Z") },
  ])
  await collection("reviewCases").insertOne({ _id: "case-induction", type: "site_induction", doctorId, siteId, ownerId: "operations-lena", status: "action_required", version: 1 })
  await collection("notifications").insertMany(notificationSeed.map((item) => ({ _id: item.id, recipientId: doctorId, ...item, sourceId: "eng-1" })))
  await collection("demoWorkflows").insertOne({ _id: "eng-1", state: "offer_sent", version: 0, updatedAt: now.toISOString() })

  await Promise.all([
    collection("candidateEngagements").createIndex({ doctorId: 1, requirementId: 1 }, { unique: true }),
    collection("idempotencyKeys").createIndex({ actorId: 1, command: 1, key: 1 }, { unique: true }),
    collection("notifications").createIndex({ recipientId: 1, sourceId: 1, title: 1 }, { unique: true }),
    collection("offerVersions").createIndex({ engagementId: 1, version: 1 }, { unique: true }),
    collection("sessionOccurrences").createIndex({ siteId: 1, startsAt: 1, reserved: 1 }),
    collection("evidenceVersions").createIndex({ doctorId: 1, validUntil: 1 }),
  ])

  await client.close()
  process.stdout.write("Doc+Find fictional demo data seeded.\n")
}

seed().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Seed failed"}\n`)
  process.exitCode = 1
})
