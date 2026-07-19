"use client";

import { Check, Copy, MousePointerClick, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LandingRecommendations as LandingRecommendationsType } from "@/lib/types/landingLens";

type CopyKey = "hero" | "cta" | "proof";

function CopyButton({
  label,
  copied,
  onCopy
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Button type="button" size="sm" variant="outline" aria-label={label} onClick={onCopy}>
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
export function LandingRecommendations({ recommendations }: { recommendations: LandingRecommendationsType }) {
  const [copyState, setCopyState] = useState<{ key: CopyKey | null; failed: boolean }>({
    key: null,
    failed: false
  });

  async function copyRecommendation(key: CopyKey, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState({ key, failed: false });
    } catch {
      setCopyState({ key: null, failed: true });
    }
  }

  const heroCopy = `${recommendations.heroHeadline}\n\n${recommendations.heroSupportingCopy}`;
  const ctaCopy = `${recommendations.primaryCta}\n\n${recommendations.ctaRationale}`;
  const proofCopy = recommendations.proofRecommendations.map((item) => `- ${item}`).join("\n");

  return (
    <section className="mb-4 rounded-lg border border-border bg-background p-4" aria-labelledby="landing-upgrade-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <Badge variant="info">Landing Lens</Badge>
          </div>
          <h3 id="landing-upgrade-heading" className="mt-3 text-base font-bold text-foreground text-pretty">
            Landing page upgrade
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Copy-ready drafts grounded in the audit. Verify claims and proof before publishing.
          </p>
        </div>
        <p className="text-xs font-medium text-destructive" role="status" aria-live="polite">
          {copyState.failed ? "Copy failed. Select the recommendation text manually." : ""}
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.25fr_0.75fr_1fr]">
        <article className="min-w-0 rounded-md bg-muted p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Hero draft</p>
            <CopyButton
              label="Copy hero recommendation"
              copied={copyState.key === "hero"}
              onCopy={() => void copyRecommendation("hero", heroCopy)}
            />
          </div>
          <h4 className="mt-4 break-words text-lg font-bold leading-7 text-foreground text-pretty">
            {recommendations.heroHeadline}
          </h4>
          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
            {recommendations.heroSupportingCopy}
          </p>
        </article>

        <article className="min-w-0 rounded-md bg-muted p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-info">
              <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            </span>
            <CopyButton
              label="Copy CTA recommendation"
              copied={copyState.key === "cta"}
              onCopy={() => void copyRecommendation("cta", ctaCopy)}
            />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Primary CTA</p>
          <p className="mt-2 break-words text-base font-bold text-foreground">{recommendations.primaryCta}</p>
          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{recommendations.ctaRationale}</p>
        </article>

        <article className="min-w-0 rounded-md bg-muted p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-success">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <CopyButton
              label="Copy proof recommendations"
              copied={copyState.key === "proof"}
              onCopy={() => void copyRecommendation("proof", proofCopy)}
            />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Proof plan</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {recommendations.proofRecommendations.map((recommendation) => (
              <li key={recommendation} className="flex min-w-0 gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-success" aria-hidden="true" />
                <span className="min-w-0 break-words">{recommendation}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
