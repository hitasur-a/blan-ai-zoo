// 各デモ画面で共通利用するレイアウト要素
// 動物別アクセント色を反映、番号バッジ + 担当動物バナーを強化

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { DEMOS } from "@/data/demos";
import { ANIMALS } from "@/data/animals";
import type { DemoKey, AnimalKey } from "@/lib/types";

// 動物別のアクセント色 (担当動物バナー / 番号バッジに反映)
const ANIMAL_ACCENTS: Record<AnimalKey, { fg: string; bg: string; bgSoft: string; gradient: string }> = {
  lion: {
    fg: "#b45309", // amber-700
    bg: "#fbbf24", // amber-400
    bgSoft: "rgba(251, 191, 36, 0.15)",
    gradient: "from-amber-500 to-orange-700",
  },
  cow: {
    fg: "#44403c", // stone-700
    bg: "#a8a29e", // stone-400
    bgSoft: "rgba(168, 162, 158, 0.18)",
    gradient: "from-stone-600 to-stone-900",
  },
  owl: {
    fg: "#334155", // slate-700
    bg: "#64748b", // slate-500
    bgSoft: "rgba(100, 116, 139, 0.15)",
    gradient: "from-slate-600 to-slate-900",
  },
  mammoth: {
    fg: "#78350f", // amber-900
    bg: "#a16207", // yellow-700
    bgSoft: "rgba(120, 53, 15, 0.15)",
    gradient: "from-amber-700 to-stone-900",
  },
  rabbit: {
    fg: "#be185d", // pink-700
    bg: "#ec4899", // pink-500
    bgSoft: "rgba(236, 72, 153, 0.15)",
    gradient: "from-pink-500 to-rose-700",
  },
};

interface DemoMetric {
  /** 大きく出す数値・キーフレーズ (例: "30秒", "月10h", "9段階") */
  value: string;
  /** ラベル (例: "で抽出", "削減", "ステータス") */
  label: string;
}

interface DemoHeaderProps {
  demoKey: DemoKey;
  /** メトリクス (1-3 件、デモの強みを数値で訴求) */
  metrics?: DemoMetric[];
}

export function DemoHeader({ demoKey, metrics }: DemoHeaderProps) {
  const demo = DEMOS[demoKey];
  const animal = ANIMALS[demo.担当動物];
  const accent = ANIMAL_ACCENTS[demo.担当動物];

  return (
    <header className="mb-6">
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <Link href="/" className="transition-colors hover:text-[#fb6103]">
          ポータル
        </Link>
        <span className="text-stone-300">/</span>
        <Link href="/demos" className="transition-colors hover:text-[#fb6103]">
          デモ一覧
        </Link>
        <span className="text-stone-300">/</span>
        <span className="font-bold text-stone-700">{demo.name}</span>
      </div>

      {/* 上段: 番号バッジ + タイトル + 担当動物バナー */}
      <div className="mt-4 flex items-start gap-4 flex-wrap">
        {/* 番号バッジ (デモ別 SVG アイコン) */}
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl overflow-hidden shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/icons/demo-${demoKey}.svg`}
            alt={demo.name}
            className="w-full h-full"
          />
        </div>

        {/* タイトル + サマリ */}
        <div className="flex-1 min-w-[280px]">
          <h1 className="font-display font-bold text-2xl md:text-3xl leading-tight text-stone-900">
            {demo.name}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
            {demo.oneLineSummary}
          </p>
        </div>

        {/* 担当動物バナー — 白背景 + アクセント色 border */}
        <div
          className="flex-shrink-0 flex items-center gap-3 rounded-full px-4 py-2 bg-white border-2"
          style={{ borderColor: accent.fg + "40" }}
        >
          <Badge tone="orange" size="sm">担当</Badge>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base font-bold" style={{ color: accent.fg }}>
              {animal.name}
            </span>
            <span className="text-[11px] font-bold text-stone-800">{animal.領域}</span>
          </div>
        </div>
      </div>

      {/* 下段: メトリクス (横スクロール許可、wrap でも OK) */}
      {metrics && metrics.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {metrics.map((m, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-2 bg-white shadow-sm border-2 flex-shrink-0"
              style={{ borderColor: accent.fg + "60" }}
            >
              <div
                className="font-display text-xl leading-none font-black"
                style={{ color: accent.fg }}
              >
                {m.value}
              </div>
              <div className="mt-1 text-[11px] font-bold tracking-wider text-stone-800">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

export function DemoFooter() {
  return (
    <footer className="mt-12 flex items-center justify-between border-t border-stone-200/50 pt-6">
      <Link
        href="/demos"
        className="text-sm text-stone-600 transition-colors hover:text-[#fb6103]"
      >
        ← デモ一覧へ戻る
      </Link>
      <Link
        href="/"
        className="text-sm text-stone-600 transition-colors hover:text-[#fb6103]"
      >
        ポータルへ →
      </Link>
    </footer>
  );
}

interface DemoInfoBoxProps {
  description: string;
  note?: string;
}

export function DemoInfoBox({ description, note }: DemoInfoBoxProps) {
  return (
    <div className="mt-8 rounded-2xl neu-raised-sm p-6">
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
        このデモの仕組み
      </div>
      <p className="text-sm leading-relaxed text-stone-700">{description}</p>
      {note && <p className="mt-3 text-xs leading-relaxed text-stone-500">{note}</p>}
    </div>
  );
}

// 動物アクセント色は外からも参照可 (各デモで個別調整したい時用)
export { ANIMAL_ACCENTS };
