// ④ HojoLog 補助金プロジェクト管理 - マンモス担当
// 実 HojoLog (https://hojolog.vercel.app/demo/booth) を iframe で埋め込み
// 右下の SupportWidget (RAG AI) は iframe 内で動作

"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";

// 本番 URL (Vercel デプロイ済み)。ローカル検証時は環境変数で差替可能。
const HOJOLOG_BOOTH_URL =
  process.env.NEXT_PUBLIC_HOJOLOG_BOOTH_URL ?? "https://hojolog.vercel.app/demo/booth";

const HIGHLIGHT_POINTS = [
  { num: "9", label: "段階ステータス", desc: "申請準備 → 終了まで案件を一元管理" },
  { num: "11×11", label: "経費 × 証憑", desc: "区分ごとに必要書類を自動コンプリート判定" },
  { num: "8", label: "種の期限", desc: "公募/交付/中間/実績 を自動通知 (メール/LINE)" },
  { num: "RAG", label: "補助 AI", desc: "右下のチャットは Supabase + ベクトル検索内蔵" },
];

const SAMPLE_PROMPTS = [
  "ものづくり補助金の必要書類は?",
  "書類不備が出てる経費の対処法は?",
  "中間報告で確認されるポイントは?",
  "ISO 監査で HojoLog はどう使える?",
];

export default function HojoLogPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeStatus, setIframeStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = setTimeout(() => {
      if (iframeStatus === "loading") setIframeStatus("error");
    }, 15000);
    const onLoad = () => {
      setIframeStatus("loaded");
      setLoadTimeMs(Math.round(performance.now() - startedAt));
    };
    const iframe = iframeRef.current;
    iframe?.addEventListener("load", onLoad);
    return () => {
      clearTimeout(timer);
      iframe?.removeEventListener("load", onLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    setIframeStatus("loading");
    setLoadTimeMs(null);
    if (iframeRef.current) iframeRef.current.src = HOJOLOG_BOOTH_URL;
  };

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-3">
          <DemoHeader
            demoKey="hojolog"
            metrics={[
              { value: "本番稼働", label: "Next.js 16 + Supabase" },
              { value: "11×11", label: "経費 × 証憑 自動判定" },
              { value: "RAG AI", label: "右下のチャット内蔵" },
            ]}
          />
        </div>

        <section
          className="flex-1 min-h-0"
          style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}
        >
          {/* メイン: HojoLog 本物の iframe */}
          <div className="flex items-center justify-center overflow-hidden">
            <div
              className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-100 via-white to-slate-50"
              style={{
                aspectRatio: "500 / 370",
                maxHeight: "100%",
                maxWidth: "min(100%, calc((100vh - 200px) * 500 / 370))",
              }}
            >
              {/* iframe 上のステータスバー */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 bg-white/90 backdrop-blur-sm border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[10px] font-mono text-slate-500 truncate">
                    hojolog.vercel.app/demo/booth
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

              {/* iframe 本体 (chrome 分 24px をマイナス) */}
              <iframe
                ref={iframeRef}
                src={HOJOLOG_BOOTH_URL}
                className="absolute left-0 right-0 bottom-0 w-full bg-white"
                style={{ top: 30, height: "calc(100% - 30px)", border: "none" }}
                title="HojoLog Booth Demo"
                allow="clipboard-read; clipboard-write"
              />

              {iframeStatus === "error" && (
                <div className="absolute inset-0 top-[30px] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
                  <div className="text-sm font-bold text-red-700 mb-2">HojoLog 本番に接続できませんでした</div>
                  <button
                    onClick={reload}
                    className="rounded-full bg-main-deep text-white text-xs font-bold px-4 py-2 hover:opacity-90"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: 解説 + サンプル質問 */}
          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm">HojoLog の見どころ</h3>
                <Badge tone="orange" size="sm">本番稼働中</Badge>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-stone-600">
                左の画面は <span className="font-bold text-stone-800">本物の HojoLog SaaS</span> (Vercel 本番) を埋め込み。データは本番 DB のデモデータ。
              </p>
              <ul className="space-y-2">
                {HIGHLIGHT_POINTS.map((h) => (
                  <li key={h.label} className="flex items-start gap-2.5 border-l-2 border-slate-300 pl-3">
                    <div className="font-display text-lg leading-none text-stone-800 mt-0.5">{h.num}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-stone-800">{h.label}</div>
                      <div className="text-[10px] leading-relaxed text-stone-600">{h.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">補助 AI へのサンプル質問</h3>
              <p className="mb-2 text-[10px] leading-relaxed text-stone-600">
                左画面の右下 <span className="font-bold">✦ ボタン</span> をタップして AI を起動 → 下記をコピペで試せます
              </p>
              <ul className="space-y-1.5">
                {SAMPLE_PROMPTS.map((p) => (
                  <li
                    key={p}
                    className="rounded-lg bg-stone-50 px-3 py-2 text-[10px] leading-relaxed text-stone-700 cursor-text select-text border border-stone-200 hover:border-amber-300 transition-colors"
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
                Next.js 16 App Router · Supabase (PostgreSQL + RLS + Storage) · Anthropic Claude API · Gemini Embedding · Vercel · LINE Messaging API
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                ※ ブース版は閲覧専用デモ画面 (操作はサイドバー無し)。実 SaaS は{" "}
                <a
                  href="https://hojolog.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fb6103] hover:underline font-bold"
                >
                  hojolog.vercel.app
                </a>
                。
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
