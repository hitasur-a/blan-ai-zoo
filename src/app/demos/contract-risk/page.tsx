// ② 契約書リスクチェック - フクロウ担当
// 実 BLAN Risk Check (https://blan-risk-check.vercel.app/contract) を iframe で埋め込み

"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";

const RISK_CHECK_BASE =
  process.env.NEXT_PUBLIC_RISK_CHECK_URL ?? "https://blan-risk-check.vercel.app";
const CONTRACT_URL = `${RISK_CHECK_BASE}/contract`;

const HIGHLIGHT_POINTS = [
  { num: "全件", label: "件数を絞らない", desc: "重要度 [高/中/低] で階層化し漏らさず抽出" },
  { num: "根拠", label: "条文必須", desc: "民法 / 下請法 / 労基法 / 独禁法 など条文番号を併記" },
  { num: "立場", label: "ユーザー指定厳守", desc: "買い手 / 売り手 / 中立 を契約原文に左右されず固守" },
  { num: "PDF", label: "ドラッグ&ドロップ", desc: "pdf-parse でサーバー側抽出、~10MB まで対応" },
];

const SAMPLE_PROMPTS = [
  "業務委託契約書をドロップして買い手目線でチェック",
  "雇用契約書を売り手 (使用者) 目線で確認",
  "NDA を中立目線でレビュー",
  "外注先との契約で下請法上の問題箇所を洗う",
];

export default function ContractRiskPage() {
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
    if (iframeRef.current) iframeRef.current.src = CONTRACT_URL;
  };

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-3">
          <DemoHeader
            demoKey="contract-risk"
            metrics={[
              { value: "本番稼働", label: "Next.js 16 + Vercel" },
              { value: "全件抽出", label: "重要度 高/中/低 階層化" },
              { value: "PDF対応", label: "ドラッグ&ドロップ" },
            ]}
          />
        </div>

        <section
          className="flex-1 min-h-0"
          style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}
        >
          {/* メイン: BLAN Risk Check 本物の iframe */}
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
                    blan-risk-check.vercel.app/contract
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
                src={CONTRACT_URL}
                className="absolute left-0 right-0 bottom-0 w-full bg-white"
                style={{ top: 30, height: "calc(100% - 30px)", border: "none" }}
                title="BLAN Risk Check — 契約書"
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

          {/* 右カラム: 解説 + サンプル */}
          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm">BLAN Risk Check の見どころ</h3>
                <Badge tone="orange" size="sm">本番稼働中</Badge>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-stone-600">
                左の画面は <span className="font-bold text-stone-800">本物の BLAN Risk Check SaaS</span> (Vercel 本番) を埋め込み。Claude Sonnet 4.6 + サーバー側 PDF パース
              </p>
              <ul className="space-y-2">
                {HIGHLIGHT_POINTS.map((h) => (
                  <li key={h.label} className="flex items-start gap-2.5 border-l-2 border-amber-300 pl-3">
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
                技術スタック
              </div>
              <p className="text-[10px] leading-relaxed text-stone-700">
                Next.js 16 + Tailwind 4 (フロント) · Anthropic Claude Sonnet 4.6 (AI) · pdf-parse (PDF テキスト抽出) · Vercel (Edge + Node)
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                ※ 本サービスの出力は資格者 (弁護士・行政書士等) の最終確認のための「下書き」。最終判断は資格者が行います。
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
