// BLAN AI 動物園 - 8 デモ 一覧画面
// 動物別カテゴリ表示 (v2 トンマナ + ニューモーフィズム)

import Link from "next/link";
import Image from "next/image";
import { ANIMALS, ANIMAL_KEYS } from "@/data/animals";
import { DEMOS } from "@/data/demos";
import { ANIMAL_TO_DEMOS } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
          <h1 className="mt-6 font-display text-5xl tracking-tight">
            動物たちの活躍を見る
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-600 max-w-2xl">
            5 動物が それぞれ担当する 8 つの AI 活用デモ。気になる動物のデモから触ってみてください。
          </p>
        </header>

        <div className="space-y-8">
          {ANIMAL_KEYS.map((animalKey) => {
            const animal = ANIMALS[animalKey];
            const demoKeys = ANIMAL_TO_DEMOS[animalKey];
            return (
              <Card key={animalKey} variant="raised" padding="lg">
                <div className="mb-6 flex items-baseline gap-4">
                  <h2 className="font-display text-3xl text-[#fb6103]">
                    {animal.name}担当
                  </h2>
                  <Badge tone="orange" size="sm">
                    {animal.領域}
                  </Badge>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-stone-700">
                  {animal.特徴1行}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {demoKeys.map((demoKey) => {
                    const demo = DEMOS[demoKey];
                    return (
                      <Link key={demoKey} href={`/demos/${demoKey}`} className="group block">
                        <Card
                          variant="flat"
                          padding="md"
                          className="bg-white/60 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-[-2px] group-hover:shadow-lg group-active:translate-y-px"
                        >
                          <div className="mb-2 flex items-baseline gap-3">
                            <span className="font-display text-2xl text-[#fb6103]">
                              {demo.number}
                            </span>
                            <span className="text-base font-bold">{demo.name}</span>
                          </div>
                          <p className="text-sm leading-relaxed text-stone-600">
                            {demo.oneLineSummary}
                          </p>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
