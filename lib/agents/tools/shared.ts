import type { PreflightInput } from "@/lib/types";

export type CandidateTask = {
  task: string;
  priority: "P0" | "P1" | "P2";
  suggestedOwner: string;
  reason: string;
};

export function splitList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function daysUntilLaunch(input: PreflightInput) {
  const launchTime = new Date(input.launchDate).getTime();
  const now = Date.now();

  if (Number.isNaN(launchTime)) {
    return null;
  }

  return Math.ceil((launchTime - now) / (1000 * 60 * 60 * 24));
}
