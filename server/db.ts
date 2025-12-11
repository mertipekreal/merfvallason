import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import ws from "ws";

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL is not set. Database features will be disabled.");
}

// Create connection pool
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Create Drizzle instance
export const db = pool ? drizzle(pool, { schema }) : null;

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!db) {
    console.warn("Database not configured");
    return false;
  }

  try {
    // Simple query to check connection
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Import sql helper
import { sql } from "drizzle-orm";

// Export everything from schema for convenience
export * from "@shared/schema";

