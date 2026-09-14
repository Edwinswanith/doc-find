import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medilink?replicaSet=rs0&directConnection=true"

declare global {
  var medilinkMongoClient: Promise<MongoClient> | undefined
}

function getClient() {
  if (!global.medilinkMongoClient) {
    global.medilinkMongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 2_000 }).connect()
  }
  return global.medilinkMongoClient
}

export async function getDatabase(): Promise<Db> {
  return (await getClient()).db()
}
