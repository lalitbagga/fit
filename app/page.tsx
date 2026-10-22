import Link from "next/link";
import { ChevronRight, History, LineChart } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { StreakCard } from "@/components/streak-card";
import { TemplateSelector } from "@/components/template-selector";
import { AiWorkoutGenerator } from "@/components/ai-workout-generator";
import { DiscardWorkoutButton } from "@/components/discard-workout-button";
import {
  getStreak,
  getRecentWorkouts,
  getTemplates,
  getInProgressWorkout,
} from "@/lib/actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function todayLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default async function Dashboard() {
  const session = await auth();
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const [streak, recentWorkouts, templates, inProgress] = await Promise.all([
    getStreak(),
    getRecentWorkouts(),
    getTemplates(),
    getInProgressWorkout(),
  ]);

  return (
    <div className="flex flex-col pt-3">
      {/* ── Large title header ─────────────────────── */}
      <header className="flex items-end justify-between gap-3 pb-4">
        <div className="min-w-0">
          <p className="text-footnote font-semibold uppercase text-muted-foreground">
            {todayLabel()}
          </p>
          <h1 className="truncate text-large-title text-foreground">Hi, {firstName}</h1>
        </div>
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="mb-1 h-9 w-9 shrink-0 rounded-full"
          />
        ) : (
          <div className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-subhead font-semibold text-muted-foreground">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3">
        {/* ── Resume in-progress workout ───────────── */}
        {inProgress && (
          <div className="rounded-xl bg-card p-4">
            <p className="flex items-center gap-1.5 text-subhead font-semibold text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              In Progress
            </p>
            <p className="mt-1 truncate text-headline text-foreground">
              {inProgress.template?.emoji ?? inProgress.templateEmoji}{" "}
              {inProgress.template?.name ?? inProgress.templateName ?? "Workout"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="lg" className="flex-1">
                <Link href={`/workout/${inProgress.id}`}>Resume</Link>
              </Button>
              <DiscardWorkoutButton workoutId={inProgress.id} />
            </div>
          </div>
        )}

        <StreakCard streak={streak} />

        {/* ── Primary actions ──────────────────────── */}
        <div className="flex flex-col gap-2 pt-1">
          <TemplateSelector templates={templates} />
          <AiWorkoutGenerator />
        </div>
      </div>

      {/* ── Recent workouts ────────────────────────── */}
      <section className="pt-7">
        <div className="flex items-baseline justify-between px-1 pb-2">
          <h2 className="text-title3 font-semibold text-foreground">Recent Workouts</h2>
          {recentWorkouts.length > 0 && (
            <Link href="/history" className="text-body text-primary active:opacity-50">
              Show All
            </Link>
          )}
        </div>

        {recentWorkouts.length > 0 ? (
          <div className="ios-list">
            {recentWorkouts.map((w) => (
              <Link key={w.id} href={`/history/${w.id}`} className="ios-row">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-[18px]">
                  {w.template?.emoji ?? w.templateEmoji ?? "💪"}
                </span>
                <span className="ios-row-content">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-foreground">
                      {w.template?.name ?? w.templateName ?? "Custom Workout"}
                    </span>
                    <span className="block text-subhead text-muted-foreground">
                      {w.completedAt ? formatDate(new Date(w.completedAt)) : "—"} ·{" "}
                      {w._count.exercises} exercises
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-card px-6 py-8 text-center">
            <p className="text-headline text-foreground">No Workouts Yet</p>
            <p className="mt-1 text-subhead text-muted-foreground">
              Tap Start Workout and pick a plan. Your sessions will show up here.
            </p>
          </div>
        )}
      </section>

      {/* ── Browse ─────────────────────────────────── */}
      <section className="pt-7">
        <div className="ios-list">
          <Link href="/history" className="ios-row">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-primary">
              <History className="h-[18px] w-[18px] text-white" />
            </span>
            <span className="ios-row-content">
              <span className="flex-1 text-body text-foreground">History</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" />
            </span>
          </Link>
          <Link href="/progress" className="ios-row">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-success">
              <LineChart className="h-[18px] w-[18px] text-white" />
            </span>
            <span className="ios-row-content">
              <span className="flex-1 text-body text-foreground">Progress</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" />
            </span>
          </Link>
        </div>
      </section>

      <section className="pt-7">
        <form
          className="ios-list"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="ios-row justify-center pl-0">
            <span className="ios-row-content justify-center pr-0">
              <span className="text-body text-destructive">Sign Out</span>
            </span>
          </button>
        </form>
        <p className="pt-3 text-center text-caption1 text-tertiary">
          FIT v{process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
      </section>
    </div>
  );
}
