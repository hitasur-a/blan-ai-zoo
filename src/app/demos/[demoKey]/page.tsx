// BLAN AI 動物園 - 個別デモ画面 (動的ルート)
// 8 デモ それぞれの実演画面プレースホルダー
// 中身は各デモ別途実装、現状は枠組み + 共通レイアウト

import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMOS, type Demo } from "@/data/demos";
import { ANIMALS } from "@/data/animals";
import type { DemoKey } from "@/lib/types";

interface DemoPageProps {
  params: Promise<{ demoKey: string }>;
}

export default async function DemoPage({ params }: DemoPageProps) {
  const { demoKey } = await params;

  // デモキー検証
  const demo: Demo | undefined = DEMOS[demoKey as DemoKey];
  if (!demo) {
    notFound();
  }

  const animal = ANIMALS[demo.担当動物];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-5xl px-8 py-12">
        {/* ヘッダー */}
        <header className="mb-8">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <Link href="/" className="hover:text-stone-900">
              ポータルトップ
            </Link>
            <span>/</span>
            <Link href="/demos" className="hover:text-stone-900">
              デモ一覧
            </Link>
            <span>/</span>
            <span className="text-stone-700">{demo.name}</span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-orange-700">{demo.number}</span>
            <h1 className="text-3xl font-bold">{demo.name}</h1>
          </div>
          <p className="mt-3 text-base text-stone-700">{demo.oneLineSummary}</p>
        </header>

        {/* 担当動物 */}
        <section className="mb-8 rounded-xl border border-stone-200 bg-white p-5">
          <div className="text-xs tracking-widest text-stone-500">担当動物</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-lg font-bold text-orange-700">{animal.name}</span>
            <span className="text-sm text-stone-600">{animal.領域}</span>
          </div>
        </section>

        {/* デモ本体プレースホルダー */}
        <section className="mb-8 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-12 text-center">
          <div className="mb-3 text-xs tracking-widest text-stone-500">DEMO AREA</div>
          <h2 className="mb-3 text-xl font-semibold">{demo.name}</h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-600">
            {demo.description}
          </p>
          <div className="mt-8 rounded-lg bg-stone-100 p-4 text-xs text-stone-500">
            ※ このデモの実装は現在準備中です。当日までに作り込みます。
          </div>
        </section>

        {/* 戻る */}
        <footer className="flex items-center justify-between border-t border-stone-200 pt-6">
          <Link
            href="/demos"
            className="text-sm text-stone-600 transition hover:text-orange-700"
          >
            ← デモ一覧へ戻る
          </Link>
          <Link
            href="/"
            className="text-sm text-stone-600 transition hover:text-orange-700"
          >
            ポータルトップへ
          </Link>
        </footer>
      </main>
    </div>
  );
}
