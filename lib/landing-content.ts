import { PRODUCT_NAME } from "@/lib/brand";

export const navItems = [
  { label: "Problem", href: "#problem" },
  { label: "Workflow", href: "#workflow" },
  { label: "Report", href: "#outputs" },
  { label: "Under the hood", href: "#lens-engine" }
];

export const heroEvents = [
  { label: "Brief", detail: "Launch an AI code review assistant for small engineering teams." },
  { label: "Score", detail: "Launch readiness lands as one clear report card." },
  { label: "P0", detail: "Verify onboarding before the public announcement." },
  { label: "Board", detail: "Fix now, improve next, and polish later lanes stay separate." },
  { label: "Pack", detail: "Plan, risks, owners, copy, and questions are grouped for action." }
];

export const problemCards = [
  {
    title: "Ownership is fuzzy",
    body: "Everyone knows the launch matters, but nobody knows who owns each blocker when the deadline gets close."
  },
  {
    title: "Risks show up too late",
    body: "QA, support, launch channels, and missing assets get checked after the team has already announced a date."
  },
  {
    title: "Copy is an afterthought",
    body: "The feature ships, then the team scrambles to explain who it is for and why anyone should care."
  },
  {
    title: "Meetings replace systems",
    body: "The same launch context gets repeated across docs, tickets, chats, and calls without becoming an operating plan."
  }
];

export const workflowSteps = [
  {
    eyebrow: "01",
    title: "Guide the preflight",
    body: "Add the public product URL, launch goal, audience, launch date, constraints, and available assets in one guided brief."
  },
  {
    eyebrow: "02",
    title: "Read the report card",
    body: `${PRODUCT_NAME} scores readiness, explains the top fix, and shows module health without burying the answer.`
  },
  {
    eyebrow: "03",
    title: "Work the fixes board",
    body: "The most important work is split into fix now, improve next, and polish later lanes."
  },
  {
    eyebrow: "04",
    title: "Use the launch pack",
    body: "Priorities, risks, owner moves, message starters, and open questions stay grouped for action."
  }
];

export const outputExamples = [
  {
    label: `${PRODUCT_NAME} report`,
    title: "72/100 - close, with fixes.",
    body: "The first answer is not another wall of text. You see readiness, module health, and the one fix that matters most.",
    meta: "Score, modules, spotlight fix",
    points: ["Readiness score", "Module meters", "Spotlight fix"]
  },
  {
    label: "What to fix before launch",
    title: "Fix now. Improve next. Polish later.",
    body: "Top fixes become simple lanes, so founders and teams can agree on what blocks launch and what can wait.",
    meta: "P0, P1, P2 lanes",
    points: ["P0 blockers", "P1 upgrades", "P2 polish"]
  },
  {
    label: "Launch pack",
    title: "One grouped pack for the work.",
    body: "The plan, risks, owners, copy, and open questions stay available without forcing a long scroll through separate modules.",
    meta: "Plan, risk, owner, copy",
    points: ["Launch path", "Risk radar", "Owner moves"]
  }
];

export const toolCards = [
  {
    title: "Extract launch tasks",
    body: "Turns rough launch notes into concrete work with priorities, rationale, and suggested owners."
  },
  {
    title: "Check readiness rubric",
    body: "Scores positioning, conversion, trust, demo clarity, AI-search readiness, and launch operations."
  },
  {
    title: "Generate owner checklists",
    body: "Transforms launch work into role-specific lists for engineering, product, marketing, and support."
  },
  {
    title: "Draft channel copy",
    body: "Creates usable first-pass copy for landing pages, email, LinkedIn, changelog, and launch communities."
  }
];

export const checklistPreview = [
  "Readiness score: 72/100",
  "P0: verify onboarding path",
  "Risk: demo asset may slip",
  "Owner: engineering"
];
