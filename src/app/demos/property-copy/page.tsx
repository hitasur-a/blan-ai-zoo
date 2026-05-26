// A. 物件広告コピー量産 - ウサギ担当

"use client";

import { useMemo, useRef, useState } from "react";
import { DEMOS } from "@/data/demos";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";
import { cn } from "@/lib/utils";
import { logAnalytics } from "@/lib/analytics";

const MEDIA_TAGS = ["Suumo", "HOMES", "Instagram", "Twitter/X"];

const NG_EXPRESSIONS = [
  { word: "最高 / 最安 / 第一", reason: "最大級表現は根拠なしで NG (公正競争規約)" },
  { word: "閑静な住宅街", reason: "主観的・優良誤認のおそれ" },
  { word: "駅至近", reason: "「○分」 など客観表現が必要" },
  { word: "完全防音", reason: "誤解を与える断定 NG" },
  { word: "格安 / 激安", reason: "根拠提示が必要" },
];

const MEDIA_RULES = [
  { name: "Suumo", limit: "40-60字", tone: "信頼感・物件の魅力を端的に", min: 40, max: 60 },
  { name: "HOMES", limit: "25-35字", tone: "リスト表示で目を引く短文", min: 25, max: 35 },
  { name: "Instagram", limit: "50-80字+#3", tone: "ストーリーズ風・絵文字可", min: 50, max: 80 },
  { name: "Twitter / X", limit: "100-130字", tone: "拡散性・共感ポイント", min: 100, max: 130 },
];

const NG_PATTERNS = [
  { re: /(最高|最安|第一|ナンバーワン|No\.?1|業界一)/i, label: "最大級表現" },
  { re: /(閑静|抜群|完璧|完全防音)/, label: "主観/断定表現" },
  { re: /(駅至近|徒歩すぐ|駅前すぐ)/, label: "客観性なし" },
  { re: /(格安|激安|お買い得|破格)/, label: "根拠なし価格表現" },
  { re: /(絶対|必ず|間違いなく)/, label: "断定表現" },
];

function countLength(s: string): number {
  return Array.from(s.replace(/\s+/g, "")).length;
}

// Markdown 記号 (**bold** ## 等) をプレーンテキストに変換 (媒体ブロック表示・コピー用)
function stripMd(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^-{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface MediaBlock {
  rawTitle: string;
  rule: { name: string; min: number; max: number } | null;
  body: string;
}

const SAMPLE_PROPERTY = `福岡県久留米市東町 12-3
2LDK / 55㎡ / 築 8 年
月額 8.5 万円 (管理費別 4,000 円)
敷金 1 ヶ月 / 礼金 1 ヶ月
西鉄久留米駅 徒歩 7 分
ペット可 (小型犬・猫 1 匹まで)
南向きベランダ / システムキッチン / 浴室乾燥機
都市ガス / インターネット無料`;

export default function PropertyCopyPage() {
  const demo = DEMOS["property-copy"];
  const [propertyInfo, setPropertyInfo] = useState("");
  const [companyStyle, setCompanyStyle] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaCount, setMediaCount] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [pdfInfo, setPdfInfo] = useState<{ name: string; pages: number; bytes: number } | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pdf")) {
      setIsParsingPdf(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "PDF 解析失敗");
        setPropertyInfo(json.text ?? "");
        setPdfInfo({ name: json.filename, pages: json.pages, bytes: json.bytes });
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      } finally {
        setIsParsingPdf(false);
      }
      return;
    }
    if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type === "text/plain") {
      if (file.size > 2 * 1024 * 1024) { setErrorMessage("テキストは 2MB 以内"); return; }
      const t = await file.text();
      setPropertyInfo(t);
      setPdfInfo({ name: file.name, pages: 0, bytes: file.size });
      return;
    }
    setErrorMessage("対応形式: .pdf / .txt / .md");
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

  const mediaBlocks = useMemo<MediaBlock[]>(() => {
    if (!output) return [];
    const sections = output.split(/^##\s+/m).slice(1);
    return sections.map((s) => {
      const newline = s.indexOf("\n");
      const rawTitle = (newline >= 0 ? s.slice(0, newline) : s).trim();
      const body = (newline >= 0 ? s.slice(newline + 1) : "").trim();
      const rule = MEDIA_RULES.find((r) => rawTitle.toLowerCase().includes(r.name.toLowerCase().split(" ")[0])) ?? null;
      return { rawTitle, rule: rule ? { name: rule.name, min: rule.min, max: rule.max } : null, body };
    });
  }, [output]);

  const copy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      // ignore
    }
  };

  const handleGenerate = async () => {
    if (!propertyInfo.trim() || isGenerating) return;
    logAnalytics({
      demoKey: "property-copy",
      kind: "generate",
      payload: {
        propertyInfo: propertyInfo.slice(0, 2000),
        propertyInfoChars: propertyInfo.length,
        companyStyle: companyStyle.slice(0, 500),
        pdfFilename: pdfInfo?.name,
        pdfPages: pdfInfo?.pages,
      },
    });
    setIsGenerating(true);
    setOutput("");
    setErrorMessage(null);
    setMediaCount(0);

    const userMessage = `# 物件情報\n${propertyInfo}\n\n${companyStyle ? `# 弊社の言い回し\n${companyStyle}\n\n` : ""}# タスク\n以下の媒体別コピーを生成:\n\n## Suumo (物件詳細)\n40-60字、信頼感\n\n## HOMES (リスト)\n25-35字、目を引く\n\n## Instagram (ストーリーズ)\n50-80字、ハッシュタグ 3 つ、カジュアル\n\n## Twitter / X (タイムライン)\n100-130字、拡散性\n\n## 排除した NG 候補\n2-3 件、理由とともに`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoKey: "property-copy", messages: [{ role: "user", content: userMessage }] }),
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
              const matches = accumulated.match(/^##\s+/gm);
              setMediaCount(Math.min(matches?.length ?? 0, 4));
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
          <DemoHeader demoKey="property-copy" metrics={[
            { value: "4媒体", label: "一括生成" },
            { value: "数秒", label: "で量産" },
            { value: "NG表現", label: "自動排除" },
          ]} />
        </div>

        <section className="flex-1 min-h-0" style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}>
          <div className="flex items-stretch justify-center overflow-hidden">
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-pink-50 via-white to-rose-50" style={{ aspectRatio: "500 / 370", maxHeight: "100%", maxWidth: "min(100%, calc((100vh - 200px) * 500 / 370))", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div className="flex h-full flex-col bg-white/60 backdrop-blur-sm min-h-0 border-r border-stone-200/40">
                <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base">物件情報を入力</h3>
                    <Button variant="ghost" size="sm" onClick={() => setPropertyInfo(SAMPLE_PROPERTY)} disabled={isGenerating}>サンプル</Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {MEDIA_TAGS.map((m) => (
                      <span key={m} className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] tracking-wider text-pink-700">{m}</span>
                    ))}
                  </div>
                </div>
                <div
                  className="flex-1 min-h-0 px-5 py-3 overflow-y-auto space-y-3"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                >
                  <div className={`rounded-xl border-2 border-dashed transition-colors p-2.5 ${isDragging ? "border-pink-500 bg-pink-50" : "border-stone-200 bg-white/60"}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap text-[11px]">
                      <span className="text-stone-600">📄 PDF or .txt をドロップ、または</span>
                      <button onClick={() => fileInputRef.current?.click()} disabled={isGenerating || isParsingPdf} className="text-pink-700 font-bold hover:underline">クリックして選択</button>
                    </div>
                    {isParsingPdf && <div className="text-[10px] text-amber-700 mt-1">PDF 解析中...</div>}
                    {pdfInfo && (
                      <div className="text-[10px] text-stone-600 mt-1 flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">読込済</span>
                        <span className="truncate">{pdfInfo.name}</span>
                        {pdfInfo.pages > 0 && <span>({pdfInfo.pages}p)</span>}
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="hidden" onChange={onPick} />
                  <Textarea label="物件情報" value={propertyInfo} onChange={(e) => setPropertyInfo(e.target.value)} rows={8} placeholder={SAMPLE_PROPERTY} disabled={isGenerating} />
                  <Input label="弊社の言い回し (任意)" value={companyStyle} onChange={(e) => setCompanyStyle(e.target.value)} placeholder="例: 関西弁混じり、暖かい雰囲気" disabled={isGenerating} />
                </div>
                <div className="flex-shrink-0 px-5 pb-4 pt-2">
                  <Button variant="primary" size="md" onClick={handleGenerate} disabled={!propertyInfo.trim() || isGenerating} className="w-full">
                    {isGenerating ? "AI が生成中..." : "媒体別コピーを生成"}
                  </Button>
                </div>
              </div>
              <div className="flex h-full flex-col bg-white/40 backdrop-blur-sm min-h-0">
                <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200/40 flex items-center justify-between">
                  <h3 className="font-display text-base">媒体別 キャッチコピー</h3>
                  <div className="flex gap-1.5">
                    <Badge tone="orange" size="sm">4 媒体</Badge>
                    {mediaCount > 0 && <Badge tone="success" size="sm">{mediaCount} / 4 完成</Badge>}
                  </div>
                </div>
                {isGenerating && (
                  <div className="flex-shrink-0 px-5 py-2 bg-orange-50/80">
                    <div className="flex items-center gap-2 text-xs text-orange-700">
                      <div className="h-1.5 flex-1 bg-orange-200 rounded-full overflow-hidden"><div className="h-full bg-[#fb6103] animate-pulse" style={{ width: `${(mediaCount / 4) * 100 || 30}%` }} /></div>
                      <span className="font-bold">{mediaCount > 0 ? `${mediaCount}/4 媒体生成済` : "生成中..."}</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0 px-5 py-3 overflow-y-auto space-y-2.5">
                  {errorMessage && <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">{errorMessage}</div>}
                  {!output && <div className="rounded-xl neu-inset-sm p-8 text-center text-xs text-stone-400">物件情報を入力して 「媒体別コピーを生成」 を押してください</div>}
                  {mediaBlocks.map((b, i) => {
                    const isMedia = !!b.rule;
                    const cleanBody = stripMd(b.body);
                    const length = countLength(cleanBody);
                    const inRange = b.rule ? length >= b.rule.min && length <= b.rule.max : true;
                    const ngHits = NG_PATTERNS.filter((p) => p.re.test(cleanBody));
                    if (!isMedia) {
                      return (
                        <div key={i} className="rounded-xl bg-stone-50 px-3 py-2 text-[11px]">
                          <div className="font-bold text-stone-800 mb-1">{b.rawTitle}</div>
                          <div className="text-stone-800 whitespace-pre-wrap leading-relaxed">{cleanBody}</div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="rounded-xl border border-pink-200 bg-white/80 px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-stone-900">{b.rawTitle}</span>
                            <span className={cn("text-[10px] font-bold", inRange ? "text-emerald-700" : "text-amber-700")}>
                              {length} / {b.rule!.min}-{b.rule!.max}字
                            </span>
                          </div>
                          <button onClick={() => copy(i, cleanBody)} className="text-[10px] font-bold text-pink-700 hover:text-pink-900">
                            {copiedIdx === i ? "✓ コピー済" : "コピー"}
                          </button>
                        </div>
                        <div className="text-sm leading-relaxed text-stone-900 whitespace-pre-wrap">{cleanBody}</div>
                        {ngHits.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {ngHits.map((h, k) => (
                              <span key={k} className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">⚠ {h.label}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">媒体別ルール</h3>
              <ul className="space-y-2">
                {MEDIA_RULES.map((r) => (
                  <li key={r.name} className="border-l-2 border-pink-300 pl-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-sm text-stone-900">{r.name}</span>
                      <span className="text-[11px] font-bold text-pink-700">{r.limit}</span>
                    </div>
                    <div className="text-[11px] leading-relaxed text-stone-800">{r.tone}</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">自動排除 NG 表現</h3>
              <ul className="space-y-1.5">
                {NG_EXPRESSIONS.map((n, i) => (
                  <li key={i} className="text-[11px] leading-relaxed border-l-2 border-red-300 pl-2">
                    <span className="font-bold text-stone-900">{n.word}</span>
                    <span className="text-red-700"> — {n.reason}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <div className="text-[11px] font-bold uppercase tracking-widest text-stone-700 mb-1">このデモの仕組み</div>
              <p className="text-[11px] leading-relaxed text-stone-800">{demo.description}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-700">※ 宅建業法 32 条 + 公正競争規約 に基づき NG 表現を自動排除。</p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
