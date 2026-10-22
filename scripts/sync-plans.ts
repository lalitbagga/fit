/**
 * Sync workout plans from plans/*.json into the database.
 *
 *   npx tsx scripts/sync-plans.ts            # apply
 *   npx tsx scripts/sync-plans.ts --dry-run  # print what would change
 *   npx tsx scripts/sync-plans.ts --build    # used by `npm run build` on Vercel:
 *                                            # only runs for production deploys and
 *                                            # never fails the build
 *
 * Plans are code: each JSON file lists templates by name. The sync is
 * additive and idempotent:
 *   - A template whose name already exists keeps its id/order (so workout
 *     history stays linked); only its emoji and exercise list are replaced.
 *   - A new template is appended to "My Workouts" (order >= 4, after the
 *     seeded GoodLife Plans) — same rule as createWorkoutTemplate().
 *   - Templates not named in any plan file are never touched or deleted.
 *   - Every exercise name is upserted into ExerciseLibrary; a plan-supplied
 *     gifUrl is only written when the library entry has none.
 *
 * On Vercel, `npm run build` runs this with --build, so pushing to main syncs
 * the plans into the production database as part of the normal deploy.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const PLANS_DIR = join(process.cwd(), "plans");
const SEEDED_COUNT = 4; // must match components/template-selector.tsx

type PlanExercise = {
  name: string;
  sets: number;
  repsTarget: string;
  notes?: string;
  gifUrl?: string;
};
type PlanTemplate = { name: string; emoji: string; exercises: PlanExercise[] };
type PlanFile = { plan: string; description?: string; templates: PlanTemplate[] };

function fail(file: string, msg: string): never {
  throw new Error(`${file}: ${msg}`);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validate(file: string, raw: unknown): PlanFile {
  const p = raw as PlanFile;
  if (!p || typeof p !== "object") fail(file, "not a JSON object");
  if (!isNonEmptyString(p.plan)) fail(file, '"plan" must be a non-empty string');
  if (!Array.isArray(p.templates) || p.templates.length === 0) {
    fail(file, '"templates" must be a non-empty array');
  }
  p.templates.forEach((t, ti) => {
    const where = `templates[${ti}]`;
    if (!isNonEmptyString(t.name)) fail(file, `${where}.name is required`);
    if (!isNonEmptyString(t.emoji)) fail(file, `${where}.emoji is required`);
    if (!Array.isArray(t.exercises) || t.exercises.length === 0) {
      fail(file, `${where}.exercises must be a non-empty array`);
    }
    t.exercises.forEach((e, ei) => {
      const w = `${where}.exercises[${ei}]`;
      if (!isNonEmptyString(e.name)) fail(file, `${w}.name is required`);
      if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 10) {
        fail(file, `${w}.sets must be an integer 1-10`);
      }
      if (!isNonEmptyString(e.repsTarget)) fail(file, `${w}.repsTarget is required`);
      if (e.notes !== undefined && typeof e.notes !== "string") fail(file, `${w}.notes must be a string`);
      if (e.gifUrl !== undefined && !/^https:\/\//.test(e.gifUrl)) fail(file, `${w}.gifUrl must be https`);
    });
  });
  return p;
}

function loadPlans(): { file: string; plan: PlanFile }[] {
  const files = readdirSync(PLANS_DIR).filter((f) => f.endsWith(".json")).sort();
  const plans = files.map((file) => ({
    file,
    plan: validate(file, JSON.parse(readFileSync(join(PLANS_DIR, file), "utf8"))),
  }));

  // A template name may only be defined once across all plan files.
  const seen = new Map<string, string>();
  for (const { file, plan } of plans) {
    for (const t of plan.templates) {
      const key = t.name.trim();
      if (seen.has(key)) fail(file, `template "${key}" is also defined in ${seen.get(key)}`);
      seen.set(key, file);
    }
  }
  return plans;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (process.argv.includes("--build")) {
    // Preview deploys share the prod database, and local/Docker builds have no
    // DB — only the production Vercel build is allowed to write.
    if (process.env.VERCEL_ENV !== "production" || !process.env.DATABASE_URL) {
      console.log("sync-plans: skipped (not a production Vercel build)");
      return;
    }
  }
  const plans = loadPlans();
  const prisma = new PrismaClient();

  try {
    const last = await prisma.workoutTemplate.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = Math.max((last?.order ?? -1) + 1, SEEDED_COUNT);

    for (const { file, plan } of plans) {
      console.log(`\n📄 ${file} — ${plan.plan}`);

      for (const t of plan.templates) {
        const name = t.name.trim();
        const existing = await prisma.workoutTemplate.findFirst({
          where: { name },
          select: { id: true, order: true },
        });
        const order = existing?.order ?? nextOrder++;
        const label = existing ? "update" : "create";
        console.log(`  ${label === "create" ? "＋" : "↻"} ${label} "${name}" (order ${order}, ${t.exercises.length} exercises)`);
        t.exercises.forEach((e, i) =>
          console.log(`      ${i + 1}. ${e.name} — ${e.sets}×${e.repsTarget}`)
        );
        if (dryRun) continue;

        await prisma.$transaction(async (tx) => {
          const template = existing
            ? await tx.workoutTemplate.update({
                where: { id: existing.id },
                data: { emoji: t.emoji },
              })
            : await tx.workoutTemplate.create({
                data: { name, emoji: t.emoji, order },
              });

          await tx.templateExercise.deleteMany({ where: { templateId: template.id } });
          await tx.templateExercise.createMany({
            data: t.exercises.map((e, i) => ({
              templateId: template.id,
              name: e.name.trim(),
              sets: e.sets,
              repsTarget: e.repsTarget.trim(),
              notes: e.notes?.trim() || null,
              order: i,
            })),
          });
        });
      }
    }

    // Exercise library: canonical names (+ image only where missing).
    const exercises = new Map<string, string | undefined>();
    for (const { plan } of plans) {
      for (const t of plan.templates) {
        for (const e of t.exercises) {
          const name = e.name.trim();
          exercises.set(name, e.gifUrl ?? exercises.get(name));
        }
      }
    }
    console.log(`\n📚 Exercise library: ${exercises.size} names`);
    if (!dryRun) {
      for (const [name, gifUrl] of exercises) {
        await prisma.exerciseLibrary.upsert({
          where: { name },
          create: { name, gifUrl: gifUrl ?? null },
          update: {},
        });
        if (gifUrl) {
          await prisma.exerciseLibrary.updateMany({
            where: { name, gifUrl: null },
            data: { gifUrl },
          });
        }
      }
    }

    console.log(dryRun ? "\n🔎 Dry run — nothing written." : "\n✅ Plans synced.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  // A plan problem must never block an app deploy.
  process.exit(process.argv.includes("--build") ? 0 : 1);
});
