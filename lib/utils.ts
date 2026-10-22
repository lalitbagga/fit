import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the iOS type scale from tailwind.config.ts; otherwise it
// reads e.g. `text-headline` as a colour and drops it when merged with `text-primary`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "large-title",
            "title1",
            "title2",
            "title3",
            "headline",
            "body",
            "callout",
            "subhead",
            "footnote",
            "caption1",
            "caption2",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    // Server components render on UTC hosts; pin to the gym's time zone so an
    // evening session isn't shown as the next day.
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your streak today!";
  if (streak === 1) return "Great start — keep it going!";
  if (streak === 2) return "Two days strong!";
  if (streak === 3) return "Three days — you're building a habit!";
  if (streak < 7) return `${streak} days — you're on fire! 🔥`;
  if (streak === 7) return "One full week — BEAST MODE! 🏆";
  if (streak < 14) return `${streak} days — absolutely crushing it!`;
  if (streak === 14) return "Two weeks consistent — LEGENDARY! 🦁";
  return `${streak} days — you're unstoppable!`;
}

/** Returns the ISO date string (YYYY-MM-DD) in local time */
export function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
}
