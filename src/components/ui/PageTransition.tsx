"use client";
import { AnimatePresence, motion } from "framer-motion";
import { VARIANTS } from "@/lib/motion";
import type { MotionTier } from "@/hooks/useMotionTier";

interface PageTransitionProps {
  children: React.ReactNode;
  layoutKey: string;
  tier?: MotionTier;
}

export function PageTransition({ children, layoutKey, tier = "full" }: PageTransitionProps) {
  const variants = tier === "reduced" ? VARIANTS.fadeIn : VARIANTS.fadeUp;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={layoutKey}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
