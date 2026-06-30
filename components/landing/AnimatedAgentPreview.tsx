"use client";

import { Aperture, CheckCircle2, ClipboardCheck, Gauge, RadioTower, ScanSearch, ShieldAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { checklistPreview, heroEvents } from "@/lib/landing-content";

const iconMap = [Aperture, Gauge, ShieldAlert, ScanSearch, ClipboardCheck, RadioTower];

export function AnimatedAgentPreview() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Card className="relative overflow-hidden border-border bg-card p-4 shadow-2xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),var(--info),var(--success))]" />
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Sample preview</p>
          <h2 className="mt-1 text-base font-bold text-foreground">Hybrid launch report</h2>
        </div>
        <Badge variant="warning">Sample run</Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-2">
          {heroEvents.map((event, index) => {
            const Icon = iconMap[index] || Gauge;

            return (
              <motion.div
                key={`${event.label}-${event.detail}`}
                className="flex gap-3 rounded-md border border-border bg-background p-3"
                initial={prefersReducedMotion ? false : { opacity: 0, x: -18 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{ delay: index * 0.12, duration: 0.45 }}
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted text-info">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">{event.label}</p>
                  <p className="mt-1 text-sm leading-5 text-foreground">{event.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-3">
          <motion.div
            className="rounded-md border border-border bg-foreground p-4 text-background"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.55 }}
          >
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase">
              <span>Readiness card</span>
              <span className="text-background">72/100</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <motion.div
                className="h-2 rounded-full bg-[linear-gradient(90deg,var(--warning),var(--success))]"
                initial={prefersReducedMotion ? false : { width: "22%" }}
                animate={prefersReducedMotion ? undefined : { width: "72%" }}
                transition={{ delay: 0.55, duration: 1.1, ease: "easeOut" }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-background">
              Spotlight fix: verify onboarding before public traffic. Then move the remaining work into fix lanes and the launch pack.
            </p>
          </motion.div>

          <div className="rounded-md border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Action board</p>
            <ul className="mt-3 space-y-2">
              {checklistPreview.map((item, index) => (
                <motion.li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.35 }}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-success" aria-hidden="true" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
