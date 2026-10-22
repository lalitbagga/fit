import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Already logged in → go home
  const session = await auth();
  if (session) redirect("/");

  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8">
      {/* Logo / branding */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-20 w-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-4xl">🏋️</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">FIT</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Track your GoodLife sessions, build your streak, and watch yourself get stronger.
        </p>
      </div>

      {/* Sign in card */}
      <div className="w-full max-w-sm flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <p className="text-center text-sm text-muted-foreground">
          Sign in to see your personal workout history and progress
        </p>

        <GoogleSignInButton callbackUrl={callbackUrl ?? "/"} />

        <p className="text-center text-xs text-muted-foreground">
          Your data is private — only you can see your workouts.
        </p>
      </div>
    </div>
  );
}
