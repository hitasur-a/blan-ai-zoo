// ⑤ 出荷業務の AI 一気通貫 - ウシ担当

"use client";

import { useMemo, useRef, useState } from "react";
import { DEMOS } from "@/data/demos";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Carrier = "yamato" | "sagawa" | "yubin";
type Tone = "formal" | "casual";

const SAMPLE_DATA = `田中 太郎,福岡県久留米市東町12-3 メゾン久留米301号,090-1234-5678,3
タナカ太郎,久留米市東町12の3 メゾン久留米301,09012345678,
山田花子様,〒830-0033 福岡県久留米市天神町5-15,0942-12-3456,2
山田 花子,久留米市天神町5-15,,1
佐藤健一郎,熊本県熊本市中央区水前寺3-8-12,096-123-4567,5`;

const PROCESS_STEPS = [
  { title: "名寄せ", desc: "同一人物の重複行を統合 (敬称/フリガナ違いを吸収)" },
  { title: "住所正規化", desc: "都道府県補完・丁目番地表記統一・郵便番号紐付け" },
  { title: "電話番号統一", desc: "ハイフン整形・桁数検証・国内/国際表記統一" },
  { title: "配送 CSV 変換", desc: "選択業者のフォーマットに自動マッピング" },
  { title: "送付状文面", desc: "顧客ごとにフォーマル/カジュアル の文章生成" },
];

// 公式 CSV 仕様 (各業者のドキュメントから引用)
const CARRIER_FORMATS: Record<Carrier, { name: string; columns: string[]; spec: string }> = {
  yamato: {
    name: "ヤマト運輸 B2 クラウド",
    spec: "発送伝票 (21 列)",
    columns: [
      "お客様管理番号", "送り状種別", "クール区分", "伝票番号", "出荷予定日", "お届け予定日",
      "配達時間帯", "お届け先電話番号", "お届け先郵便番号", "お届け先住所", "お届け先住所アパート名",
      "お届け先名", "お届け先名カナ", "敬称", "ご依頼主電話番号", "ご依頼主郵便番号",
      "ご依頼主住所", "ご依頼主名", "品名コード1", "品名1", "個数",
    ],
  },
  sagawa: {
    name: "佐川急便 e-飛伝 III",
    spec: "配送データ (11 列)",
    columns: [
      "お客様コード", "出荷予定日", "お届け先郵便番号", "お届け先住所1", "お届け先住所2",
      "お届け先名称1", "お届け先電話番号", "品名1", "個数", "元払着払区分", "代引区分",
    ],
  },
  yubin: {
    name: "日本郵便ゆうパック",
    spec: "差出データ (12 列)",
    columns: [
      "お問合せ番号", "お客様番号", "差出人氏名", "差出人郵便番号", "差出人住所", "差出人電話番号",
      "お届け先氏名", "お届け先郵便番号", "お届け先住所", "お届け先電話番号", "内容品", "個数",
    ],
  },
};

export default function ShippingFlowPage() {
  const demo = DEMOS["shipping-flow"];
  const [customerList, setCustomerList] = useState("");
  const [carrier, setCarrier] = useState<Carrier>("yamato");
  const [tone, setTone] = useState<Tone>("formal");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [copiedLetter, setCopiedLetter] = useState<number | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; bytes: number; rows: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
        // xlsx は dynamic import (バンドル軽量化)
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        // CSV 形式に変換 (1 シート目のみ)
        text = XLSX.utils.sheet_to_csv(sheet);
      } else {
        text = await file.text();
      }
      // BOM 除去
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

  const csvContent = useMemo(() => {
    const match = output.match(/```(?:csv)?\n([^`]*?)\n```/);
    return match?.[1]?.trim() ?? "";
  }, [output]);

  const letters = useMemo(() => {
    if (!output) return [] as { customer: string; body: string }[];
    const letterSection = output.split(/##\s+3\.\s*[^\n]*/)[1] ?? "";
    if (!letterSection) return [];
    const blocks = letterSection.split(/\n(?=###?\s+)/).filter((b) => /###?\s+/.test(b));
    return blocks.map((b) => {
      const m = b.match(/^###?\s+(.+)\n([\s\S]+)/);
      return { customer: (m?.[1] ?? "").trim(), body: (m?.[2] ?? "").trim() };
    }).filter((l) => l.customer && l.body);
  }, [output]);

  const handleDownloadCsv = () => {
    if (!csvContent) return;
    const carrierKey = { yamato: "yamato_b2", sagawa: "sagawa_ehiden", yubin: "yupack" }[carrier];
    const date = new Date().toISOString().slice(0, 10);
    const bom = "﻿";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${carrierKey}_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  const handleProcess = async () => {
    if (!customerList.trim() || isGenerating) return;
    setIsGenerating(true);
    setOutput("");
    setErrorMessage(null);
    setStepCount(0);

    const carrierSpec = CARRIER_FORMATS[carrier];
    const carrierLabel = carrierSpec.name;
    const toneLabel = tone === "formal" ? "フォーマル (法人取引向け)" : "カジュアル (個人客向け)";
    const columnsLine = carrierSpec.columns.join(",");

    const userMessage = `# 顧客名簿 (バラバラ・正規化前)
\`\`\`
${customerList}
\`\`\`

# 配送業者
carrier = ${carrier} (${carrierLabel} / ${carrierSpec.spec})

# 配送 CSV カラム仕様 (公式仕様、1 文字も変えない)
${columnsLine}

# 送付状トーン
${toneLabel}

# 出力 (Markdown)
1. 正規化サマリ (名寄せ判定根拠、補完件数、要確認件数)
2. ${carrierLabel} 用配送 CSV (上記公式カラム順厳守、コードブロック \`\`\`csv ～ \`\`\` で)
3. 送付状文面 (### 顧客名 で見出し、120-180 字 ${toneLabel} トーン)
4. 要確認事項 (欠損・矛盾)`;

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
              setOutput(accumulated);
              const matches = accumulated.match(/^##\s+\d+\./gm);
              setStepCount(Math.min(matches?.length ?? 0, 3));
            } else if (json.error) throw new Error(json.error);
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("API error")) throw e;
          }
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-3">
          <DemoHeader demoKey="shipping-flow" metrics={[
            { value: "月10h", label: "削減実績" },
            { value: "3業者", label: "CSV 自動変換" },
            { value: "送付状", label: "AI 文面生成" },
          ]} />
        </div>

        <section className="flex-1 min-h-0" style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}>
          <div className="flex items-stretch justify-center overflow-hidden">
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-stone-50 via-white to-stone-100" style={{ aspectRatio: "500 / 370", maxHeight: "100%", maxWidth: "min(100%, calc((100vh - 200px) * 500 / 370))", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div className="flex h-full flex-col bg-white/60 backdrop-blur-sm min-h-0 border-r border-stone-200/40">
                <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base">顧客名簿を貼り付け</h3>
                    <Badge tone="info" size="sm">形式バラバラ OK</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">配送業者</span>
                      <select value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)} disabled={isGenerating} className="w-full h-10 rounded-xl bg-[#faf9f6] neu-inset-sm px-3 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50">
                        <option value="yamato">ヤマト運輸</option>
                        <option value="sagawa">佐川急便</option>
                        <option value="yubin">日本郵便</option>
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
                      <span className="text-stone-600">📊 .xlsx / .xls / .csv / .tsv / .txt をドロップ or</span>
                      <button onClick={() => fileInputRef.current?.click()} disabled={isGenerating} className="text-[#fb6103] font-bold hover:underline">クリックして選択</button>
                    </div>
                    {fileInfo && (
                      <div className="mt-1 text-[10px] text-stone-600 flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">読込済</span>
                        <span className="truncate">{fileInfo.name}</span>
                        <span className="text-stone-400">{fileInfo.rows} 行</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={onPick} />
                  <Textarea value={customerList} onChange={(e) => setCustomerList(e.target.value)} rows={9} placeholder="名前, 住所, 電話番号, 個数 (順不同・形式バラバラで OK)" disabled={isGenerating} className="font-mono text-xs min-h-[140px]" />
                  <div className="rounded-lg bg-stone-50 border border-stone-200 px-2.5 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1">
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
                    {isGenerating ? "AI が処理中..." : "名寄せ・CSV・送付状 一気通貫"}
                  </Button>
                </div>
              </div>
              <div className="flex h-full flex-col bg-white/40 backdrop-blur-sm min-h-0">
                <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200/40 flex items-center justify-between">
                  <h3 className="font-display text-base">処理結果</h3>
                  <div className="flex gap-1.5">
                    <Badge tone="orange" size="sm">{{ yamato: "ヤマト", sagawa: "佐川", yubin: "郵便" }[carrier]}</Badge>
                    {stepCount > 0 && <Badge tone="success" size="sm">{stepCount} / 3 完了</Badge>}
                  </div>
                </div>
                {isGenerating && (
                  <div className="flex-shrink-0 px-5 py-2 bg-orange-50/80">
                    <div className="flex items-center gap-2 text-xs text-orange-700">
                      <div className="h-1.5 flex-1 bg-orange-200 rounded-full overflow-hidden"><div className="h-full bg-[#fb6103] animate-pulse" style={{ width: `${(stepCount / 3) * 100 || 30}%` }} /></div>
                      <span className="font-bold">{stepCount > 0 ? `${stepCount}/3 ステップ完了` : "名寄せ + 正規化 中..."}</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0 px-5 py-3 overflow-y-auto space-y-3">
                  {errorMessage && <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">{errorMessage}</div>}
                  {!output && <div className="rounded-xl neu-inset-sm p-8 text-center text-xs text-stone-400">顧客名簿を入力して処理ボタンを押してください</div>}
                  {csvContent && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-orange-700">配送 CSV 生成済</div>
                        <Button variant="primary" size="sm" onClick={handleDownloadCsv}>
                          .csv ダウンロード
                        </Button>
                      </div>
                      <pre className="max-h-24 overflow-auto bg-white/70 rounded-md p-2 text-[10px] font-mono text-stone-700 whitespace-pre">{csvContent}</pre>
                      <div className="mt-1.5 text-[10px] text-stone-600">{csvContent.split("\n").length - 1} 件 / {csvContent.split("\n")[0]?.split(",").length ?? 0} 列 / UTF-8 BOM 付</div>
                    </div>
                  )}
                  {letters.length > 0 && (
                    <div className="rounded-xl border border-stone-200 bg-white/70 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-2">送付状 ({letters.length} 件)</div>
                      <div className="space-y-2">
                        {letters.map((l, i) => (
                          <div key={i} className="rounded-lg bg-stone-50 px-3 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[11px] font-bold text-stone-800">{l.customer}</div>
                              <button onClick={() => copyLetter(i, l.body)} className="text-[10px] font-bold text-orange-700 hover:text-orange-900">
                                {copiedLetter === i ? "✓ コピー済" : "コピー"}
                              </button>
                            </div>
                            <div className="text-[11px] leading-relaxed text-stone-800 whitespace-pre-wrap">{l.body}</div>
                            <div className="mt-1 text-[9px] text-stone-400">{l.body.length} 文字</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {output && !csvContent && !letters.length && <MarkdownRenderer>{output}</MarkdownRenderer>}
                  {output && (csvContent || letters.length > 0) && (
                    <details className="rounded-xl bg-stone-50 px-3 py-2 text-[10px]">
                      <summary className="cursor-pointer font-bold text-stone-600">AI 全文 (Markdown)</summary>
                      <div className="mt-2"><MarkdownRenderer>{output}</MarkdownRenderer></div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">処理ステップ 5 段</h3>
              <ul className="space-y-2">
                {PROCESS_STEPS.map((s, i) => (
                  <li key={i} className="border-l-2 border-stone-300 pl-3">
                    <div className="font-bold text-xs text-stone-800">{i + 1}. {s.title}</div>
                    <div className="text-[11px] leading-relaxed text-stone-800 font-medium">{s.desc}</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">公式 CSV 仕様 (3 業者)</h3>
              <ul className="space-y-1.5">
                {Object.entries(CARRIER_FORMATS).map(([key, c]) => (
                  <li key={key} className={"text-[10px] leading-relaxed " + (key === carrier ? "border-l-2 border-[#fb6103] pl-2" : "pl-2 opacity-70")}>
                    <div className="font-bold text-stone-800">{c.name}</div>
                    <div className="text-stone-500">{c.spec} · {c.columns.length} 列</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">このデモの仕組み</div>
              <p className="text-[11px] leading-relaxed text-stone-800">{demo.description}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-stone-500">※ 本番では Excel/CSV アップロード対応、生成 CSV ダウンロード可。</p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
