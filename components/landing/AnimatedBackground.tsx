"use client";

import { motion, useReducedMotion } from "motion/react";

export function AnimatedBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.14]" />
      <div className="absolute inset-x-0 top-0 h-96 bg-[linear-gradient(180deg,var(--accent),transparent)] opacity-30" />
      <motion.div
        className="absolute left-1/2 top-24 h-px w-[58rem] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,var(--info),var(--success),transparent)]"
        animate={prefersReducedMotion ? undefined : { opacity: [0.25, 0.9, 0.25], x: [-18, 18, -18] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full border border-border opacity-20"
        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
