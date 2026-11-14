import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    if (process.env.VERCEL) {
      // On Vercel a missing database would only surface later as broken pages.
      throw new Error(
        "DATABASE_URL is not set for this Vercel environment. Connect the Neon database to this environment (Production and Preview) in Vercel → Storage, then redeploy.",
      );
    }
    console.log("No DATABASE_URL set, skipping migrations.");
    return;
  }
  const sql = postgres(url, { max: 1, prepare: false });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
