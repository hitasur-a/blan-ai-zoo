"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Loader2,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Markdown } from "./RiskMarkdown";

export type Mode = "contract" | "explanation";
export type Perspective = "buyer" | "seller" | "neutral";
export type PropertyType = "residential-buy" | "residential-rent" | "commercial";

const PERSPECTIVE_LABEL: Record<Mode, Record<Perspective, string>> = {
  contract: { buyer: "買い手・受託者", seller: "売り手・委託者", neutral: "中立" },
  explanation: { buyer: "買主・借主", seller: "売主・貸主", neutral: "中立" },
};

const PERSPECTIVE_DESC: Record<Mode, Record<Perspective, string>> = {
  contract: {
    buyer: "受託者・買主・借主など、義務を負う側の目線で不利条項を抽出",
    seller: "委託者・売主・貸主など、権利を持つ側の目線で抜け穴を抽出",
    neutral: "双方の立場でバランスよく問題条項を抽出",
  },
  explanation: {
    buyer: "買主・借主が見落としやすい説明不足・トラブル化箇所を抽出",
    seller: "売主・貸主が後日トラブル・損害賠償・解除につながる箇所を抽出",
    neutral: "双方の立場でバランスよく問題箇所を抽出",
  },
};

const PROPERTY_LABEL: Record<PropertyType, string> = {
  "residential-buy": "住居用 (売買)",
  "residential-rent": "住居用 (賃貸)",
  commercial: "事業用",
};

interface Props {
  mode: Mode;
  sampleText: string;
}

export function RiskCheckApp({ mode, sampleText }: Props) {
  const [text, setText] = useState("");
  const [perspective, setPerspective] = useState<Perspective>(mode === "explanation" ? "seller" : "buyer");
  const [propertyType, setPropertyType] = useState<PropertyType>("residential-rent");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<{ name: string; pages: number; bytes: number } | null>(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const riskCount = useMemo(() => {
    const h = (output.match(/重要度[ \-:：]?\[?高\]?|—\s*重要度\s*\[?高\]?/g) ?? []).length;
    const m = (output.match(/重要度[ \-:：]?\[?中\]?|—\s*重要度\s*\[?中\]?/g) ?? []).length;
    const l = (output.match(/重要度[ \-:：]?\[?低\]?|—\s*重要度\s*\[?低\]?/g) ?? []).length;
    return { high: h, mid: m, low: l, total: h + m + l };
  }, [output]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".pdf")) {
      setIsParsingPdf(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "PDF 解析失敗");
        setText(json.text ?? "");
        setPdfInfo({ name: json.filename, pages: json.pages, bytes: json.bytes });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsParsingPdf(false);
      }
      return;
    }
    if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || file.type === "text/plain") {
      if (file.size > 2 * 1024 * 1024) {
        setError("テキストファイルは 2MB 以内にしてください");
        return;
      }
      const t = await file.text();
      setText(t);
      setPdfInfo({ name: file.name, pages: 0, bytes: file.size });
      return;
    }
    setError("対応形式: .pdf / .txt / .md");
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const run = async () => {
    if (!text.trim() || isStreaming) return;
    setIsStreaming(true);
    setOutput("");
    setError(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          perspective,
          propertyType: mode === "explanation" ? propertyType : undefined,
          documentText: text,
        }),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const line of events) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice("data: ".length).trim();
          if (!payload) continue;
          try {
            const json = JSON.parse(payload);
            if (json.text) {
              acc += json.text;
              setOutput(acc);
            } else if (json.error) {
              throw new Error(json.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("API error")) throw e;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
    }
  };

  // Markdown 記号を消してプレーンテキストにする (エクスポート/コピー時のみ)
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/^#{1,6}\s+/gm, "")            // # 見出し
      .replace(/\*\*([^*]+)\*\*/g, "$1")       // **bold**
      .replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, "$1") // *italic*
      .replace(/`([^`]+)`/g, "$1")             // `code`
      .replace(/^>\s+/gm, "")                 // > 引用
      .replace(/^-{3,}\s*$/gm, "")            // --- 区切り
      .replace(/^\s*[-+*]\s+/gm, "・ ")         // - リスト → ・
      .replace(/\n{3,}/g, "\n\n")              // 連続改行整理
      .trim();
  };

  const exportTxt = () => {
    if (!output) return;
    const date = new Date().toISOString().slice(0, 10);
    const header = `${mode === "explanation" ? "重要事項説明書" : "契約書"} リスクチェック結果\n\n立場: ${PERSPECTIVE_LABEL[mode][perspective]}\n${mode === "explanation" ? `物件種別: ${PROPERTY_LABEL[propertyType]}\n` : ""}元ファイル: ${pdfInfo?.name ?? "テキスト直接入力"}\n生成日: ${date}\n\n--------------------\n\n`;
    const blob = new Blob([header + stripMarkdown(output)], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk_${mode}_${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(stripMarkdown(output));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-4 lg:gap-6">
      {/* 左: 入力 */}
      <section className="bg-white rounded-2xl border border-rule shadow-sm flex flex-col min-h-[600px]">
        <div className="px-5 py-4 border-b border-rule flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-base flex items-center gap-2">
            <FileText size={18} className="text-[color:var(--accent)]" />
            {mode === "explanation" ? "重要事項説明書" : "契約書"} を入力
          </h2>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <ShieldCheck size={13} className="text-[color:var(--low)]" />
            送信内容はサーバーに保存しません
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* 立場 */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-1.5">立場 (厳守)</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(PERSPECTIVE_LABEL[mode]) as Perspective[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPerspective(p)}
                  disabled={isStreaming}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${perspective === p ? "bg-[color:var(--accent)] text-white border-[color:var(--accent)]" : "bg-white text-ink border-rule hover:border-[color:var(--accent)]"}`}
                >
                  {PERSPECTIVE_LABEL[mode][p]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">{PERSPECTIVE_DESC[mode][perspective]}</p>
          </div>

          {/* 物件種別 (explanation のみ) */}
          {mode === "explanation" && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-1.5">物件種別</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(PROPERTY_LABEL) as PropertyType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPropertyType(p)}
                    disabled={isStreaming}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${propertyType === p ? "bg-slate-900 text-white border-slate-900" : "bg-white text-ink border-rule hover:border-slate-400"}`}
                  >
                    {PROPERTY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dropzone + Textarea */}
        <div
          className="flex-1 min-h-0 px-5 pb-3 flex flex-col"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <div className={`rounded-xl border-2 border-dashed transition-colors p-3 mb-2 ${isDragging ? "border-[color:var(--accent)] bg-orange-50" : "border-rule bg-white"}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <Upload size={14} />
                <span>PDF / .txt ファイルをドロップ、または</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[color:var(--accent)] font-bold hover:underline"
                  disabled={isStreaming || isParsingPdf}
                >
                  クリックして選択
                </button>
              </div>
              {pdfInfo && (
                <div className="text-[11px] text-ink-soft inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-[color:var(--low)]" />
                  <span className="font-bold">{pdfInfo.name}</span>
                  {pdfInfo.pages > 0 && <span>({pdfInfo.pages}p)</span>}
                  <span className="text-slate-400">{(pdfInfo.bytes / 1024).toFixed(1)}KB</span>
                </div>
              )}
              {isParsingPdf && (
                <div className="text-[11px] text-amber-700 inline-flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  PDF 解析中...
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="hidden" onChange={onPick} />
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "explanation" ? "重要事項説明書のテキストをここに貼り付け、または PDF をドラッグ&ドロップ" : "契約書のテキストをここに貼り付け、または PDF をドラッグ&ドロップ"}
            disabled={isStreaming}
            className="flex-1 min-h-[260px] w-full rounded-xl border border-rule bg-white p-3 text-[13px] font-mono leading-relaxed text-ink resize-none focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-soft">
            <span>{text.length.toLocaleString()} 字</span>
            <button
              onClick={() => { setText(sampleText); setPdfInfo(null); }}
              disabled={isStreaming}
              className="hover:text-[color:var(--accent)] font-bold"
            >
              サンプル投入
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-rule bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={run}
            disabled={!text.trim() || isStreaming}
            className="w-full h-12 rounded-xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-deep)] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:shadow-lg active:translate-y-px"
          >
            {isStreaming ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                AI が分析中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                リスクチェックを実行
              </>
            )}
          </button>
        </div>
      </section>

      {/* 右: 結果 */}
      <section className="bg-white rounded-2xl border border-rule shadow-sm flex flex-col min-h-[600px]">
        <div className="px-5 py-4 border-b border-rule flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-base flex items-center gap-2">
            <AlertTriangle size={18} className="text-[color:var(--accent)]" />
            リスク一覧 <span className="text-ink-soft font-normal text-xs">(資格者最終確認用の下書き)</span>
          </h2>
          {riskCount.total > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-[color:var(--high)] font-bold border border-red-100">高 {riskCount.high}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-[color:var(--mid)] font-bold border border-amber-100">中 {riskCount.mid}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[color:var(--low)] font-bold border border-emerald-100">低 {riskCount.low}</span>
            </div>
          )}
        </div>

        {isStreaming && (
          <div className="px-5 py-2 bg-orange-50/80 border-b border-orange-100">
            <div className="flex items-center gap-2 text-xs text-orange-700">
              <Loader2 size={12} className="animate-spin" />
              <span className="font-bold">条項を分析中...</span>
              <div className="h-1 flex-1 bg-orange-200 rounded-full overflow-hidden">
                <div className="h-full bg-[color:var(--accent)] animate-pulse" style={{ width: `${Math.min(riskCount.total * 10 + 20, 90)}%` }} />
              </div>
            </div>
          </div>
        )}

        {output && !isStreaming && (
          <div className="px-5 py-2 border-b border-rule flex items-center justify-end gap-2 bg-slate-50/50">
            <button onClick={copyAll} className="text-[11px] font-bold text-ink rounded-full bg-white px-3 py-1 border border-rule hover:border-slate-400 inline-flex items-center gap-1">
              <Copy size={11} />
              {copied ? "コピー済" : "全文コピー"}
            </button>
            <button onClick={exportTxt} className="text-[11px] font-bold text-[color:var(--accent)] rounded-full bg-orange-50 px-3 py-1 border border-orange-200 hover:bg-orange-100 inline-flex items-center gap-1">
              <Download size={11} />
              .txt で保存
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 px-5 py-4 overflow-y-auto">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {output ? (
            <Markdown>{output}</Markdown>
          ) : (
            <div className="rounded-xl border border-dashed border-rule p-8 text-center text-xs text-ink-soft">
              書類を入力して「リスクチェックを実行」を押してください
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
