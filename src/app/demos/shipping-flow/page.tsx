// ⑤ 出荷業務の AI 一気通貫 - ウシ担当
// AI は構造化 JSON で正規化結果を返す → アプリ側で公式 CSV 組立 + PDF 送付状

"use client";

import { useMemo, useRef, useState } from "react";
import { DEMOS } from "@/data/demos";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";
import { Card } from "@/components/ui/Card";

type Carrier = "yamato" | "sagawa" | "yubin";
type Tone = "formal" | "casual";

interface NormalizedRow {
  id: string;
  name: string;
  name_kana?: string;
  honorific?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  building?: string;
  phone?: string;
  quantity?: number;
  source_indices?: number[];
  row_flags?: string[];
}

interface MergeDecision {
  merged_into: string;
  merged_from: number[];
  merged_from_text?: string[];
  reason: string;
  confidence?: "high" | "medium" | "low";
}

interface CompletionEntry {
  target_id: string;
  field: string;
  before?: string;
  after?: string;
  reason?: string;
}

interface LetterEntry {
  row_id: string;
  customer: string;
  body: string;
}

interface AiResult {
  input_rows?: number;
  normalized_rows?: NormalizedRow[];
  merge_decisions?: MergeDecision[];
  completions?: CompletionEntry[];
  letters?: LetterEntry[];
  global_flags?: string[];
}

const SAMPLE_DATA = `田中 太郎,福岡県久留米市東町12-3 メゾン久留米301号,090-1234-5678,3
タナカ太郎,久留米市東町12の3 メゾン久留米301,09012345678,
山田花子様,〒830-0033 福岡県久留米市天神町5-15,0942-12-3456,2
山田 花子,久留米市天神町5-15,,1
佐藤健一郎,熊本県熊本市中央区水前寺3-8-12,096-123-4567,5`;

// 公式 CSV 仕様 (各業者のドキュメントから引用)
const CARRIER_FORMATS: Record<Carrier, { name: string; columns: string[]; spec: string; mapper: (r: NormalizedRow, idx: number) => string[] }> = {
  yamato: {
    name: "ヤマト運輸 B2 クラウド",
    spec: "発送伝票 (21 列)",
    columns: [
      "お客様管理番号", "送り状種別", "クール区分", "伝票番号", "出荷予定日", "お届け予定日",
      "配達時間帯", "お届け先電話番号", "お届け先郵便番号", "お届け先住所", "お届け先住所アパート名",
      "お届け先名", "お届け先名カナ", "敬称", "ご依頼主電話番号", "ご依頼主郵便番号",
      "ご依頼主住所", "ご依頼主名", "品名コード1", "品名1", "個数",
    ],
    mapper: (r, idx) => [
      String(idx + 1).padStart(4, "0"), // お客様管理番号
      "0",                                // 送り状種別 (0=発払い)
      "0",                                // クール区分 (0=通常)
      "",                                 // 伝票番号 (未割当)
      "",                                 // 出荷予定日
      "",                                 // お届け予定日
      "",                                 // 配達時間帯
      r.phone || "",                       // お届け先電話番号
      r.postal_code || "",                 // お届け先郵便番号
      `${r.prefecture || ""}${r.city || ""}`.trim(), // お届け先住所
      r.building || "",                    // お届け先住所アパート名
      r.name || "",                        // お届け先名
      r.name_kana || "",                   // お届け先名カナ
      r.honorific || "様",                 // 敬称
      "",                                 // ご依頼主電話番号
      "",                                 // ご依頼主郵便番号
      "",                                 // ご依頼主住所
      "",                                 // ご依頼主名
      "",                                 // 品名コード1
      "",                                 // 品名1
      String(r.quantity ?? 1),             // 個数
    ],
  },
  sagawa: {
    name: "佐川急便 e-飛伝 III",
    spec: "配送データ (11 列)",
    columns: [
      "お客様コード", "出荷予定日", "お届け先郵便番号", "お届け先住所1", "お届け先住所2",
      "お届け先名称1", "お届け先電話番号", "品名1", "個数", "元払着払区分", "代引区分",
    ],
    mapper: (r, idx) => [
      String(idx + 1).padStart(6, "0"),    // お客様コード
      "",                                   // 出荷予定日
      r.postal_code || "",                  // お届け先郵便番号
      `${r.prefecture || ""}${r.city || ""}`.trim(), // お届け先住所1
      r.building || "",                    // お届け先住所2
      r.name || "",                        // お届け先名称1
      r.phone || "",                        // お届け先電話番号
      "",                                  // 品名1
      String(r.quantity ?? 1),              // 個数
      "1",                                 // 元払着払区分 (1=元払い)
      "0",                                 // 代引区分 (0=非代引)
    ],
  },
  yubin: {
    name: "日本郵便ゆうパック",
    spec: "差出データ (12 列)",
    columns: [
      "お問合せ番号", "お客様番号", "差出人氏名", "差出人郵便番号", "差出人住所", "差出人電話番号",
      "お届け先氏名", "お届け先郵便番号", "お届け先住所", "お届け先電話番号", "内容品", "個数",
    ],
    mapper: (r, idx) => [
      "",                                   // お問合せ番号 (未割当)
      String(idx + 1).padStart(6, "0"),    // お客様番号
      "",                                  // 差出人氏名
      "",                                  // 差出人郵便番号
      "",                                  // 差出人住所
      "",                                  // 差出人電話番号
      r.name || "",                        // お届け先氏名
      r.postal_code || "",                  // お届け先郵便番号
      `${r.prefecture || ""}${r.city || ""}${r.building ? " " + r.building : ""}`.trim(),
      r.phone || "",                        // お届け先電話番号
      "",                                  // 内容品
      String(r.quantity ?? 1),              // 個数
    ],
  },
};

// JSON フェンスを抽出
function extractJsonFromText(text: string): AiResult | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    // 途中ストリームのため失敗することがある
    return null;
  }
}

// CSV エスケープ (RFC 4180 風)
function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildCsv(carrier: Carrier, rows: NormalizedRow[]): string {
  const spec = CARRIER_FORMATS[carrier];
  const header = spec.columns.map(csvEscape).join(",");
  const dataLines = rows.map((r, idx) => spec.mapper(r, idx).map(csvEscape).join(","));
  return [header, ...dataLines].join("\r\n");
}

export default function ShippingFlowPage() {
  const demo = DEMOS["shipping-flow"];
  const [customerList, setCustomerList] = useState("");
  const [carrier, setCarrier] = useState<Carrier>("yamato");
  const [tone, setTone] = useState<Tone>("formal");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [rawText, setRawText] = useState(""); // ストリーミング累積
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; bytes: number; rows: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState<number | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("ファイルは 5MB 以内");
      return;
    }
    const lower = file.name.toLowerCase();
    const isCsvLike = lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv");
    const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    if (!isCsvLike && !isExcel) {
      setErrorMessage("対応形式: .xlsx / .xls / .csv / .tsv / .txt");
      return;
    }
    try {
      let text = "";
      if (isExcel) {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      } else {
        text = await file.text();
      }
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      const rows = text.split("\n").filter((l) => l.trim().length > 0).length;
      setCustomerList(text);
      setFileInfo({ name: file.name, bytes: file.size, rows });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "ファイル読み込み失敗");
    }
  };

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

  const handleProcess = async () => {
    if (!customerList.trim() || isGenerating) return;
    setIsGenerating(true);
    setAiResult(null);
    setRawText("");
    setErrorMessage(null);

    const carrierSpec = CARRIER_FORMATS[carrier];
    const carrierLabel = carrierSpec.name;
    const toneLabel = tone === "formal" ? "フォーマル (法人取引向け)" : "カジュアル (個人客向け)";

    const userMessage = `# 顧客名簿 (バラバラ・正規化前)
\`\`\`
${customerList}
\`\`\`

# 配送業者
carrier = ${carrier} (${carrierLabel} / ${carrierSpec.spec})

# 送付状トーン
${toneLabel}

# 指示
上記名簿を JSON で正規化・名寄せして返してください。送付状本文は上記トーンで 120-180 字。CSV 組立はアプリ側がやるので不要。JSON のみ返してください。`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoKey: "shipping-flow", messages: [{ role: "user", content: userMessage }] }),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice("data: ".length).trim();
          if (!payload) continue;
          try {
            const json = JSON.parse(payload);
            if (json.text) {
              accumulated += json.text;
              setRawText(accumulated);
              const parsed = extractJsonFromText(accumulated);
              if (parsed) setAiResult(parsed);
            } else if (json.error) throw new Error(json.error);
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("API error")) throw e;
          }
        }
      }
      // 最終 parse
      const finalParsed = extractJsonFromText(accumulated);
      if (finalParsed) setAiResult(finalParsed);
      else throw new Error("AI 出力を JSON として解釈できませんでした");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // CSV ダウンロード (UTF-8 BOM + CRLF + 公式列順)
  const handleDownloadCsv = () => {
    if (!aiResult?.normalized_rows?.length) return;
    const csv = buildCsv(carrier, aiResult.normalized_rows);
    const carrierKey = { yamato: "yamato_b2", sagawa: "sagawa_ehiden3", yubin: "yupack" }[carrier];
    const date = new Date().toISOString().slice(0, 10);
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${carrierKey}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 送付状 PDF エクスポート (全顧客連結、A4 縦、日本語対応で html2canvas → jsPDF)
  const handleExportLettersPdf = async () => {
    if (!aiResult?.letters?.length || pdfBusy) return;
    setPdfBusy(true);
    try {
      const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = html2canvasMod.default;
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const PAGE_W = 210;
      const PAGE_H = 297;
      const MARGIN = 15;
      const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

      for (let i = 0; i < aiResult.letters.length; i++) {
        const l = aiResult.letters[i];
        const row = aiResult.normalized_rows?.find((r) => r.id === l.row_id);
        // 1 顧客 = 1 ページ
        const container = document.createElement("div");
        container.style.width = `${PAGE_W - MARGIN * 2}mm`;
        container.style.padding = "0";
        container.style.fontFamily = '"Noto Sans JP", "Yu Gothic", sans-serif';
        container.style.fontSize = "12pt";
        container.style.lineHeight = "1.8";
        container.style.color = "#0f172a";
        container.style.background = "#ffffff";
        container.innerHTML = `
          <div style="text-align:right; font-size:11pt; color:#475569; margin-bottom:24mm;">${today}</div>
          <div style="font-size:14pt; font-weight:700; margin-bottom:4mm;">
            ${row?.postal_code ? `〒${row.postal_code}<br/>` : ""}
            ${row?.prefecture ?? ""}${row?.city ?? ""}${row?.building ? " " + row.building : ""}
          </div>
          <div style="font-size:18pt; font-weight:700; margin-bottom:18mm;">
            ${l.customer} <span style="font-size:14pt; font-weight:500;">${row?.honorific || "様"}</span>
          </div>
          <div style="margin-bottom:32mm; white-space:pre-wrap;">${(l.body || "").replace(/</g, "&lt;")}</div>
          <div style="text-align:right; font-size:11pt; color:#475569; line-height:1.6;">
            BLAN 株式会社<br/>
            福岡県久留米市 ○○ ${row?.quantity ? `(同梱数: ${row.quantity})` : ""}
          </div>
        `;
        // 一時的に body に追加して capture
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "0";
        document.body.appendChild(container);
        const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
        document.body.removeChild(container);
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const imgH = (canvas.height * (PAGE_W - MARGIN * 2)) / canvas.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", MARGIN, MARGIN, PAGE_W - MARGIN * 2, Math.min(imgH, PAGE_H - MARGIN * 2));
      }
      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`shipping_letters_${date}.pdf`);
    } catch (err) {
      setErrorMessage(`PDF 生成失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPdfBusy(false);
    }
  };

  const copyLetter = async (idx: number, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedLetter(idx);
      setTimeout(() => setCopiedLetter(null), 1500);
    } catch {
      // ignore
    }
  };

  // 統計 (STAT バー)
  const stats = useMemo(() => {
    const input = aiResult?.input_rows ?? 0;
    const out = aiResult?.normalized_rows?.length ?? 0;
    const merges = aiResult?.merge_decisions?.length ?? 0;
    const completions = aiResult?.completions?.length ?? 0;
    const globalFlags = aiResult?.global_flags?.length ?? 0;
    const rowFlags = aiResult?.normalized_rows?.reduce((acc, r) => acc + (r.row_flags?.length ?? 0), 0) ?? 0;
    return { input, out, merges, completions, flags: globalFlags + rowFlags };
  }, [aiResult]);

  const csvPreview = useMemo(() => {
    if (!aiResult?.normalized_rows?.length) return null;
    const spec = CARRIER_FORMATS[carrier];
    return {
      header: spec.columns,
      rows: aiResult.normalized_rows.map((r, idx) => spec.mapper(r, idx)),
    };
  }, [aiResult, carrier]);

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-3">
          <DemoHeader demoKey="shipping-flow" metrics={[
            { value: "月10h", label: "削減実績" },
            { value: "3業者", label: "公式 CSV 厳守" },
            { value: "送付状", label: "AI + PDF 一括" },
          ]} />
        </div>

        <section className="flex-1 min-h-0" style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}>
          <div className="flex items-stretch justify-center overflow-hidden">
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-stone-50 via-white to-stone-100" style={{ aspectRatio: "500 / 370", maxHeight: "100%", maxWidth: "min(100%, calc((100vh - 200px) * 500 / 370))", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {/* 左: 入力 */}
              <div className="flex h-full flex-col bg-white/60 backdrop-blur-sm min-h-0 border-r border-stone-200/40">
                <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base">顧客名簿 (バラバラ OK)</h3>
                    <Badge tone="info" size="sm">.xlsx/.csv/テキスト</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">配送業者</span>
                      <select value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)} disabled={isGenerating} className="w-full h-10 rounded-xl bg-[#faf9f6] neu-inset-sm px-3 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50">
                        <option value="yamato">ヤマト B2 クラウド</option>
                        <option value="sagawa">佐川 e-飛伝 III</option>
                        <option value="yubin">日本郵便ゆうパック</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">送付状トーン</span>
                      <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} disabled={isGenerating} className="w-full h-10 rounded-xl bg-[#faf9f6] neu-inset-sm px-3 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50">
                        <option value="formal">フォーマル</option>
                        <option value="casual">カジュアル</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div
                  className="flex-1 min-h-0 px-5 py-3 overflow-y-auto space-y-2"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                >
                  <div className={`rounded-lg border-2 border-dashed transition-colors p-2 text-[11px] ${isDragging ? "border-[#fb6103] bg-orange-50" : "border-stone-200 bg-white/60"}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-stone-700 font-medium">📊 .xlsx / .csv / .tsv をドロップ or</span>
                      <button onClick={() => fileInputRef.current?.click()} disabled={isGenerating} className="text-[#fb6103] font-bold hover:underline">クリック選択</button>
                    </div>
                    {fileInfo && (
                      <div className="mt-1 text-[10px] text-stone-700 flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">読込済</span>
                        <span className="truncate">{fileInfo.name}</span>
                        <span className="text-stone-500">{fileInfo.rows} 行</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={onPick} />
                  <Textarea value={customerList} onChange={(e) => setCustomerList(e.target.value)} rows={9} placeholder="名前, 住所, 電話番号, 個数 (順不同 OK)" disabled={isGenerating} className="font-mono text-xs min-h-[140px]" />
                  <div className="rounded-lg bg-stone-50 border border-stone-200 px-2.5 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-stone-700 mb-1">
                      📋 {CARRIER_FORMATS[carrier].name} 公式カラム ({CARRIER_FORMATS[carrier].columns.length} 列)
                    </div>
                    <div className="text-[9px] leading-relaxed text-stone-700 font-mono break-all">
                      {CARRIER_FORMATS[carrier].columns.join(",")}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 px-5 pb-4 pt-2 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setCustomerList(SAMPLE_DATA); setFileInfo(null); }} disabled={isGenerating}>サンプル</Button>
                  <Button variant="primary" size="md" onClick={handleProcess} disabled={!customerList.trim() || isGenerating} className="flex-1">
                    {isGenerating ? "AI 正規化中..." : "名寄せ → 公式CSV → 送付状"}
                  </Button>
                </div>
              </div>

              {/* 右: 結果プレビュー */}
              <div className="flex h-full flex-col bg-white/40 backdrop-blur-sm min-h-0">
                <div className="flex-shrink-0 px-5 py-3 border-b border-stone-200/40 flex items-center justify-between flex-wrap gap-1">
                  <h3 className="font-display text-base">処理結果</h3>
                  <div className="flex gap-1.5">
                    <Badge tone="orange" size="sm">{CARRIER_FORMATS[carrier].name.split(" ")[0]}</Badge>
                    {aiResult && <Badge tone="success" size="sm">完了</Badge>}
                  </div>
                </div>
                {isGenerating && !aiResult && (
                  <div className="flex-shrink-0 px-5 py-2 bg-orange-50/80">
                    <div className="flex items-center gap-2 text-xs text-orange-700">
                      <div className="h-1.5 flex-1 bg-orange-200 rounded-full overflow-hidden"><div className="h-full bg-[#fb6103] animate-pulse" style={{ width: "60%" }} /></div>
                      <span className="font-bold">AI が JSON を構築中...</span>
                    </div>
                  </div>
                )}
                {/* STAT バー */}
                {aiResult && (
                  <div className="flex-shrink-0 grid grid-cols-5 gap-1.5 px-3 py-2 bg-white/70 border-b border-stone-200/40">
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">元行数</div>
                      <div className="text-base font-black text-stone-800">{stats.input || customerList.split("\n").filter(l => l.trim()).length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">統合後</div>
                      <div className="text-base font-black text-[#fb6103]">{stats.out}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">名寄せ</div>
                      <div className="text-base font-black text-emerald-700">{stats.merges}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">補完</div>
                      <div className="text-base font-black text-blue-700">{stats.completions}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">要確認</div>
                      <div className={`text-base font-black ${stats.flags > 0 ? "text-amber-700" : "text-stone-400"}`}>{stats.flags}</div>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0 px-3 py-3 overflow-y-auto space-y-2">
                  {errorMessage && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">{errorMessage}</div>
                  )}
                  {!aiResult && !isGenerating && (
                    <div className="rounded-xl neu-inset-sm p-6 text-center text-xs text-stone-400">名簿を入力して 「名寄せ → 公式CSV → 送付状」 を押してください</div>
                  )}

                  {/* CSV プレビュー (表形式) */}
                  {csvPreview && (
                    <div className="rounded-lg border border-orange-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-orange-50">
                        <div className="text-[10px] font-bold text-orange-900">公式 CSV プレビュー ({csvPreview.rows.length} 行 × {csvPreview.header.length} 列)</div>
                        <Button variant="primary" size="sm" onClick={handleDownloadCsv}>.csv DL</Button>
                      </div>
                      <div className="overflow-x-auto max-h-44">
                        <table className="text-[9px] w-full">
                          <thead className="bg-stone-100 sticky top-0">
                            <tr>
                              {csvPreview.header.map((h, i) => (
                                <th key={i} className="px-1.5 py-1 text-left font-bold text-stone-700 whitespace-nowrap border-r border-stone-200">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.rows.map((row, ri) => (
                              <tr key={ri} className="border-t border-stone-100">
                                {row.map((cell, ci) => (
                                  <td key={ci} className={`px-1.5 py-1 whitespace-nowrap border-r border-stone-100 ${cell ? "text-stone-800" : "bg-amber-50 text-amber-700"}`} title={!cell ? "空欄 (要確認)" : cell}>
                                    {cell || "—"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 名寄せ判定カード */}
                  {aiResult?.merge_decisions && aiResult.merge_decisions.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-white">
                      <div className="px-2.5 py-1.5 bg-emerald-50 text-[10px] font-bold text-emerald-900">
                        🔗 名寄せ判定 ({aiResult.merge_decisions.length} 件)
                      </div>
                      <div className="divide-y divide-stone-100 max-h-40 overflow-y-auto">
                        {aiResult.merge_decisions.map((m, i) => (
                          <div key={i} className="px-2.5 py-1.5 text-[10px]">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`rounded px-1 py-0.5 text-[9px] font-bold ${m.confidence === "high" ? "bg-emerald-100 text-emerald-800" : m.confidence === "medium" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700"}`}>
                                {m.confidence || "?"}
                              </span>
                              <span className="font-bold text-stone-800">行 {(m.merged_from || []).join(", ")} → {m.merged_into}</span>
                            </div>
                            <div className="text-stone-700 leading-relaxed">{m.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 補完一覧 */}
                  {aiResult?.completions && aiResult.completions.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-white">
                      <div className="px-2.5 py-1.5 bg-blue-50 text-[10px] font-bold text-blue-900">
                        ✨ 補完 ({aiResult.completions.length} 件)
                      </div>
                      <div className="divide-y divide-stone-100 max-h-32 overflow-y-auto">
                        {aiResult.completions.map((c, i) => (
                          <div key={i} className="px-2.5 py-1 text-[10px] flex items-center gap-2">
                            <span className="font-bold text-stone-700">{c.target_id}</span>
                            <span className="text-stone-500">{c.field}:</span>
                            <span className="text-stone-400 line-through">{c.before || "—"}</span>
                            <span className="text-blue-700">→ {c.after}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 送付状 (顧客別) */}
                  {aiResult?.letters && aiResult.letters.length > 0 && (
                    <div className="rounded-lg border border-stone-200 bg-white">
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-stone-50">
                        <div className="text-[10px] font-bold text-stone-800">📨 送付状 ({aiResult.letters.length} 件)</div>
                        <Button variant="primary" size="sm" onClick={handleExportLettersPdf} disabled={pdfBusy}>
                          {pdfBusy ? "PDF 生成中..." : "PDF DL"}
                        </Button>
                      </div>
                      <div className="divide-y divide-stone-100 max-h-44 overflow-y-auto">
                        {aiResult.letters.map((l, i) => (
                          <div key={i} className="px-2.5 py-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="text-[11px] font-bold text-stone-900">{l.customer}</div>
                              <button onClick={() => copyLetter(i, l.body)} className="text-[10px] font-bold text-[#fb6103] hover:underline">
                                {copiedLetter === i ? "✓ コピー済" : "コピー"}
                              </button>
                            </div>
                            <div className="text-[10px] leading-relaxed text-stone-700 whitespace-pre-wrap">{l.body}</div>
                            <div className="mt-0.5 text-[9px] text-stone-400">{l.body.length} 字</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* グローバル要確認 */}
                  {aiResult?.global_flags && aiResult.global_flags.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-2.5 py-1.5">
                      <div className="text-[10px] font-bold text-amber-900 mb-1">⚠ 要確認</div>
                      <ul className="space-y-0.5 text-[10px] text-amber-900">
                        {aiResult.global_flags.map((f, i) => <li key={i}>・ {f}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* AI 全文 (debug 折り畳み) */}
                  {aiResult && rawText && (
                    <details className="rounded-lg bg-stone-50 px-2.5 py-1.5 text-[10px]">
                      <summary className="cursor-pointer font-bold text-stone-600">AI 出力 (JSON, debug)</summary>
                      <pre className="mt-1 overflow-auto max-h-32 text-[9px] font-mono text-stone-600 whitespace-pre">{rawText.slice(0, 4000)}</pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 右サイドバー */}
          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">処理ステップ 5 段</h3>
              <ul className="space-y-2">
                {[
                  { title: "名寄せ", desc: "同一人物の重複統合 (敬称/フリガナ違いを吸収)" },
                  { title: "住所正規化", desc: "都道府県補完・丁目番地表記統一" },
                  { title: "電話番号統一", desc: "ハイフン整形・桁数検証" },
                  { title: "公式 CSV 組立", desc: "アプリ側で列順厳守、UTF-8 BOM + CRLF" },
                  { title: "送付状 + PDF", desc: "顧客別 A4 で一括 PDF 出力" },
                ].map((s, i) => (
                  <li key={i} className="border-l-2 border-stone-300 pl-3">
                    <div className="font-bold text-xs text-stone-900">{i + 1}. {s.title}</div>
                    <div className="text-[11px] leading-relaxed text-stone-700">{s.desc}</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">公式 CSV 仕様 (3 業者)</h3>
              <ul className="space-y-1.5">
                {Object.entries(CARRIER_FORMATS).map(([key, c]) => (
                  <li key={key} className={"text-[11px] leading-relaxed " + (key === carrier ? "border-l-2 border-[#fb6103] pl-2" : "pl-2 opacity-70")}>
                    <div className="font-bold text-stone-900">{c.name}</div>
                    <div className="text-stone-700">{c.spec} · {c.columns.length} 列</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <div className="text-[11px] font-bold uppercase tracking-widest text-stone-700 mb-1">このデモの仕組み</div>
              <p className="text-[11px] leading-relaxed text-stone-800">{demo.description}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-700">
                AI = 名寄せ + 住所/電話正規化 + 送付状本文のみ。CSV の公式列順マッピングはアプリ側コードで厳密に。
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
