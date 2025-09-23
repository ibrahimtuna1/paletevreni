"use client";

import { MotionConfig } from "framer-motion";

export default function MotionRoot({ children }: { children: React.ReactNode }) {
  // OS "reduce motion" açık olsa bile animasyonları oynat:
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}
