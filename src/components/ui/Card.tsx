// BLAN ニューモーフィズム カード
// raised (浮いている) or inset (凹んでいる) を選択可

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "raised" | "inset" | "flat";
  padding?: "sm" | "md" | "lg" | "xl";
  children?: ReactNode;
}

const PADDING_CLASSES = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

export function Card({
  variant = "raised",
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  const variantClass =
    variant === "raised"
      ? "neu-raised"
      : variant === "inset"
        ? "neu-inset"
        : "border border-stone-200 bg-white";

  return (
    <div
      className={cn(
        "rounded-2xl",
        variantClass,
        PADDING_CLASSES[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
