"use client";

import { motion, useReducedMotion, useScroll } from "motion/react";

export function ScrollProgress() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-[linear-gradient(90deg,var(--primary),var(--info),var(--success))]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
