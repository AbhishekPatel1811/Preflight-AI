import type { LaunchFix, PreflightReport } from "@/lib/types/preflight";

export type ScoreTone = "success" | "warning" | "destructive";

export type PreflightModuleCard = {
  id: keyof PreflightReport["moduleScores"];
  label: string;
  description: string;
  score: number;
  tone: ScoreTone;
};

export type PreflightFixLane = {
  id: LaunchFix["priority"];
  title: string;
  description: string;
  fixes: LaunchFix[];
};

const moduleMeta: Array<Pick<PreflightModuleCard, "id" | "label" | "description">> = [
  {
    id: "positioning",
    label: "Positioning",
    description: "Audience, promise, and why-now clarity"
  },
  {
    id: "conversion",
    label: "Conversion",
    description: "Signup path, CTA, and activation friction"
  },
  {
    id: "trust",
    label: "Trust",
    description: "Proof, risk reversal, and credibility"
  },
  {
    id: "demoClarity",
    label: "Demo clarity",
    description: "How quickly the product value is understood"
  },
  {
    id: "geoReadiness",
    label: "GEO readiness",
    description: "AI-search and answer-engine discoverability"
  },
  {
    id: "launchOps",
    label: "Launch ops",
    description: "Owners, sequencing, fallback, and QA"
  }
];

const fixLaneMeta: Array<Omit<PreflightFixLane, "fixes">> = [
  {
    id: "P0",
    title: "Fix now",
    description: "Launch blockers and trust gaps to solve before public traffic."
  },
  {
    id: "P1",
    title: "Improve next",
    description: "High-leverage upgrades once the launch path is safe."
  },
  {
    id: "P2",
    title: "Polish later",
    description: "Nice-to-have refinements for stronger follow-through."
  }
];

export function getScoreTone(score: number): ScoreTone {
  if (score >= 75) {
    return "success";
  }

  if (score >= 50) {
    return "warning";
  }

  return "destructive";
}

export function getPreflightReportView(report: PreflightReport) {
  const moduleCards: PreflightModuleCard[] = moduleMeta.map((module) => ({
    ...module,
    score: report.moduleScores[module.id],
    tone: getScoreTone(report.moduleScores[module.id])
  }));

  const fixLanes: PreflightFixLane[] = fixLaneMeta.map((lane) => ({
    ...lane,
    fixes: report.topFixes.filter((fix) => fix.priority === lane.id)
  }));

  return {
    moduleCards,
    fixLanes,
    spotlightFix: report.topFixes.find((fix) => fix.priority === "P0") ?? report.topFixes[0] ?? null,
    sourceLabel:
      report.source === "preflight_core"
        ? "Generated from your brief, constraints, assets, and planning tools."
        : report.source
  };
}
