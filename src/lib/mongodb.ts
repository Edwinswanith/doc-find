import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI

declare global {
  var medilinkMongoClient: Promise<MongoClient> | undefined
}

function getClient() {
  if (!uri) throw new Error("MONGODB_URI is required for database-backed workspace persistence.")
  if (!global.medilinkMongoClient) {
    global.medilinkMongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 2_000 }).connect()
  }
  return global.medilinkMongoClient
}

export async function getDatabase(): Promise<Db> {
  const databaseName = process.env.MONGODB_DB || "doc_find_demo"
  if (databaseName !== "doc_find_demo") throw new Error("Doc+Find only permits the doc_find_demo database in demo mode.")
  return (await getClient()).db(databaseName)
}
