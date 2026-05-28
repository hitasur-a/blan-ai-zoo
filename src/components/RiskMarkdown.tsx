"use client";

import React, { useMemo } from "react";
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

type Severity = "high" | "mid" | "low" | null;

function detectSeverity(text: string): Severity {
  // ** で囲まれてる場合も含めて検出
  if (/重要度[\s\-:：]*\**\[?\s*高\s*\]?\**/.test(text)) return "high";
  if (/重要度[\s\-:：]*\**\[?\s*中\s*\]?\**/.test(text)) return "mid";
  if (/重要度[\s\-:：]*\**\[?\s*低\s*\]?\**/.test(text)) return "low";
  return null;
}

// 重要度シグナル: 左端に色ストライプ + 番号サークル + 小さな letter chip
const SEVERITY_STYLES: Record<Exclude<Severity, null>, {
  stripe: string;       // 左端の縦帯
  numCircle: string;    // 番号サークル背景
  letterChip: string;   // 「高/中/低」ラベル
  border: string;       // カード border
  bgHover: string;      // hover bg
  label: string;
}> = {
  high: {
    stripe: "bg-gradient-to-b from-red-500 to-red-700",
    numCircle: "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-md shadow-red-200",
    letterChip: "bg-red-50 text-red-800 border-red-200",
    border: "border-red-200",
    bgHover: "hover:bg-red-50/40",
    label: "高",
  },
  mid: {
    stripe: "bg-gradient-to-b from-amber-400 to-amber-600",
    numCircle: "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-200",
    letterChip: "bg-amber-50 text-amber-900 border-amber-200",
    border: "border-amber-200",
    bgHover: "hover:bg-amber-50/40",
    label: "中",
  },
  low: {
    stripe: "bg-gradient-to-b from-emerald-400 to-emerald-600",
    numCircle: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-200",
    letterChip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    border: "border-emerald-200",
    bgHover: "hover:bg-emerald-50/40",
    label: "低",
  },
};

// "### リスク N: ..." 形式の H3 (リスク見出し) をパースして、
// タイトルから 重要度表記 + ** 等の Markdown 記号を除去
function stripSeverityLabel(text: string): string {
  return text
    .replace(/[—\-―]\s*重要度[\s\-:：]*\**\[?\s*(?:高|中|低)\s*\]?\**/g, "")
    .replace(/重要度[\s\-:：]*\**\[?\s*(?:高|中|低)\s*\]?\**/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold** → bold
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

// Markdown ストリーム全体を解析して、「リスク N」セクションごとに分割する
// 出力: [ { kind: 'lead'|'h2'|'risk'|'tail', title?, severity?, body? } ]
interface Block {
  kind: "lead" | "h2" | "risk" | "h3-other" | "tail";
  raw: string;
  // h2 の場合のタイトル
  title?: string;
  // risk の場合
  severity?: Severity;
  riskHeader?: string; // "### リスク N: ..."
  riskBody?: string;
}

// AI が指示無視して「最重要リスク(重要度:高)」+ 番号付きで出してくるケースを、
// 既存の「### リスク N: ... [重要度: 高]」形式に変換して renderer の同一路線に乗せる
function normalizeAlternateFormat(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let currentSev: "高" | "中" | "低" | null = null;
  let riskCounter = 0;

  for (const line of lines) {
    // グループ見出し検出: "最重要リスク(重要度:高)" / "## 重要度:高" / "### 重要リスク(重要度:中)" 等
    const groupMatch = line.match(/(?:^#{1,3}\s*)?[^\n]*重要度[\s\-:：]*\**\[?\s*(高|中|低)\s*\]?\**[^\n]*/);
    const isGroupHeader = groupMatch && /リスク|重要度/.test(line) && !/^[-*]\s/.test(line) && !/^###\s+リスク\s*\d/.test(line);
    if (isGroupHeader) {
      currentSev = groupMatch[1] as "高" | "中" | "低";
      // グループ見出しは出力から除去 (アコーディオン側のチップで表現するため)
      continue;
    }
    // 番号付きリスク: "1. [全体] 書類種別と物件種別の不一致" or **囲み版
    const numRiskMatch = line.match(/^\s*\**(\d+)\.\s+(\[[^\]]+\])?\s*(.+?)\**\s*$/);
    if (numRiskMatch && currentSev) {
      riskCounter += 1;
      const bracket = numRiskMatch[2] || "";
      const title = numRiskMatch[3].replace(/\*\*/g, "").trim();
      out.push(`### リスク ${riskCounter}: ${bracket} ${title} [重要度: ${currentSev}]`.replace(/\s+/g, " "));
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

function splitIntoBlocks(markdown: string): Block[] {
  const lines = normalizeAlternateFormat(markdown).split("\n");
  const blocks: Block[] = [];
  let current: { kind: Block["kind"]; lines: string[]; title?: string; severity?: Severity; riskHeader?: string } | null = null;

  const flush = () => {
    if (!current) return;
    const raw = current.lines.join("\n");
    if (current.kind === "risk") {
      // riskHeader を除いた残りが body
      const body = current.lines.slice(1).join("\n").trim();
      blocks.push({ kind: "risk", raw, severity: current.severity, riskHeader: current.riskHeader, riskBody: body });
    } else if (current.kind === "h2") {
      blocks.push({ kind: "h2", raw, title: current.title });
    } else {
      blocks.push({ kind: current.kind, raw });
    }
    current = null;
  };

  for (const line of lines) {
    // ### リスク N: で始まる行 (リスク見出し)
    const riskMatch = line.match(/^###\s+リスク\s*\d+[:：.\s]/);
    if (riskMatch) {
      flush();
      const sev = detectSeverity(line);
      current = { kind: "risk", lines: [line], severity: sev, riskHeader: line };
      continue;
    }
    // ## で始まる H2 (主体関係の整理 / 所見 / 読み取れなかった箇所 等)
    if (line.match(/^##\s+/)) {
      flush();
      current = { kind: "h2", lines: [line], title: line.replace(/^##\s+/, "").trim() };
      continue;
    }
    // ### その他 (H3 だがリスクではない)
    if (line.match(/^###\s+/)) {
      flush();
      current = { kind: "h3-other", lines: [line] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      // 冒頭の立場宣言など
      current = { kind: "lead", lines: [line] };
    }
  }
  flush();
  return blocks;
}

// 1 行サマリを risk body から抽出 (最初の「問題点」or 最初の意味ある行)
function extractOneLineSummary(riskHeader: string, riskBody: string): string {
  const headerClean = stripSeverityLabel(riskHeader.replace(/^###\s+/, "").replace(/^リスク\s*\d+\s*[:：.\s]\s*/, ""));
  const headerOnly = headerClean.replace(/^\[[^\]]+\]\s*/, "").trim();
  if (headerOnly) return headerOnly;
  // body の "問題点:" の次の 60 字
  const m = riskBody.match(/(?:\*\*問題点\*\*|問題点)\s*[:：]\s*([^\n]+)/);
  if (m) return m[1].slice(0, 80);
  return "";
}

// risk header から条文番号を抽出: "[該当: 第1条・第2条] ..." → "第1条・第2条"
function extractClauseRef(riskHeader: string): string {
  const m = riskHeader.match(/\[(?:該当)?[:：]?\s*([^\]]+)\]/);
  return m ? m[1].trim() : "";
}

// risk header からタイトル部分を抽出 (重要度 と 該当条文を除く)
function extractRiskTitle(riskHeader: string): { num: string; title: string } {
  const cleaned = stripSeverityLabel(riskHeader.replace(/^###\s+/, ""));
  const numMatch = cleaned.match(/^リスク\s*(\d+)\s*[:：.\s]/);
  const num = numMatch ? numMatch[1] : "";
  const afterNum = cleaned.replace(/^リスク\s*\d+\s*[:：.\s]\s*/, "");
  // [該当: ...] を除いた残り
  const title = afterNum.replace(/^\[[^\]]+\]\s*/, "").trim();
  return { num, title };
}

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  const blocks = useMemo(() => splitIntoBlocks(children), [children]);

  // リスクブロック数 / 重要度別カウント
  const counts = useMemo(() => {
    let high = 0, mid = 0, low = 0;
    blocks.forEach((b) => {
      if (b.kind === "risk") {
        if (b.severity === "high") high++;
        else if (b.severity === "mid") mid++;
        else if (b.severity === "low") low++;
      }
    });
    return { high, mid, low };
  }, [blocks]);

  return (
    <div className="md space-y-2">
      {/* 上部に重要度別カウント */}
      {(counts.high + counts.mid + counts.low) > 0 && (
        <div className="flex items-center gap-1.5 mb-3 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10 border-b border-rule">
          <span className="text-[11px] text-stone-600 font-bold">抽出済</span>
          {counts.high > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-800 text-[11px] font-bold px-2 py-0.5 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />高 {counts.high}
            </span>
          )}
          {counts.mid > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold px-2 py-0.5 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />中 {counts.mid}
            </span>
          )}
          {counts.low > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />低 {counts.low}
            </span>
          )}
        </div>
      )}

      {blocks.map((block, i) => {
        if (block.kind === "risk") {
          const { num, title } = extractRiskTitle(block.riskHeader ?? "");
          const clause = extractClauseRef(block.riskHeader ?? "");
          const summary = extractOneLineSummary(block.riskHeader ?? "", block.riskBody ?? "");
          const sev = block.severity;
          const style = sev ? SEVERITY_STYLES[sev] : null;
          return (
            <details
              key={i}
              className={`relative rounded-xl bg-white overflow-hidden group shadow-sm border ${style?.border ?? "border-rule"} ${style?.bgHover ?? ""}`}
            >
              {/* 左端の色ストライプ (重要度シグナル) */}
              {style && (
                <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.stripe}`} aria-hidden />
              )}
              <summary className="cursor-pointer select-none pl-5 pr-3 py-2.5 flex items-center gap-2.5 transition-colors list-none">
                {/* 番号サークル (色付きグラデーション) */}
                {num && style && (
                  <span className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full ${style.numCircle} text-[12px] font-black`}>
                    {num}
                  </span>
                )}
                {num && !style && (
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-200 text-stone-700 text-[12px] font-black">
                    {num}
                  </span>
                )}
                {/* タイトル */}
                <div className="min-w-0 flex-1">
                  {clause && (
                    <div className="text-[10px] font-mono text-stone-500 leading-tight">{clause}</div>
                  )}
                  <div className="text-[13px] font-bold text-stone-900 leading-snug">{title || summary}</div>
                </div>
                {/* 重要度ラベル (右側、small) */}
                {style && (
                  <span className={`flex-shrink-0 inline-flex items-center rounded-md ${style.letterChip} text-[10px] font-black px-2 py-0.5 border tracking-wider`}>
                    {style.label}
                  </span>
                )}
                {/* 展開アイコン */}
                <span className="flex-shrink-0 text-stone-400 group-open:rotate-180 transition-transform text-[10px]">▼</span>
              </summary>
              <div className="pl-5 pr-4 pb-3 pt-1 border-t border-rule/50 bg-stone-50/40">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="my-1.5 leading-relaxed text-[12px] text-stone-800">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 space-y-0.5 list-disc list-inside text-[12px] text-stone-800">{children}</ul>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
                  }}
                >
                  {block.riskBody ?? ""}
                </ReactMarkdown>
              </div>
            </details>
          );
        }
        if (block.kind === "h2") {
          // 主体関係の整理 / 所見 / 読み取れなかった箇所 / リスク一覧 ヘッダー など
          // "リスク一覧" は単独で出ても情報量ゼロなのでスキップ
          if (block.title === "リスク一覧" || (block.title?.includes("リスク") && block.title.length < 8)) {
            return null;
          }
          return (
            <div key={i} className="rounded-lg bg-slate-50 border border-rule p-3 mt-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <h2 className="font-bold text-sm text-stone-900 mb-2">{children}</h2>,
                  p: ({ children }) => <p className="my-1 leading-relaxed text-[12px] text-stone-800">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 space-y-0.5 list-disc list-inside text-[12px] text-stone-800">{children}</ul>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
                }}
              >
                {block.raw}
              </ReactMarkdown>
            </div>
          );
        }
        if (block.kind === "h3-other") {
          return (
            <div key={i} className="text-[12px] text-stone-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.raw}</ReactMarkdown>
            </div>
          );
        }
        // lead / tail (立場宣言、末尾の定型文) — Markdown レンダリング (** などは <strong> に変換される)
        const text = block.raw.trim();
        if (!text) return null;
        // 「立場宣言」「本チェックは...」 等の冒頭は強調表示
        const isLead = /^立場宣言|本チェックは/.test(text);
        return (
          <div key={i} className={isLead ? "text-[12px] text-stone-900 leading-relaxed py-2 px-3 rounded-md bg-orange-50/50 border border-orange-100" : "text-[11px] text-stone-600 leading-relaxed"}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="my-0.5 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
              }}
            >
              {block.raw}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

// extractText を namespace の外部使用向けに re-export (誰も使ってないが将来用)
export { extractText };
