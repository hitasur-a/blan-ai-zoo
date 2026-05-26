// BLAN AI 動物園 - 管理画面 (RAG / プロンプト調整 + L1-L3 ラダー切替)
// スタッフ操作専用、来場者には複製ディスプレイで表示しない

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-paper text-stone-900">
      <main className="mx-auto max-w-5xl px-8 py-12">
        <header className="mb-12">
          <Link
            href="/"
            className="text-xs font-bold tracking-widest text-stone-500 transition-colors hover:text-[#fb6103]"
          >
            ← ポータル
          </Link>
          <h1 className="mt-6 font-display text-5xl tracking-tight">管理画面</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            来場者の温度感に応じたライブ補正 + L1-L3 ラダー切替 + プロンプト/RAG 調整
          </p>
        </header>

        {/* L1-L3 ラダー切替 */}
        <Card variant="raised" padding="lg" className="mb-8">
          <h2 className="mb-2 font-display text-2xl">体験ラダー L1 - L3</h2>
          <p className="mb-6 text-sm text-stone-600">
            来場者のリテラシーに応じて見せる範囲を変える。
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="secondary" active size="lg" className="h-auto flex-col items-start py-5 px-6">
              <Badge tone="orange" size="sm">L1 基本</Badge>
              <span className="mt-3 text-base font-bold">診断 + 動物解説</span>
              <span className="mt-1 text-xs font-normal text-stone-500">AI 初心者・経営者向け</span>
            </Button>
            <Button variant="secondary" size="lg" className="h-auto flex-col items-start py-5 px-6">
              <Badge tone="neutral" size="sm">L2 中級</Badge>
              <span className="mt-3 text-base font-bold">+ 推薦デモ体験</span>
              <span className="mt-1 text-xs font-normal text-stone-500">AI 興味あり層向け</span>
            </Button>
            <Button variant="secondary" size="lg" className="h-auto flex-col items-start py-5 px-6">
              <Badge tone="neutral" size="sm">L3 上級</Badge>
              <span className="mt-3 text-base font-bold">+ ライブ補正・プロンプト見せ</span>
              <span className="mt-1 text-xs font-normal text-stone-500">IT 部門・AI 詳しい層向け</span>
            </Button>
          </div>
        </Card>

        {/* プロンプト編集 */}
        <Card variant="raised" padding="lg" className="mb-8">
          <h2 className="mb-2 font-display text-2xl">プロンプト調整</h2>
          <p className="mb-6 text-sm text-stone-600">
            来場者の発話に応じて、その場でプロンプトに 1 文追加できる。リセット可。
          </p>
          <Textarea
            rows={8}
            placeholder="ここにシステムプロンプトの追加分を入力..."
            hint="編集中は確認モーダルが出ます (誤操作防止の緩衝材)"
          />
          <div className="mt-4 flex gap-3">
            <Button variant="primary" size="md">
              反映 (来場者画面に即時反映)
            </Button>
            <Button variant="secondary" size="md">
              デフォルトに戻す
            </Button>
          </div>
        </Card>

        {/* RAG ソース */}
        <Card variant="raised" padding="lg" className="mb-8">
          <h2 className="mb-2 font-display text-2xl">RAG ソース切替</h2>
          <p className="mb-6 text-sm text-stone-600">
            来場者の業種に応じて、参照する公開資料プリセットを切り替える。
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "中小企業庁・経産省 公開資料 (デフォルト)",
              "厚労省 労働基準法 / 安全衛生法",
              "国税庁 法人税法 / 通達",
              "宅建業法・公正競争規約 (不動産業向け)",
              "建設業法・下請法 (建設業向け)",
              "+ カスタム アップロード",
            ].map((preset, i) => (
              <Button
                key={preset}
                variant="secondary"
                active={i === 0}
                size="md"
                className="h-auto justify-start py-4 text-left text-sm"
              >
                {preset}
              </Button>
            ))}
          </div>
        </Card>

        <footer className="text-center text-xs text-stone-400">
          管理画面 UI 枠組み — ライブ補正の動作実装は次フェーズ
        </footer>
      </main>
    </div>
  );
}
