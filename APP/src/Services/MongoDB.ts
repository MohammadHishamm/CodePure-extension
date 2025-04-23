// services/MongoDB.ts
import { MongoClient, Db, ObjectId } from "mongodb";

export class MongoService {
  private static instance: MongoService;
  private client: MongoClient;
  private db: Db | null = null;

  private constructor(
    private readonly uri: string,
    private readonly dbName: string
  ) {
    this.client = new MongoClient(uri);
  }

  public static getInstance(): MongoService {
    if (!MongoService.instance) {
      MongoService.instance = new MongoService(
        "mongodb+srv://zayaty:2Q77QEOGrd9818bV@cluster0.33tbygn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
        "CodePure"
      );
    }
    return MongoService.instance;
  }

  public async connect(): Promise<void> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log("Database Status: Connected");
      console.log(`Using database: ${this.db.databaseName}`);
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error("❌ MongoDB not connected. Call connect() first.");
    }
    return this.db;
  }

  // ✅ New method to get repo by name
  public async getRepoIdByName(repoName: string): Promise<string | null> {
    try {
      const db = this.getDb();
      const repo = await db.collection("Repos").findOne({ repoName });

      if (repo && repo._id) {
        console.log(`✅ Found repo ID for "${repoName}": ${repo._id.toString()}`);
        return repo._id.toString();
      } else {
        console.log(`❌ No repository found for name: "${repoName}"`);
        return null;
      }
    } catch (err) {
      console.error("❌ Error fetching repo ID from MongoDB:", err);
      return null;
    }
  }
}
