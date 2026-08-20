import JSZip from "jszip";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function torontoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function csvCell(value: string | number | null): string {
  if (value === null || value === "") return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";

  if ((from && !DATE_PATTERN.test(from)) || (to && !DATE_PATTERN.test(to))) {
    return new Response("Dates must use YYYY-MM-DD format.", { status: 400 });
  }
  if (from && to && from > to) {
    return new Response("From date must be before or equal to To date.", { status: 400 });
  }

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id, completedAt: { not: null } },
    orderBy: { completedAt: "asc" },
    include: {
      template: { select: { name: true } },
      exercises: {
        orderBy: { order: "asc" },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });

  const selected = workouts.filter((workout) => {
    const date = torontoDate(workout.completedAt!);
    return (!from || date >= from) && (!to || date <= to);
  });

  const sessionRows: (string | number | null)[][] = [["id", "date", "workout", "notes"]];
  const exerciseRows: (string | number | null)[][] = [["id", "session", "name", "notes"]];
  const setRows: (string | number | null)[][] = [[
    "exercise",
    "set",
    "weight_lb",
    "reps",
    "duration_sec",
    "done",
  ]];

  let exerciseNumber = 0;
  selected.forEach((workout, workoutIndex) => {
    const sessionId = `S${workoutIndex + 1}`;
    sessionRows.push([
      sessionId,
      torontoDate(workout.completedAt!),
      workout.template?.name ?? "Workout",
      workout.notes,
    ]);

    workout.exercises.forEach((exercise) => {
      const exerciseId = `E${++exerciseNumber}`;
      exerciseRows.push([exerciseId, sessionId, exercise.name, exercise.notes]);
      exercise.sets.forEach((set) => {
        setRows.push([
          exerciseId,
          set.setNumber,
          set.weight,
          set.reps,
          set.duration,
          set.completed ? 1 : 0,
        ]);
      });
    });
  });

  const archive = new JSZip();
  archive.file("sessions.csv", csv(sessionRows));
  archive.file("exercises.csv", csv(exerciseRows));
  archive.file("sets.csv", csv(setRows));
  archive.file(
    "README.txt",
    [
      "FIT workout export optimized for AI analysis.",
      "sessions.csv: one row per workout; notes are warm-up/general session notes.",
      "exercises.csv: exercises linked to sessions by the session column.",
      "sets.csv: sets linked to exercises; weight is lb, duration is seconds, done is 1/0.",
      "Dates use America/Toronto local time.",
    ].join("\n") + "\n"
  );

  const body = await archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const responseBody = new Uint8Array(body).buffer;
  const range = from || to ? `-${from || "start"}-to-${to || "latest"}` : "-all";

  return new Response(responseBody, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fit-ai-export${range}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
