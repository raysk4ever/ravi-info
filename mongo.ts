import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
console.log('uri', uri);

const client = new MongoClient(uri);

export async function getMongo() {
  if (!client.topology?.isConnected()) {
    await client.connect();
  }
  return client.db().collection("rate_limits");
}
