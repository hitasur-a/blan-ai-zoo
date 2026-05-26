// BLAN AI 動物園 - 8 デモ 一覧画面
// ①〜⑧ 順 (DEMO_KEYS デフォルト) の押しやすいフラットボタン群
// 動物は タグ で表現

import Link from "next/link";
import Image from "next/image";
import { ANIMALS } from "@/data/animals";
import { DEMOS, DEMO_KEYS } from "@/data/demos";

export default function DemosPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-paper text-stone-900">
      {/* Splash 装飾 (右上 + 左下) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute" style={{ right: "-10%", top: "-8%", width: "35%", height: "38%" }}>
          <Image
            src="/splash-yellow.svg"
            alt=""
            aria-hidden
            width={600}
            height={600}
            className="splash-layer mix-blend-multiply opacity-20"
            style={{ "--delay": "0.2s" } as React.CSSProperties}
          />
        </div>
        <div className="absolute" style={{ left: "-8%", bottom: "10%", width: "32%", height: "35%" }}>
          <Image
            src="/splash-pink.svg"
            alt=""
            aria-hidden
            width={600}
            height={600}
            className="splash-layer mix-blend-multiply opacity-15"
            style={{ "--delay": "0.5s" } as React.CSSProperties}
          />
        </div>
      </div>

      <main className="relative mx-auto max-w-6xl px-8 py-16">
        <header className="mb-12">
          <Link
            href="/"
            className="text-xs font-bold tracking-widest text-stone-500 transition-colors hover:text-[#fb6103]"
          >
            ← ポータル
          </Link>
          <h1 className="mt-6 font-display font-bold text-5xl tracking-tight">
            AI 活用デモ 8 つ
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-800 max-w-2xl">
            気になる番号をタップして実際に触ってみてください。①〜⑥ がシミュレーション、A・B が不動産業向けデモです。
          </p>
        </header>

        {/* フラットな 8 ボタン (①〜⑧ 順)、動物タグ付き */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_KEYS.map((demoKey) => {
            const demo = DEMOS[demoKey];
            const animal = ANIMALS[demo.担当動物];
            return (
              <Link
                key={demoKey}
                href={`/demos/${demoKey}`}
                className="group block"
              >
                <div
                  className="h-full rounded-2xl bg-white border border-stone-200 p-6 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:border-[#fb6103] group-active:translate-y-0 flex flex-col"
                >
                  {/* 番号 (デカく目立つ) */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-display text-5xl leading-none text-[#fb6103]">
                      {demo.number}
                    </span>
                    {/* 動物タグ */}
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold tracking-wider text-stone-700 group-hover:bg-[#fb6103]/10 group-hover:text-[#fb6103] transition-colors">
                      {animal.name}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="mb-2 font-bold text-base leading-snug text-stone-900">
                    {demo.name}
                  </h2>

                  {/* 1 行サマリ */}
                  <p className="text-xs leading-relaxed text-stone-700 flex-1">
                    {demo.oneLineSummary}
                  </p>

                  {/* タップ誘導 */}
                  <div className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-stone-400 group-hover:text-[#fb6103] transition-colors">
                    タップで開く →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 動物 凡例 */}
        <div className="mt-12 rounded-2xl bg-white/60 backdrop-blur-sm border border-stone-200 p-6">
          <div className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-500">
            動物タグ凡例 (業務領域グループ)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            {Object.values(ANIMALS).map((a) => (
              <div key={a.key} className="flex flex-col gap-0.5">
                <div className="font-bold text-stone-900">{a.name}</div>
                <div className="text-xs text-stone-600">{a.領域}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
