import Link from "next/link";
import { Activity, ChevronRight, Clock, Dumbbell, LogOut, TrendingUp } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StreakCard } from "@/components/streak-card";
import { TemplateSelector } from "@/components/template-selector";
import { AiWorkoutGenerator } from "@/components/ai-workout-generator";
import {
  getStreak,
  getRecentWorkouts,
  getTemplates,
  getInProgressWorkout,
} from "@/lib/actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    <div className="flex flex-col gap-5 pt-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Hey {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            GoodLife · Body Recomp
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? ""}
              className="h-10 w-10 rounded-full border border-border"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-lg">🏋️</span>
            </div>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Task 2: Attendance Streak ────────────────── */}
      <StreakCard streak={streak} />

      {/* ── Resume in-progress workout ───────────────── */}
      {inProgress && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider">
                Workout in progress
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {inProgress.template?.emoji} {inProgress.template?.name}
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href={`/workout/${inProgress.id}`}>Resume</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Task 2: Start New Workout ────────────────── */}
      <TemplateSelector templates={templates} />

      {/* ── AI Workout Generator ─────────────────────── */}
      <AiWorkoutGenerator />

      {/* ── Quick stats ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-4 gap-1">
            <Activity className="h-5 w-5 text-primary mb-1" />
            <span className="text-2xl font-black tabular-nums">
              {recentWorkouts.length}
            </span>
            <span className="text-xs text-muted-foreground text-center">
              sessions
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-4 gap-1">
            <Dumbbell className="h-5 w-5 text-primary mb-1" />
            <span className="text-2xl font-black tabular-nums">4</span>
            <span className="text-xs text-muted-foreground text-center">
              templates
            </span>
          </CardContent>
        </Card>
        <Link href="/progress" className="block">
          <Card className="h-full hover:border-primary/40 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-4 gap-1 h-full">
              <TrendingUp className="h-5 w-5 text-green-400 mb-1" />
              <span className="text-2xl font-black tabular-nums text-green-400">
                📈
              </span>
              <span className="text-xs text-muted-foreground text-center">
                progress
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Recent Workouts ──────────────────────────── */}
      {recentWorkouts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <Link
              href="/history"
              className="flex items-center justify-between group"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent Sessions
              </CardTitle>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-0.5">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {recentWorkouts.map((w) => (
              <Link
                key={w.id}
                href={`/history/${w.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/60 transition-colors active:bg-accent -mx-2"
              >
                <span className="text-2xl shrink-0">
                  {w.template?.emoji ?? "💪"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {w.template?.name ?? "Custom Workout"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.completedAt ? formatDate(new Date(w.completedAt)) : "—"}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {w.exercises.length} ex
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ──────────────────────────────── */}
      {recentWorkouts.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="text-5xl">🚀</span>
          <p className="font-semibold text-foreground">
            Your first session awaits!
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Hit Start New Workout, pick a template, and let&apos;s build that
            streak. You&apos;ve got this.
          </p>
        </div>
      )}
    </div>
  );
}
