import fastify from "fastify";
import { env } from "./config/env.js";
import { db } from "./config/db.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { WebhookController } from "./controllers/webhook.controller.js";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = fastify({ logger: true });

// Register Webhook route
app.post("/webhook", async (request, reply) => {
  // Asynchronously handle the webhook to respond immediately to Evolution API
  // This prevents Evolution API from retrying the webhook due to timeouts
  WebhookController.handleWebhook(request.body).catch((err) => {
    app.log.error("Error handling webhook:", err);
  });
  return { status: "received" };
});

// Health check route
app.get("/health", async () => {
  return { status: "ok" };
});

async function ensureDatabaseExists(connectionString: string) {
  const url = new URL(connectionString);
  const targetDb = url.pathname.substring(1);
  
  if (!targetDb || targetDb === "postgres") {
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(targetDb)) {
    throw new Error(`Invalid database name in DATABASE_URL: ${targetDb}`);
  }

  url.pathname = "/postgres";
  const controlConnectionString = url.toString();

  const client = new pg.Client({ connectionString: controlConnectionString });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );

    if (res.rowCount === 0) {
      console.log(`🔨 Database "${targetDb}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`✅ Database "${targetDb}" created successfully!`);
    } else {
      console.log(`📦 Database "${targetDb}" already exists.`);
    }
  } catch (err) {
    console.error("❌ Error ensuring database exists:", err);
    throw err;
  } finally {
    await client.end();
  }
}

const start = async () => {
  try {
    // Ensure target database exists
    await ensureDatabaseExists(env.DATABASE_URL);

    // Run Drizzle migrations on startup
    console.log("🔄 Running database migrations...");
    const migrationsFolder = path.join(__dirname, "db", "migrations");
    await migrate(db, { migrationsFolder });
    console.log("✅ Database migrations applied successfully!");

    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`🚀 Bot server listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
