// 共通 Markdown レンダラー
// 各デモの構造化レポート出力で AI らしい記号生表示を消す
// BLAN トンマナ (オレンジアクセント + Forum セリフ見出し) で整形

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={cn("text-sm leading-relaxed text-stone-800", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-xl text-stone-900 mt-4 mb-2 pb-1 border-b border-stone-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-bold text-lg text-[#fb6103] mt-4 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-bold text-sm text-stone-900 mt-3 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-bold text-xs uppercase tracking-widest text-stone-600 mt-3 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-2 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 list-disc list-inside pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 list-decimal list-inside pl-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => {
            // 【高】【中】【低】の優先度ラベルは色分け chip 化してメリハリを出す
            const text = Array.isArray(children)
              ? children.filter((c) => typeof c === "string").join("")
              : typeof children === "string"
              ? children
              : "";
            if (text.startsWith("【高】")) {
              return <strong className="inline-block rounded bg-red-100 text-red-800 font-bold px-1.5 py-0.5">{children}</strong>;
            }
            if (text.startsWith("【中】")) {
              return <strong className="inline-block rounded bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5">{children}</strong>;
            }
            if (text.startsWith("【低】")) {
              return <strong className="inline-block rounded bg-stone-100 text-stone-700 font-bold px-1.5 py-0.5">{children}</strong>;
            }
            return <strong className="font-bold text-[#fb6103]">{children}</strong>;
          },
          em: ({ children }) => (
            <em className="italic text-stone-700">{children}</em>
          ),
          code: ({ children, className: codeClass }) => {
            const isBlock = codeClass?.includes("language-");
            if (isBlock) {
              return (
                <code className="block bg-stone-100 rounded-lg p-3 my-2 text-xs font-mono overflow-x-auto whitespace-pre">
                  {children}
                </code>
              );
            }
            return (
              <code className="inline bg-stone-100 rounded px-1.5 py-0.5 text-xs font-mono text-stone-800">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-stone-100 rounded-lg p-3 my-2 text-xs font-mono overflow-x-auto whitespace-pre">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-4 border-[#fb6103]/50 pl-3 italic text-stone-600">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-stone-200" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="min-w-full text-xs border-collapse border border-stone-200">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-stone-200 bg-stone-100 px-3 py-2 text-left font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-stone-200 px-3 py-2 align-top">
              {children}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
