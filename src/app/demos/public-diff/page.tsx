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

const GRANTS_API_BASE =
  process.env.NEXT_PUBLIC_GRANTS_API_BASE ?? "https://grants-compass-production.up.railway.app";

const PRESET_TARGETS = [
  { label: "建設業 法改正", url: "https://www.mlit.go.jp/totikensangyo/", org: "国土交通省" },
  { label: "不動産業 業法改正", url: "https://www.mlit.go.jp/totikensangyo/const/sosei_const_tk1_000099.html", org: "国土交通省" },
  { label: "厚労省 労働法改正", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000164708.html", org: "厚生労働省" },
  { label: "国税庁 通達", url: "https://www.nta.go.jp/law/tsutatsu/", org: "国税庁" },
];

const AREAS = [
  "全国", "北海道", "東北", "関東", "東京都", "中部", "近畿", "中国", "四国", "九州", "福岡県",
];

const PAGE_TYPES = [
  { value: "list", label: "一覧ページ" },
  { value: "detail", label: "詳細ページ" },
];

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

  // URL 追加フォーム
  const [targetName, setTargetName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetOrg, setTargetOrg] = useState("");
  const [targetArea, setTargetArea] = useState("全国");
  const [targetPageType, setTargetPageType] = useState("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [lastTargetId, setLastTargetId] = useState<number | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);

  const submitTarget = async () => {
    if (!targetName.trim() || !targetUrl.trim() || !targetOrg.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitMsg(null);
    setLastTargetId(null);
    try {
      const res = await fetch(`${GRANTS_API_BASE}/api/admin/crawl-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetName,
          url: targetUrl,
          organization: targetOrg,
          area_name: targetArea,
          page_type: targetPageType,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `${res.status}`);
      setSubmitMsg({ kind: "ok", text: `登録完了 (id: ${json.id})` });
      setLastTargetId(json.id);
      setTargetName(""); setTargetUrl(""); setTargetOrg("");
    } catch (err) {
      setSubmitMsg({ kind: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerCrawl = async () => {
    if (isCrawling) return;
    setIsCrawling(true);
    setCrawlMsg(null);
    try {
      const res = await fetch(`${GRANTS_API_BASE}/api/admin/crawl/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setCrawlMsg("クロール開始 (バックグラウンド実行中)。完了まで 1-3 分。完了後、左 iframe をリロードすると新案件が出てきます");
    } catch (err) {
      setCrawlMsg(`クロール起動失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCrawling(false);
    }
  };

  const applyPreset = (p: { label: string; url: string; org: string }) => {
    setTargetName(p.label);
    setTargetUrl(p.url);
    setTargetOrg(p.org);
  };

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

            {/* 監視対象 URL 追加フォーム — Railway バックエンド POST /api/admin/crawl-targets に直接送信 */}
            <Card variant="raised" padding="md" className="flex-shrink-0 border-2 border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm">📡 監視対象 URL を追加</h3>
                <Badge tone="info" size="sm">建設業/不動産 拡張</Badge>
              </div>
              <p className="mb-2 text-[10px] leading-relaxed text-stone-600">
                法改正記事・通達・業界団体の URL を追加 → 次回クロールに含めて差分検知対象に
              </p>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex flex-wrap gap-1 mb-1">
                  {PRESET_TARGETS.map((p) => (
                    <button key={p.label} onClick={() => applyPreset(p)} disabled={isSubmitting} className="rounded-full bg-stone-100 hover:bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-stone-700">
                      {p.label}
                    </button>
                  ))}
                </div>
                <input value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="名称 (例: 建設業法改正 2026)" disabled={isSubmitting} className="w-full h-7 rounded border border-stone-200 px-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-400" />
                <input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="URL (https://...)" disabled={isSubmitting} className="w-full h-7 rounded border border-stone-200 px-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-400" />
                <input value={targetOrg} onChange={(e) => setTargetOrg(e.target.value)} placeholder="機関名 (例: 国土交通省)" disabled={isSubmitting} className="w-full h-7 rounded border border-stone-200 px-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-400" />
                <div className="grid grid-cols-2 gap-1.5">
                  <select value={targetArea} onChange={(e) => setTargetArea(e.target.value)} disabled={isSubmitting} className="h-7 rounded border border-stone-200 px-1.5 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={targetPageType} onChange={(e) => setTargetPageType(e.target.value)} disabled={isSubmitting} className="h-7 rounded border border-stone-200 px-1.5 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {PAGE_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <button onClick={submitTarget} disabled={!targetName.trim() || !targetUrl.trim() || !targetOrg.trim() || isSubmitting} className="w-full h-8 rounded-md bg-gradient-to-br from-[#fb6103] to-[#c54a02] text-white text-[10px] font-bold disabled:opacity-40 hover:shadow-md">
                  {isSubmitting ? "送信中..." : "クロール対象に追加 → Gemini AI で構造化"}
                </button>
                {submitMsg && (
                  <div className={submitMsg.kind === "ok" ? "rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] text-emerald-800" : "rounded bg-red-50 border border-red-200 px-2 py-1 text-[10px] text-red-700"}>
                    {submitMsg.text}
                  </div>
                )}
                {/* 登録後にクロール即実行 */}
                {lastTargetId != null && (
                  <button onClick={triggerCrawl} disabled={isCrawling} className="w-full h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                    {isCrawling ? "クロール起動中..." : "▶ 今すぐクロール実行 (Gemini で構造化)"}
                  </button>
                )}
                {crawlMsg && (
                  <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] text-amber-800 leading-relaxed">
                    {crawlMsg}
                  </div>
                )}
              </div>
              <details className="mt-2 text-[9px] text-stone-500">
                <summary className="cursor-pointer hover:text-stone-700">⚙ 仕組み (Gemini AI クローリング) + ユースケース</summary>
                <div className="mt-1 leading-relaxed space-y-1">
                  <p><strong>フロー:</strong></p>
                  <p>1. URL 登録 (上記フォーム) → <code>POST /api/admin/crawl-targets</code></p>
                  <p>2. クロール起動 (上記ボタン) → <code>POST /api/admin/crawl/run</code></p>
                  <p>3. Playwright で HTML 取得 → Gemini Flash で構造化 (補助金/法改正/通達/締切等を JSON 抽出)</p>
                  <p>4. PostgreSQL + pgvector に保存、類似度 0.3 以上で検索ヒット対象に</p>
                  <p>5. 左 iframe (`grants-compass.vercel.app/demo`) をリロード → 新案件が一覧に出てくる</p>
                  <p>6. ChatWidget が RAG で参照 → 「○○の最新法改正は?」で新規 URL の内容を答える</p>
                  <p><strong>ユースケース例 (建設業):</strong> 建設業法改正の国交省 URL を登録 → クロール → ChatWidget で「うちの工事業者に影響ある改正は?」と聞くと該当箇所抽出</p>
                </div>
              </details>
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
