import type { PreflightInput } from "@/lib/types";
import { getLaunchDateInputValue, isValidLaunchDate } from "@/lib/validators";

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

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function dateInputValueToUtcTime(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysUntilLaunch(input: PreflightInput, now = new Date()) {
  if (!isValidLaunchDate(input.launchDate)) {
    return null;
  }

  const launchTime = dateInputValueToUtcTime(input.launchDate);
  const todayTime = dateInputValueToUtcTime(getLaunchDateInputValue(0, now));
  const difference = (launchTime - todayTime) / MILLISECONDS_PER_DAY;

  return difference === 0 ? 0 : difference;
}
