// BLAN AI 動物園 - ポータルトップ (スタッフコントロール)
// v2 トンマナ + ニューモーフィズム触覚 UX

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      {/* Splash 装飾 - 画面 4 隅にバランス配置 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* 左上 yellow */}
        <div
          className="absolute"
          style={{ left: "-12%", top: "-10%", width: "42%", height: "42%" }}
        >
          <Image
            src="/splash-yellow.svg"
            alt=""
            aria-hidden
            width={800}
            height={800}
            className="splash-layer mix-blend-multiply opacity-30"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          />
        </div>
        {/* 右上 blue */}
        <div
          className="absolute"
          style={{ right: "-12%", top: "0%", width: "38%", height: "42%" }}
        >
          <Image
            src="/splash-blue.svg"
            alt=""
            aria-hidden
            width={700}
            height={700}
            className="splash-layer mix-blend-multiply opacity-20"
            style={{ "--delay": "0.3s" } as React.CSSProperties}
          />
        </div>
        {/* 左下 pink */}
        <div
          className="absolute"
          style={{ left: "-10%", bottom: "-12%", width: "40%", height: "40%" }}
        >
          <Image
            src="/splash-pink.svg"
            alt=""
            aria-hidden
            width={600}
            height={600}
            className="splash-layer mix-blend-multiply opacity-25"
            style={{ "--delay": "0.5s" } as React.CSSProperties}
          />
        </div>
        {/* 右下 yellow (薄め) */}
        <div
          className="absolute"
          style={{ right: "-10%", bottom: "-8%", width: "36%", height: "36%" }}
        >
          <Image
            src="/splash-yellow.svg"
            alt=""
            aria-hidden
            width={600}
            height={600}
            className="splash-layer mix-blend-multiply opacity-18"
            style={{ "--delay": "0.7s" } as React.CSSProperties}
          />
        </div>
      </div>

      <main className="relative mx-auto max-w-5xl px-8 py-20">
        {/* ヘッダー (中央揃え) */}
        <header className="mb-16 text-center">
          <Badge tone="orange" size="sm">
            STAFF CONTROL
          </Badge>
          <h1 className="mt-6 font-display text-7xl leading-tight tracking-tight text-stone-900">
            BLAN AI 動物園
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-stone-600">
            来場者向け体験のスタッフ操作画面。診断主軸、デモは温度感に応じて個別選択。
          </p>
        </header>

        {/* メイン: 診断スタート */}
        <section className="mb-16">
          <Link href="/diagnose" className="group block">
            <div className="relative overflow-hidden rounded-3xl bg-[#fb6103] px-12 py-20 text-center text-white shadow-[0_20px_60px_rgba(251,97,3,0.4)] transition-all duration-300 group-hover:shadow-[0_30px_80px_rgba(251,97,3,0.55)] group-active:translate-y-px group-active:shadow-[0_15px_40px_rgba(251,97,3,0.45)]">
              <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
              <div className="relative">
                <div className="font-bold text-sm tracking-[0.35em] uppercase opacity-95">
                  START
                </div>
                <div className="mt-5 font-display text-6xl leading-tight">
                  AI タイプ診断を始める
                </div>
                <div className="mt-6 text-base leading-relaxed opacity-95">
                  5 問 / 約 2 分 — 5 動物 × 5 装飾語 = 25 通りのタイプ診断
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* サブ */}
        <section className="mb-12 flex items-center justify-center gap-8 text-sm">
          <Link
            href="/demos"
            className="text-stone-500 underline-offset-4 transition-colors hover:text-[#fb6103] hover:underline"
          >
            診断スキップしてデモ一覧へ
          </Link>
          <span className="text-stone-300">|</span>
          <Link
            href="/admin"
            className="text-stone-500 underline-offset-4 transition-colors hover:text-[#fb6103] hover:underline"
          >
            管理画面
          </Link>
        </section>

        <footer className="mt-16 text-center font-display text-xs tracking-[0.3em] text-stone-400">
          BLAN AI 動物園
          <span className="mx-3 opacity-50">·</span>
          R8 解決市場 ブース実演
        </footer>
      </main>
    </div>
  );
}
