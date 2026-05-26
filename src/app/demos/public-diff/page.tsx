// ③ 公的情報の差分検知 - マンモス担当
// 実 GrantCompass (https://grants-compass.vercel.app/demo) を iframe で埋め込み
// J-Grants 公式 API + AI クローラー + ChatWidget が本物として動く

"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";

const GRANTS_DEMO_URL =
  process.env.NEXT_PUBLIC_GRANTS_DEMO_URL ?? "https://grants-compass.vercel.app/demo";

const HIGHLIGHT_POINTS = [
  { num: "公式", label: "J-Grants API", desc: "デジタル庁公開 API から補助金マスタを自動収集" },
  { num: "AI", label: "クロール", desc: "都道府県・自治体サイトを Playwright で巡回・AI 構造化" },
  { num: "296+", label: "案件 DB", desc: "本番 DB に 296 件の補助金 (公募中/終了済) を保持" },
  { num: "対話", label: "AI チャット", desc: "右下 ChatWidget で自社条件に合う案件を絞り込み" },
];

const SAMPLE_PROMPTS = [
  "中小企業向けで来月締切の補助金は?",
  "DX や IT 導入が対象の案件を一覧で",
  "福岡県の事業者が使える助成金はある?",
  "新規事業向け、最大 1000 万円以上の案件",
];

export default function PublicDiffPage() {
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
    if (iframeRef.current) iframeRef.current.src = GRANTS_DEMO_URL;
  };

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-3">
          <DemoHeader
            demoKey="public-diff"
            metrics={[
              { value: "本番稼働", label: "Vercel + Railway" },
              { value: "296件", label: "補助金 DB" },
              { value: "公式 + AI", label: "J-Grants + クロール" },
            ]}
          />
        </div>

        <section
          className="flex-1 min-h-0"
          style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}
        >
          {/* メイン: GrantCompass 本物の iframe */}
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
                    grants-compass.vercel.app/demo
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
                src={GRANTS_DEMO_URL}
                className="absolute left-0 right-0 bottom-0 w-full bg-white"
                style={{ top: 30, height: "calc(100% - 30px)", border: "none" }}
                title="GrantCompass Demo"
                allow="clipboard-read; clipboard-write"
              />

              {iframeStatus === "error" && (
                <div className="absolute inset-0 top-[30px] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
                  <div className="text-sm font-bold text-red-700 mb-2">GrantCompass 本番に接続できませんでした</div>
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

          {/* 右カラム: 解説 + サンプル質問 */}
          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm">GrantCompass の見どころ</h3>
                <Badge tone="orange" size="sm">本番稼働中</Badge>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-stone-600">
                左の画面は <span className="font-bold text-stone-800">本物の GrantCompass SaaS</span> (Vercel + Railway 本番稼働) を埋め込み。J-Grants 公式 API + AI クロールで集めた補助金 296 件のリアル DB に接続中
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
              <h3 className="mb-2 font-display text-sm">AI 対話のサンプル質問</h3>
              <p className="mb-2 text-[10px] leading-relaxed text-stone-600">
                左画面の右下 ChatWidget をタップして AI を起動 → 下記をコピペで試せます
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
                Vite + React 19 + Tailwind 4 (フロント) · FastAPI + PostgreSQL + pgvector (バック) · Playwright クローラー · Claude Haiku/Sonnet · Auth0 · Railway · Vercel
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                ※ 本番 SaaS は{" "}
                <a
                  href="https://grants-compass.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fb6103] hover:underline font-bold"
                >
                  grants-compass.vercel.app
                </a>
                。/demo は認証不要の閲覧専用デモビュー
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
