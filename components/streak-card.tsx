import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStreakMessage } from "@/lib/utils";

export function StreakCard({ streak }: { streak: number }) {
  const message = getStreakMessage(streak);
  const active = streak > 0;

  return (
    <div className="rounded-xl bg-card p-4">
      <p
        className={cn(
          "flex items-center gap-1.5 text-subhead font-semibold",
          active ? "text-warning" : "text-muted-foreground"
        )}
      >
        <Flame className="h-4 w-4" fill={active ? "currentColor" : "none"} />
        Streak
      </p>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-rounded text-[34px] font-bold leading-[41px] tabular text-foreground">
          {streak}
        </span>
        <span className="text-headline text-muted-foreground">
          {streak === 1 ? "day" : "days"}
        </span>
      </div>
      <p className="mt-0.5 text-subhead text-muted-foreground">{message}</p>
    </div>
  );
}
