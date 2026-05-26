// B. 重要事項説明書リスクチェック - フクロウ担当 (不動産業向け)
// 実 BLAN Risk Check (https://blan-risk-check.vercel.app/explanation) を iframe で埋め込み

"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";

const RISK_CHECK_BASE =
  process.env.NEXT_PUBLIC_RISK_CHECK_URL ?? "https://blan-risk-check.vercel.app";
const EXPLANATION_URL = `${RISK_CHECK_BASE}/explanation`;

const HIGHLIGHT_POINTS = [
  { num: "全件", label: "件数を絞らない", desc: "重要度 [高/中/低] で階層化し漏らさず抽出" },
  { num: "35項目", label: "重説標準チェック", desc: "取引態様 / 法令制限 / 私道 / 瑕疵担保 等を内部知識として保持" },
  { num: "目線", label: "売主貸主デフォルト", desc: "ユーザー指定厳守、原文/ファイル名から勝手に切り替えない" },
  { num: "PDF", label: "ドラッグ&ドロップ", desc: "pdf-parse でサーバー側抽出、~10MB まで対応" },
];

const SAMPLE_PROMPTS = [
  "賃貸契約の重説を貸主目線でチェック",
  "売買契約書を売主目線で見落とし抽出",
  "事業用テナント契約を中立目線でレビュー",
  "原状回復・違約金特約のリスクを特定",
];

export default function ExplanationRiskPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeStatus, setIframeStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  useEffect(() => {
    const startedAt = performance.now();
    let loaded = false;
    const timer = setTimeout(() => {
      if (!loaded) setIframeStatus("error");
    }, 15000);
    const iframe = iframeRef.current;
    const onLoad = () => {
      loaded = true;
      clearTimeout(timer);
      setIframeStatus("loaded");
      setLoadTimeMs(Math.round(performance.now() - startedAt));
    };
    iframe?.addEventListener("load", onLoad);
    return () => {
      clearTimeout(timer);
      iframe?.removeEventListener("load", onLoad);
    };
  }, []);

  const reload = () => {
    setIframeStatus("loading");
    setLoadTimeMs(null);
    if (iframeRef.current) iframeRef.current.src = EXPLANATION_URL;
  };

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-3">
          <DemoHeader
            demoKey="explanation-risk"
            metrics={[
              { value: "本番稼働", label: "Next.js 16 + Vercel" },
              { value: "35項目", label: "重説チェック観点" },
              { value: "宅建業法", label: "35 条 / 37 条 準拠" },
            ]}
          />
        </div>

        <section
          className="flex-1 min-h-0"
          style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}
        >
          <div className="flex items-center justify-center overflow-hidden">
            <div
              className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-100 via-white to-slate-50"
              style={{
                aspectRatio: "500 / 370",
                maxHeight: "100%",
                maxWidth: "min(100%, calc((100vh - 200px) * 500 / 370))",
              }}
            >
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 bg-white/90 backdrop-blur-sm border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[10px] font-mono text-slate-500 truncate">
                    blan-risk-check.vercel.app/explanation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {iframeStatus === "loaded" && loadTimeMs != null && (
                    <span className="text-[9px] font-bold text-emerald-700">接続 {loadTimeMs}ms</span>
                  )}
                  {iframeStatus === "loading" && (
                    <span className="text-[9px] font-bold text-amber-700 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      接続中
                    </span>
                  )}
                  {iframeStatus === "error" && (
                    <button onClick={reload} className="text-[9px] font-bold text-red-700 hover:underline">
                      接続失敗・再試行
                    </button>
                  )}
                  <Badge tone="orange" size="sm">本物</Badge>
                </div>
              </div>

              <iframe
                ref={iframeRef}
                src={EXPLANATION_URL}
                className="absolute left-0 right-0 bottom-0 w-full bg-white"
                style={{ top: 30, height: "calc(100% - 30px)", border: "none" }}
                title="BLAN Risk Check — 重要事項説明書"
                allow="clipboard-read; clipboard-write"
              />

              {iframeStatus === "error" && (
                <div className="absolute inset-0 top-[30px] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
                  <div className="text-sm font-bold text-red-700 mb-2">BLAN Risk Check に接続できませんでした</div>
                  <button
                    onClick={reload}
                    className="rounded-full bg-stone-900 text-white text-xs font-bold px-4 py-2 hover:opacity-90"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm">BLAN Risk Check の見どころ</h3>
                <Badge tone="orange" size="sm">本番稼働中</Badge>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-stone-600">
                左の画面は <span className="font-bold text-stone-800">本物の BLAN Risk Check SaaS</span> (Vercel 本番) を埋め込み。重説特有の 35 項目観点を内部知識として保持
              </p>
              <ul className="space-y-2">
                {HIGHLIGHT_POINTS.map((h) => (
                  <li key={h.label} className="flex items-start gap-2.5 border-l-2 border-slate-400 pl-3">
                    <div className="font-display text-sm leading-none text-stone-800 mt-0.5 min-w-[40px]">{h.num}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-stone-800">{h.label}</div>
                      <div className="text-[10px] leading-relaxed text-stone-600">{h.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">体験シナリオ例</h3>
              <ul className="space-y-1.5">
                {SAMPLE_PROMPTS.map((p) => (
                  <li
                    key={p}
                    className="rounded-lg bg-stone-50 px-3 py-2 text-[10px] leading-relaxed text-stone-700 border border-stone-200"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">
                守る法令・ガイドライン
              </div>
              <p className="text-[10px] leading-relaxed text-stone-700">
                宅地建物取引業法 35 条・37 条 / 借地借家法 / 民法 (契約不適合責任) / 国交省「原状回復をめぐるトラブルとガイドライン」 / 公正競争規約 / 区分所有法
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                ※ 本サービスの出力は宅地建物取引士の最終確認のための「下書き」。最終判断は資格者が行います。
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
