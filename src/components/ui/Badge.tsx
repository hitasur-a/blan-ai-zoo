// BLAN ステータスバッジ
// ニューモーフィズム の小さな浮き上がり + 色違い

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "orange" | "neutral" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
  children?: ReactNode;
}

const TONE_CLASSES: Record<Tone, string> = {
  orange: "bg-[#fb6103]/10 text-[#fb6103] ring-1 ring-[#fb6103]/20",
  neutral: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

export function Badge({
  tone = "neutral",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold tracking-wider uppercase",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
