// Applies additive schema changes to the production database during the
// Vercel production build. `prisma db push` refuses destructive changes
// (no --accept-data-loss), and a failure here FAILS the build on purpose:
// the new code reads these columns, so it must never deploy without them.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("db-push: skipped (not a production Vercel build)");
} else {
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
}
