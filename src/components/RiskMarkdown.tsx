"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// React の子ノードから素直にテキストを取り出す (要素入れ子を再帰的に展開)
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return "";
}

// 重要度を本文から検出してクラスを返す。children は元のまま返す (テキスト潰さない)
function colorizeHeading(children: React.ReactNode): React.ReactNode {
  const text = extractText(children);
  const high = /重要度[\s\-:：]*\[?\s*高\s*\]?/.test(text);
  const mid = /重要度[\s\-:：]*\[?\s*中\s*\]?/.test(text);
  const low = /重要度[\s\-:：]*\[?\s*低\s*\]?/.test(text);
  const cls = high ? "risk-high" : mid ? "risk-mid" : low ? "risk-low" : "";
  return cls ? <span className={cls}>{children}</span> : children;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{colorizeHeading(children)}</h3>,
          h4: ({ children }) => <h4 className="font-bold text-[15px] mt-3 mb-1">{colorizeHeading(children)}</h4>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] underline-offset-2 hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
