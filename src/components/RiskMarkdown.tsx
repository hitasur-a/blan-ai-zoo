"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// リスク見出しの重要度を着色するため、見出しテキストから取り出して span でくるむ
function colorizeHeading(children: React.ReactNode): React.ReactNode {
  if (typeof children !== "string" && !Array.isArray(children)) return children;
  const text = Array.isArray(children) ? children.join("") : children;
  if (typeof text !== "string") return children;

  const high = /重要度[ \-:：]?\[?高\]?|—\s*重要度\s*\[?高\]?/.test(text);
  const mid = /重要度[ \-:：]?\[?中\]?|—\s*重要度\s*\[?中\]?/.test(text);
  const low = /重要度[ \-:：]?\[?低\]?|—\s*重要度\s*\[?低\]?/.test(text);
  const cls = high ? "risk-high" : mid ? "risk-mid" : low ? "risk-low" : "";
  return cls ? <span className={cls}>{text}</span> : text;
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
