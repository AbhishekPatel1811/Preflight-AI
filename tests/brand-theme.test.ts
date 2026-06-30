import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("uses PreflightAI brand and precision theme tokens", () => {
  const layout = read("app/layout.tsx");
  const globals = read("app/globals.css");
  const visibleSources = [
    "app/layout.tsx",
    "components/PreflightApp.tsx",
    "components/landing/LandingNavigation.tsx",
    "components/landing/HeroSection.tsx",
    "components/landing/AnimatedAgentPreview.tsx",
    "components/landing/AgentBrainSection.tsx",
    "components/landing/CTASection.tsx",
    "components/landing/LandingPage.tsx",
    "lib/landing-content.ts",
    "README.md"
  ]
    .map(read)
    .join("\n");

  assert.match(layout, /Inter/);
  assert.match(layout, /JetBrains_Mono/);
  assert.doesNotMatch(layout, /import\s+\{[^}]*Georgia/);
  assert.match(globals, /--font-serif:\s*Georgia/);
  assert.match(globals.toLowerCase(), /#d7ff00/);
  assert.match(globals, /--radius:\s*1rem/);
  assert.doesNotMatch(globals, /letter-spacing:\s*-0\.02em/);
  assert.match(visibleSources, /PreflightAI/);
  assert.doesNotMatch(visibleSources, /Launch Lens AI|Launch Lens|LaunchLens|Launch Desk|LaunchDesk|launchLens/);
  assert.doesNotMatch(visibleSources, /\bRocket\b|\bSparkles\b|\bBrainCircuit\b/);
  assert.doesNotMatch(visibleSources, /Local MVP|Agent preview/);
});
