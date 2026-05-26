// BLAN ニューモーフィズム 入力フィールド
// 凹んでいる (inset) のがデフォルト → 「ここに入れる」が直感的に分かる
// focus 時にオレンジボーダーで強調

"use client";

import { forwardRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <label className="block">
        {label && (
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">
            {label}
          </span>
        )}
        <input
          ref={ref}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          className={cn(
            "w-full h-12 px-5 rounded-xl text-sm font-medium text-stone-800",
            "bg-[#faf9f6] neu-inset-sm outline-none transition-all duration-150",
            "placeholder:text-stone-400",
            focused && "ring-2 ring-[#fb6103] ring-offset-2 ring-offset-[#faf9f6]",
            error && "ring-2 ring-red-500",
            className
          )}
          {...props}
        />
        {hint && !error && <div className="mt-2 text-xs text-stone-500">{hint}</div>}
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </label>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <label className="block">
        {label && (
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">
            {label}
          </span>
        )}
        <textarea
          ref={ref}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          className={cn(
            "w-full px-5 py-4 rounded-xl text-sm font-medium text-stone-800",
            "bg-[#faf9f6] neu-inset-sm outline-none transition-all duration-150 resize-y",
            "placeholder:text-stone-400",
            focused && "ring-2 ring-[#fb6103] ring-offset-2 ring-offset-[#faf9f6]",
            error && "ring-2 ring-red-500",
            className
          )}
          {...props}
        />
        {hint && !error && <div className="mt-2 text-xs text-stone-500">{hint}</div>}
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </label>
    );
  }
);
Textarea.displayName = "Textarea";
