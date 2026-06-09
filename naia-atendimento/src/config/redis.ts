import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("💾 Redis connected successfully!");
});

redis.on("error", (err: unknown) => {
  console.error("❌ Redis error:", err);
});
