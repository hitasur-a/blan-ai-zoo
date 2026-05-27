// BLAN AI 動物園 - 診断結果画面
// 動物 + 装飾語 (トップ + サブ) + 推薦デモ
// Q5 「その他」 = 個別相談誘導
// v2 トンマナ + Splash 装飾 + ニューモーフィズム

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QUESTIONS } from "@/data/questions";
import { ANIMALS } from "@/data/animals";
import { DECORATORS } from "@/data/decorators";
import { DEMOS } from "@/data/demos";
import { diagnose, type Answer } from "@/lib/diagnosis";
import type { DiagnosisResult } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { logAnalytics } from "@/lib/analytics";

export default function ResultPage() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("blan-ai-zoo-answers");
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const answers: Answer[] = JSON.parse(stored);
      const r = diagnose(answers, QUESTIONS);
      setResult(r);
      // 診断結果を analytics に記録 (boothのアンケート代わり本丸データ)
      logAnalytics({
        demoKey: "diagnose",
        kind: "result",
        payload: {
          answers,
          primaryAnimal: r.primaryAnimal,
          primaryDecorator: r.primaryDecorator,
          subAnimal: r.subAnimal,
          subDecorator: r.subDecorator,
          needsConsult: r.needsConsult,
          animalScores: r.animalScores,
          decoratorScores: r.decoratorScores,
          recommendedDemos: r.recommendedDemos,
        },
      });
    } catch {
      // 回答が壊れている
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="font-display text-sm tracking-widest text-stone-500">
          診断結果を計算中...
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-stone-900">
        <div className="text-center">
          <p className="mb-6 text-stone-600">診断結果が見つかりません</p>
          <Link href="/diagnose">
            <Button variant="primary" size="md">
              もう一度診断する
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 個別相談誘導
  if (result.needsConsult) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-paper text-stone-900">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute" style={{ right: "-15%", top: "-10%", width: "45%", height: "50%" }}>
            <Image
              src="/splash-blue.svg"
              alt=""
              aria-hidden
              width={800}
              height={800}
              className="splash-layer mix-blend-multiply opacity-25"
              style={{ "--delay": "0.3s" } as React.CSSProperties}
            />
          </div>
          <div className="absolute" style={{ left: "-12%", bottom: "-10%", width: "40%", height: "40%" }}>
            <Image
              src="/splash-pink.svg"
              alt=""
              aria-hidden
              width={600}
              height={600}
              className="splash-layer mix-blend-multiply opacity-20"
              style={{ "--delay": "0.5s" } as React.CSSProperties}
            />
          </div>
        </div>
        <main className="relative mx-auto max-w-3xl px-8 py-20">
          <Card variant="raised" padding="xl">
            <Badge tone="orange" size="sm">
              個別相談 をおすすめします
            </Badge>
            <h1 className="mt-6 font-display text-4xl leading-tight">
              御社の関心は デモ範囲を超えています
            </h1>
            <p className="mt-8 text-base leading-loose text-stone-700">
              経営判断・新規事業・資金繰りなど、5 動物のタイプ診断で扱う範囲を超える領域のご関心は、
              BLAN 代表との個別相談で深掘りするのが効率的です。
            </p>
            <div className="mt-10 flex gap-4">
              <Link href="/">
                <Button variant="secondary" size="md">
                  ポータルへ戻る
                </Button>
              </Link>
              <Link href="/diagnose">
                <Button variant="primary" size="md">
                  診断をやり直す
                </Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const primaryAnimal = ANIMALS[result.primaryAnimal];
  const primaryDecorator = DECORATORS[result.primaryDecorator];
  const subAnimal = result.subAnimal ? ANIMALS[result.subAnimal] : null;
  const subDecorator = result.subDecorator ? DECORATORS[result.subDecorator] : null;

  const primaryTypeName = `${primaryDecorator.name}${primaryAnimal.name}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper text-stone-900">
      {/* Splash 装飾 (結果画面、4 隅にバランス配置) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute" style={{ left: "-10%", top: "-8%", width: "38%", height: "40%" }}>
          <Image
            src="/splash-yellow.svg"
            alt=""
            aria-hidden
            width={800}
            height={800}
            className="splash-layer mix-blend-multiply opacity-25"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          />
        </div>
        <div className="absolute" style={{ right: "-12%", top: "10%", width: "38%", height: "42%" }}>
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
        <div className="absolute" style={{ left: "-12%", bottom: "-8%", width: "40%", height: "40%" }}>
          <Image
            src="/splash-pink.svg"
            alt=""
            aria-hidden
            width={600}
            height={600}
            className="splash-layer mix-blend-multiply opacity-20"
            style={{ "--delay": "0.5s" } as React.CSSProperties}
          />
        </div>
        <div className="absolute" style={{ right: "-8%", bottom: "-5%", width: "32%", height: "36%" }}>
          <Image
            src="/splash-yellow.svg"
            alt=""
            aria-hidden
            width={600}
            height={600}
            className="splash-layer mix-blend-multiply opacity-15"
            style={{ "--delay": "0.7s" } as React.CSSProperties}
          />
        </div>
      </div>

      <main className="relative mx-auto max-w-4xl px-8 py-12">
        <header className="mb-8">
          <Link href="/" className="text-xs font-bold tracking-widest text-stone-500 transition-colors hover:text-[#fb6103]">
            ← ポータル
          </Link>
        </header>

        {/* タイプ結果 (主役の最大演出、動物イラスト + テキスト 横並び + 装飾語の伝統色帯) */}
        <section className="mb-16">
          <div
            className="rounded-3xl bg-gradient-to-br from-[#fb6103] to-[#e25515] p-8 md:p-10 text-white shadow-[0_25px_60px_rgba(251,97,3,0.4)] relative overflow-hidden"
          >
            {/* 装飾語の伝統色アクセント (右下に控えめ、面積/不透明度ダウンで濁り回避) */}
            <div
              className="pointer-events-none absolute -right-32 -bottom-32 w-72 h-72 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: primaryDecorator.color }}
            />

            <div className="relative grid gap-8 md:grid-cols-[minmax(340px,_44%)_1fr] items-center">
              {/* 動物イラスト枠 (1:1) — 25 パターン。白枠廃止、繊細な ring で立体感のみ */}
              <div className="relative aspect-square rounded-2xl overflow-hidden ring-4 ring-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/animals/${primaryAnimal.key}_${primaryDecorator.key}.avif`}
                  alt={`${primaryDecorator.name}${primaryAnimal.name}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    // AVIF 非対応ブラウザ・配置漏れ時は PNG にフォールバック、それでもダメなら placeholder
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = "1";
                      img.src = `/animals/${primaryAnimal.key}_${primaryDecorator.key}.png`;
                    } else {
                      img.style.display = "none";
                      img.nextElementSibling?.classList.remove("hidden");
                    }
                  }}
                />
                <div className="hidden absolute inset-0 flex flex-col items-center justify-center text-center bg-white/15 backdrop-blur-sm">
                  <div className="font-display text-[10px] tracking-[0.3em] opacity-60">ILLUSTRATION</div>
                  <div className="mt-2 font-display text-5xl leading-none">{primaryAnimal.name}</div>
                  <div className="mt-2 text-[10px] opacity-70">納品待ち</div>
                </div>
              </div>

              {/* テキスト */}
              <div>
                <div className="font-bold text-sm tracking-[0.35em] uppercase opacity-95">
                  YOUR TYPE
                </div>
                {/* タイプ名: 装飾語 (= 伝統色) + 動物 (= 白) で 色分け */}
                <h1 className="mt-3 font-display text-5xl md:text-6xl leading-tight tracking-tight">
                  <span
                    className="inline-block px-2 rounded-md mr-1"
                    style={{
                      backgroundColor: primaryDecorator.colorSoft,
                      color: "#ffffff",
                      textShadow: `0 0 12px ${primaryDecorator.color}`,
                    }}
                  >
                    {primaryDecorator.name}
                  </span>
                  {primaryAnimal.name}
                </h1>
                <p className="mt-5 text-base leading-relaxed opacity-95">
                  {primaryAnimal.特徴1行}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-[11px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: primaryDecorator.color }}
                  />
                  <span className="opacity-90">{primaryDecorator.colorOrigin}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* サブタイプ (僅差時のみ) */}
        {(subAnimal || subDecorator) && (
          <section className="mb-12">
            <Card variant="flat" padding="md">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
                サブタイプ (僅差で出た 2 位)
              </div>
              <div className="font-display text-2xl">
                {subDecorator?.name ?? primaryDecorator.name}
                {subAnimal?.name ?? primaryAnimal.name}
              </div>
              <p className="mt-2 text-sm text-stone-600">
                {(subAnimal ?? primaryAnimal).特徴1行}
              </p>
            </Card>
          </section>
        )}

        {/* 詳細解説 (2 列) */}
        <section className="mb-12 grid gap-6 md:grid-cols-2">
          <Card variant="raised" padding="lg">
            <Badge tone="orange" size="sm">
              業務領域 / 痛みグループ
            </Badge>
            <h2 className="mt-4 font-display text-2xl">{primaryAnimal.領域}</h2>
            <dl className="mt-6 space-y-4 text-base">
              <div>
                <dt className="text-[11px] font-black uppercase tracking-widest text-[#fb6103] border-l-2 border-[#fb6103] pl-2">現状</dt>
                <dd className="mt-1.5 text-stone-800 leading-relaxed">{primaryAnimal.現状}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-widest text-[#fb6103] border-l-2 border-[#fb6103] pl-2">痛み</dt>
                <dd className="mt-1.5 text-stone-800 leading-relaxed">{primaryAnimal.痛み}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-widest text-[#fb6103] border-l-2 border-[#fb6103] pl-2">強み</dt>
                <dd className="mt-1.5 text-stone-800 leading-relaxed">{primaryAnimal.強み}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-widest text-[#fb6103] border-l-2 border-[#fb6103] pl-2">AI の方向</dt>
                <dd className="mt-1.5 text-stone-800 leading-relaxed">{primaryAnimal.AIの方向}</dd>
              </div>
            </dl>
          </Card>

          <Card variant="raised" padding="lg">
            <Badge tone="orange" size="sm">
              AI への姿勢
            </Badge>
            <h2 className="mt-4 font-display text-2xl">{primaryDecorator.name}</h2>
            <p className="mt-6 text-base leading-loose text-stone-800">
              {primaryDecorator.フレーバー文}
            </p>
          </Card>
        </section>

        {/* 推薦デモ */}
        <section className="mb-12">
          <h2 className="mb-6 font-display text-2xl">御社におすすめの AI 活用デモ</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {result.recommendedDemos.map((demoKey) => {
              const demo = DEMOS[demoKey];
              return (
                <Link key={demoKey} href={`/demos/${demoKey}`} className="group block">
                  <Card
                    variant="raised"
                    padding="lg"
                    className="transition-all duration-200 group-hover:translate-y-[-2px] group-active:translate-y-px"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-2xl text-[#fb6103]">
                        {demo.number}
                      </span>
                      <span className="text-base font-bold text-stone-900">{demo.name}</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-stone-600">{demo.oneLineSummary}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* アクション */}
        <footer className="flex items-center justify-between border-t border-stone-200/50 pt-6">
          <Link href="/diagnose">
            <Button variant="ghost" size="sm">
              もう一度診断する
            </Button>
          </Link>
          <Link href="/demos">
            <Button variant="secondary" size="md">
              全デモ一覧を見る
            </Button>
          </Link>
        </footer>
      </main>
    </div>
  );
}
