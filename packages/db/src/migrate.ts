import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const url =
  process.env.DATABASE_URL ?? "postgres://okes:okes@localhost:55432/okes";

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ migrations applied");
} catch (err) {
  console.error("❌ migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
