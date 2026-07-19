"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  FileSearch,
  Globe2,
  Link as LinkIcon,
  ListTree,
  RadioTower,
  XCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreflightInput } from "@/lib/types";
import type { PageSignals } from "@/lib/types/pageSignals";
import {
  getPreflightSignalsView,
  type PreflightSignalsGroup,
  type PreflightSignalsListItem,
  type PreflightSignalsSection,
  type PreflightSignalsTone
} from "@/lib/ui/preflightSignalsViewModel";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "info" | "warning" | "destructive";

const targetToneVariant = {
  success: "success",
  warning: "warning",
  neutral: "outline"
} satisfies Record<PreflightSignalsTone, BadgeVariant>;

function hasManualSource(input: PreflightInput | null | undefined) {
  return Boolean(input?.manualPageCopy.trim());
}

function hasUrlSource(input: PreflightInput | null | undefined) {
  return Boolean(input?.productUrl.trim());
}

function sectionIcon(section: PreflightSignalsSection) {
  if (section.id === "jsonLd") {
    return <FileJson className="h-4 w-4" aria-hidden="true" />;
  }

  if (section.id === "ctas") {
    return <RadioTower className="h-4 w-4" aria-hidden="true" />;
  }

  if (section.kind === "list") {
    return <ListTree className="h-4 w-4" aria-hidden="true" />;
  }

  return <FileSearch className="h-4 w-4" aria-hidden="true" />;
}

function groupDescription(group: PreflightSignalsGroup) {
  if (group.id === "pageSummary") {
    return "Observed title, description, and language.";
  }

  if (group.id === "structure") {
    return "Bounded samples of headings and calls to action.";
  }

  if (group.id === "metadata") {
    return "Social metadata, robots directives, and structured data.";
  }

  if (group.id === "crawlability") {
    return "Files that help crawlers and AI agents understand the site.";
  }

  return "Issues encountered while collecting public page evidence.";
}

function EmptySignalsState({ input }: { input: PreflightInput | null | undefined }) {
  const hasSource = hasUrlSource(input) || hasManualSource(input);

  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit uppercase">
          Signals
        </Badge>
        <CardTitle className="mt-3">No page signals in this report</CardTitle>
        <CardDescription>
          {hasSource
            ? "The run did not return page evidence, so this view stays limited to the launch report."
            : "This was a brief-only run. Add a public URL or optional manual page copy to inspect public HTML and metadata."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="info" className="flex gap-3">
          <Globe2 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <div>
            <AlertTitle>Evidence status</AlertTitle>
            <AlertDescription>
              {hasSource
                ? "No page signals were returned for the submitted source. The report does not claim page-level evidence."
                : "Brief-only reports use the launch goal, audience, constraints, and assets. They do not claim page-level evidence."}
            </AlertDescription>
          </div>
        </Alert>
      </CardContent>
    </Card>
  );
}

function TargetStatusIcon({ tone }: { tone: PreflightSignalsTone }) {
  if (tone === "success") {
    return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  }

  if (tone === "warning") {
    return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  }

  return <XCircle className="h-4 w-4" aria-hidden="true" />;
}

function TargetUrl({ label, value }: { label: string; value: string | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <a
        className="mt-1 block truncate text-sm font-bold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={value}
        target="_blank"
        rel="noreferrer"
        title={value}
      >
        {value}
      </a>
    </div>
  );
}

function ListItem({ item }: { item: PreflightSignalsListItem }) {
  return (
    <li className="rounded-md bg-muted px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        {item.href ? <LinkIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-info" aria-hidden="true" /> : null}
        {item.href ? (
          <a
            className="min-w-0 flex-1 text-sm font-semibold leading-5 text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={item.href}
            target="_blank"
            rel="noreferrer"
          >
            {item.text}
          </a>
        ) : (
          <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-foreground">{item.text}</span>
        )}
      </div>
      {item.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p> : null}
      {item.href ? <p className="mt-1 truncate text-xs text-muted-foreground">{item.href}</p> : null}
    </li>
  );
}

function SignalSection({ section }: { section: PreflightSignalsSection }) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
            {sectionIcon(section)}
          </span>
          <h3 className="min-w-0 text-sm font-bold text-foreground">{section.label}</h3>
        </div>
        {section.kind === "list" ? <Badge variant="outline">{section.totalCount}</Badge> : null}
      </div>

      {section.kind === "value" ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.value}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {section.items.map((item, index) => (
            <ListItem key={`${section.id}-${item.text}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SignalGroup({ group }: { group: PreflightSignalsGroup }) {
  return (
    <section className="rounded-lg border border-border bg-muted p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">{group.title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{groupDescription(group)}</p>
        </div>
        <Badge variant="outline">{group.sections.length}</Badge>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {group.sections.map((section) => (
          <SignalSection key={section.id} section={section} />
        ))}
      </div>
    </section>
  );
}

export function PreflightSignalsPanel({
  input,
  signals
}: {
  input: PreflightInput | null | undefined;
  signals: PageSignals | undefined;
}) {
  const view = getPreflightSignalsView(signals);

  if (!view) {
    return <EmptySignalsState input={input} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="uppercase">
                Signals
              </Badge>
              <Badge variant={targetToneVariant[view.target.tone]}>
                <TargetStatusIcon tone={view.target.tone} />
                {view.target.statusLabel}
              </Badge>
              <Badge variant="secondary">{view.target.sourceLabel}</Badge>
            </div>
            <CardTitle className="mt-3">Observed page evidence</CardTitle>
            <CardDescription>{view.target.statusSummary}</CardDescription>
          </div>
        </div>

        <div className="grid gap-3 pt-3 sm:grid-cols-2">
          <TargetUrl label="Requested target" value={view.target.requestedUrl} />
          <TargetUrl label="Final target" value={view.target.finalUrl} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {view.groups.map((group) => (
          <SignalGroup key={group.id} group={group} />
        ))}
      </CardContent>
    </Card>
  );
}
