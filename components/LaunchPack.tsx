"use client";

import { CheckSquare, Copy as CopyIcon, HelpCircle, ListChecks, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreflightResult } from "@/lib/types";
import type { LaunchFix } from "@/lib/types/preflight";
import { LandingRecommendations } from "./LandingRecommendations";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "info" | "warning" | "destructive";

function priorityVariant(priority: LaunchFix["priority"]): BadgeVariant {
  if (priority === "P0") {
    return "destructive";
  }

  if (priority === "P1") {
    return "warning";
  }

  return "secondary";
}

function severityVariant(severity: PreflightResult["riskRegister"][number]["severity"]): BadgeVariant {
  if (severity === "high") {
    return "destructive";
  }

  if (severity === "medium") {
    return "warning";
  }

  return "secondary";
}

function LaunchPackPanel({
  title,
  description,
  icon,
  children
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
      {children}
    </p>
  );
}

function LaunchPathItem({
  item,
  index
}: {
  item: PreflightResult["prioritizedPlan"][number];
  index: number;
}) {
  return (
    <li className="rounded-md bg-muted p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
        <span className="text-sm font-bold text-foreground">{item.task}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.rationale}</p>
      <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Owner: {item.suggestedOwner}</p>
      <span className="sr-only">Launch task {index + 1}</span>
    </li>
  );
}

function OverflowDetails({
  count,
  label,
  children
}: {
  count: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-md border border-border bg-background p-3">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        View {count} more {label}{count === 1 ? "" : "s"}
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

function RiskItem({ item }: { item: PreflightResult["riskRegister"][number] }) {
  return (
    <article className="rounded-md bg-muted p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={severityVariant(item.severity)} className="uppercase">
          {item.severity}
        </Badge>
        <h4 className="text-sm font-bold text-foreground">{item.risk}</h4>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.mitigation}</p>
    </article>
  );
}

function OwnerItem({ item }: { item: PreflightResult["ownerChecklist"][number] }) {
  return (
    <article className="rounded-md bg-muted p-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-foreground">{item.owner}</h4>
        <Badge variant="outline">{item.items.length} {item.items.length === 1 ? "task" : "tasks"}</Badge>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {item.items.slice(0, 3).map((check) => (
          <li key={check} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-info" />
            <span>{check}</span>
          </li>
        ))}
      </ul>
      {item.items.length > 3 ? (
        <div className="mt-3">
          <OverflowDetails count={item.items.length - 3} label="owner task">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {item.items.slice(3).map((check) => (
                <li key={check} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-info" />
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </OverflowDetails>
        </div>
      ) : null}
    </article>
  );
}

function MessageItem({
  item,
  copied,
  onCopy
}: {
  item: PreflightResult["launchCopy"][number];
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <article className="rounded-md bg-muted p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="info" className="uppercase">
          {item.channel}
        </Badge>
        <Button size="sm" variant="outline" onClick={onCopy} aria-live="polite">
          <CopyIcon className="h-4 w-4" aria-hidden="true" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <h4 className="mt-3 text-sm font-bold text-foreground">{item.headline}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
    </article>
  );
}

export function LaunchPack({ result }: { result: PreflightResult }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyMessage(channel: string, headline: string, body: string, index: number) {
    const key = `${channel}-${index}`;

    try {
      await navigator.clipboard.writeText(`${headline}\n\n${body}`);
      setCopiedKey(key);
    } catch {
      setCopiedKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit uppercase">
          Launch pack
        </Badge>
        <CardTitle className="mt-3">Ready-to-use launch assets</CardTitle>
        <CardDescription>Launch path, risks, owners, messages, and open questions.</CardDescription>
      </CardHeader>
      <CardContent>
        <LandingRecommendations recommendations={result.landingRecommendations} />

        <div className="grid gap-4 xl:grid-cols-2">
          <LaunchPackPanel
            title="Launch path"
            description="Prioritized work in the order it should happen."
            icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          >
            {result.prioritizedPlan.length > 0 ? (
              <div className="space-y-3">
                <ol className="space-y-3">
                  {result.prioritizedPlan.slice(0, 4).map((item, index) => (
                    <LaunchPathItem key={`${item.task}-${index}`} item={item} index={index} />
                  ))}
                </ol>
                {result.prioritizedPlan.length > 4 ? (
                  <details className="rounded-md border border-border bg-background p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">
                      View {result.prioritizedPlan.length - 4} more launch {result.prioritizedPlan.length === 5 ? "task" : "tasks"}
                    </summary>
                    <ol className="mt-3 space-y-3" start={5}>
                      {result.prioritizedPlan.slice(4).map((item, index) => (
                        <LaunchPathItem key={`${item.task}-${index + 4}`} item={item} index={index + 4} />
                      ))}
                    </ol>
                  </details>
                ) : null}
              </div>
            ) : (
              <EmptyState>No prioritized launch path was returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>

          <LaunchPackPanel
            title="Risk radar"
            description="Known launch risks with practical mitigations."
            icon={<TriangleAlert className="h-4 w-4" aria-hidden="true" />}
          >
            {result.riskRegister.length > 0 ? (
              <div className="space-y-3">
                {result.riskRegister.slice(0, 4).map((item, index) => (
                  <RiskItem key={`${item.risk}-${index}`} item={item} />
                ))}
                {result.riskRegister.length > 4 ? (
                  <OverflowDetails count={result.riskRegister.length - 4} label="launch risk">
                    {result.riskRegister.slice(4).map((item, index) => (
                      <RiskItem key={`${item.risk}-${index + 4}`} item={item} />
                    ))}
                  </OverflowDetails>
                ) : null}
              </div>
            ) : (
              <EmptyState>No major launch risks were returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>

          <LaunchPackPanel
            title="Owner moves"
            description="Who should do what next."
            icon={<CheckSquare className="h-4 w-4" aria-hidden="true" />}
          >
            {result.ownerChecklist.length > 0 ? (
              <div className="space-y-3">
                {result.ownerChecklist.slice(0, 3).map((item) => (
                  <OwnerItem key={item.owner} item={item} />
                ))}
                {result.ownerChecklist.length > 3 ? (
                  <OverflowDetails count={result.ownerChecklist.length - 3} label="owner">
                    {result.ownerChecklist.slice(3).map((item) => (
                      <OwnerItem key={item.owner} item={item} />
                    ))}
                  </OverflowDetails>
                ) : null}
              </div>
            ) : (
              <EmptyState>No owner checklist was returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>

          <LaunchPackPanel
            title="Message starters"
            description="Channel-specific messages to refine and copy."
            icon={<CopyIcon className="h-4 w-4" aria-hidden="true" />}
          >
            {result.launchCopy.length > 0 ? (
              <div className="space-y-3">
                {result.launchCopy.slice(0, 3).map((item, index) => {
                  const copyKey = `${item.channel}-${index}`;

                  return (
                    <MessageItem
                      key={copyKey}
                      item={item}
                      copied={copiedKey === copyKey}
                      onCopy={() => {
                        void copyMessage(item.channel, item.headline, item.body, index);
                      }}
                    />
                  );
                })}
                {result.launchCopy.length > 3 ? (
                  <OverflowDetails count={result.launchCopy.length - 3} label="message">
                    {result.launchCopy.slice(3).map((item, index) => {
                      const itemIndex = index + 3;
                      const copyKey = `${item.channel}-${itemIndex}`;

                      return (
                        <MessageItem
                          key={copyKey}
                          item={item}
                          copied={copiedKey === copyKey}
                          onCopy={() => {
                            void copyMessage(item.channel, item.headline, item.body, itemIndex);
                          }}
                        />
                      );
                    })}
                  </OverflowDetails>
                ) : null}
              </div>
            ) : (
              <EmptyState>No message starters were returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>
        </div>

        <details className="mt-4 rounded-lg border border-border bg-background p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-foreground">Open questions</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">Resolve these to sharpen the next run.</span>
              </span>
            </span>
            <Badge variant="outline">{result.followUpQuestions.length}</Badge>
          </summary>
          {result.followUpQuestions.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {result.followUpQuestions.map((question) => (
                <li key={question} className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                  {question}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No critical follow-up questions returned.</p>
          )}
        </details>
      </CardContent>
    </Card>
  );
}
