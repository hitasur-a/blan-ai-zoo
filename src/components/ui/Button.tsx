// BLAN ニューモーフィズム ボタン
// 物理ボタンを押した感覚を再現 (raised → pressed の影反転)
// v2 アクセントカラー #FB6103 を使用

"use client";

import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-8 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", active = false, className, children, onMouseDown, onMouseUp, onMouseLeave, onTouchStart, onTouchEnd, ...props }, ref) => {
    const [pressed, setPressed] = useState(false);

    const baseClasses = cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-wide",
      "transition-all duration-150 outline-none whitespace-nowrap select-none",
      "disabled:cursor-not-allowed disabled:opacity-40",
      SIZE_CLASSES[size]
    );

    // バリアント別スタイル
    const variantClasses = (() => {
      if (variant === "primary") {
        // BLAN オレンジの "発光" するボタン (押下時に少し沈む)
        return cn(
          "bg-[#fb6103] text-white",
          "shadow-[0_8px_20px_rgba(251,97,3,0.35),_-2px_-2px_5px_rgba(255,255,255,0.4)_inset]",
          "hover:shadow-[0_10px_24px_rgba(251,97,3,0.45),_-2px_-2px_5px_rgba(255,255,255,0.4)_inset]",
          pressed && "translate-y-px shadow-[inset_-2px_-2px_4px_rgba(180,60,0,0.5),inset_2px_2px_4px_rgba(0,0,0,0.15)]"
        );
      }
      if (variant === "danger") {
        return cn(
          "bg-[#faf9f6] text-red-600",
          active || pressed ? "neu-pressed" : "neu-raised-sm hover:neu-hover"
        );
      }
      if (variant === "ghost") {
        return cn(
          "bg-transparent text-stone-600",
          pressed ? "bg-stone-100/70" : "hover:bg-stone-100/40"
        );
      }
      // secondary (default)
      return cn(
        "bg-[#faf9f6] text-stone-800",
        active ? "neu-inset-sm" : pressed ? "neu-pressed" : "neu-raised-sm hover:neu-hover"
      );
    })();

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses, className)}
        onMouseDown={(e) => { setPressed(true); onMouseDown?.(e); }}
        onMouseUp={(e) => { setPressed(false); onMouseUp?.(e); }}
        onMouseLeave={(e) => { setPressed(false); onMouseLeave?.(e); }}
        onTouchStart={(e) => { setPressed(true); onTouchStart?.(e); }}
        onTouchEnd={(e) => { setPressed(false); onTouchEnd?.(e); }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
