// services/MongoDB.ts
import { MongoClient, Db } from "mongodb";

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
}
