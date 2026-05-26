// ⑥ 個別社員 AI スキル成長プラン - ライオン担当

"use client";

import { useState } from "react";
import { DEMOS } from "@/data/demos";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type GoalType = "ai-utilization" | "leadership" | "specialist";
const GOAL_LABELS: Record<GoalType, string> = {
  "ai-utilization": "AI 業務活用",
  leadership: "リーダーシップ",
  specialist: "専門性深化",
};

const SEVEN_AI_SKILLS = [
  { title: "プロンプト設計", desc: "目的・文脈・形式を構造化して伝える力" },
  { title: "業務応用", desc: "日常業務のどこに AI を差し込むかの判断" },
  { title: "出力の評価", desc: "ハルシネーション検出・事実確認・引用検証" },
  { title: "批判的検証", desc: "AI 出力を鵜呑みにせず複数視点で検証" },
  { title: "共創スキル", desc: "AI と対話しながらアイデアを磨く反復作業" },
  { title: "倫理 / コンプラ", desc: "個人情報・著作権・機密情報の取扱基準" },
  { title: "最新追跡", desc: "モデル進化・新機能・業界事例への感度" },
];

const PLAN_STRUCTURE = [
  "タイプ診断 (1 行で特性)",
  "必要な AI スキル 7 つ (優先度 高/中/低)",
  "3 ヶ月プラン (Week 1-12 をテーマ + タスク)",
  "評価軸 (定量 + 定性指標)",
  "担当役員からの推薦メッセージ",
];

const SAMPLE_PROFILE = {
  name: "山田 太郎",
  role: "営業職 / 入社 3 年目",
  years: "3 年",
  strengths: "お客様との関係構築が得意。新規開拓よりルート営業向き",
  weaknesses: "提案書作成に時間がかかる。データ分析が苦手",
};

export default function SkillGrowthPage() {
  const demo = DEMOS["skill-growth"];
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("ai-utilization");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sectionCount, setSectionCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const stripMarkdown = (text: string): string =>
    text
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^>\s+/gm, "")
      .replace(/^-{3,}\s*$/gm, "")
      .replace(/^\s*[-+*]\s+/gm, "・ ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const handleExport = () => {
    if (!output) return;
    const date = new Date().toISOString().slice(0, 10);
    const safeName = (name || "社員").replace(/[\\/:*?"<>|]/g, "_");
    const header = `${safeName} さん AI スキル成長プラン\n\n役職: ${role}\n経験: ${years || "未記入"}\n目指す方向: ${GOAL_LABELS[goalType]}\n生成日: ${date}\n\n--------------------\n\n`;
    const blob = new Blob([header + stripMarkdown(output)], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `growth_plan_${safeName}_${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(stripMarkdown(output));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleGenerate = async () => {
    if (!name.trim() || !role.trim() || isGenerating) return;
    setIsGenerating(true);
    setOutput("");
    setErrorMessage(null);
    setSectionCount(0);

    const goalLabel = {
      "ai-utilization": "AI 業務活用 (ChatGPT/Claude を日常業務で使いこなす)",
      leadership: "リーダーシップ (チームを引っ張る、部下育成)",
      specialist: "専門性深化 (特定領域のエキスパート化)",
    }[goalType];

    const userMessage = `# 対象社員プロフィール\n- 名前: ${name}\n- 役職: ${role}\n- 経験: ${years || "未記入"}\n- 強み: ${strengths || "未記入"}\n- 苦手: ${weaknesses || "未記入"}\n- 目指す方向: ${goalLabel}\n\n# タスク (Markdown)\n## 1. タイプ診断\n社員の特性を一言で\n\n## 2. 必要な AI スキル 7 つ\n優先度 [高/中/低]、各 80-100 文字\n\n## 3. 3 ヶ月学習プラン\nWeek 1-2 / 3-4 / 5-6 / 7-8 / 9-10 / 11-12\n\n## 4. 評価軸\n定量指標 + 定性指標\n\n## 5. 担当役員からの推薦メッセージ\n120-180 文字`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoKey: "skill-growth", messages: [{ role: "user", content: userMessage }] }),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice("data: ".length).trim();
          if (!payload) continue;
          try {
            const json = JSON.parse(payload);
            if (json.text) {
              accumulated += json.text;
              setOutput(accumulated);
              const matches = accumulated.match(/^##\s+\d+\./gm);
              setSectionCount(Math.min(matches?.length ?? 0, 5));
            } else if (json.error) throw new Error(json.error);
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("API error")) throw e;
          }
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const loadSample = () => {
    setName(SAMPLE_PROFILE.name);
    setRole(SAMPLE_PROFILE.role);
    setYears(SAMPLE_PROFILE.years);
    setStrengths(SAMPLE_PROFILE.strengths);
    setWeaknesses(SAMPLE_PROFILE.weaknesses);
  };

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-3">
          <DemoHeader demoKey="skill-growth" metrics={[
            { value: "3ヶ月", label: "学習プラン" },
            { value: "7スキル", label: "個別 AI スキル" },
            { value: "教員免許", label: "代表が設計" },
          ]} />
        </div>

        <section className="flex-1 min-h-0" style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "1.25rem", overflow: "hidden" }}>
          <div className="flex items-center justify-center overflow-hidden">
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50" style={{ aspectRatio: "500 / 370", maxHeight: "100%", maxWidth: "min(100%, calc((100vh - 200px) * 500 / 370))", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div className="flex h-full flex-col bg-white/60 backdrop-blur-sm min-h-0 border-r border-stone-200/40">
                <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200/40 flex items-center justify-between">
                  <h3 className="font-display text-base">対象社員プロフィール</h3>
                  <Button variant="ghost" size="sm" onClick={loadSample} disabled={isGenerating}>サンプル</Button>
                </div>
                <div className="flex-1 min-h-0 px-5 py-3 overflow-y-auto space-y-3">
                  <Input label="名前" value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" disabled={isGenerating} />
                  <Input label="役職 / 職種" value={role} onChange={(e) => setRole(e.target.value)} placeholder="営業職 / 入社 3 年目" disabled={isGenerating} />
                  <Input label="経験年数" value={years} onChange={(e) => setYears(e.target.value)} placeholder="3 年" disabled={isGenerating} />
                  <Textarea label="強み" value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} placeholder="お客様との関係構築が得意" disabled={isGenerating} />
                  <Textarea label="苦手分野" value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} rows={2} placeholder="提案書作成に時間がかかる" disabled={isGenerating} />
                  <div>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">目指す方向</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
                        <Button key={g} variant="secondary" active={goalType === g} size="sm" onClick={() => setGoalType(g)} disabled={isGenerating} className="text-[11px]">
                          {GOAL_LABELS[g]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 px-5 pb-4 pt-2">
                  <Button variant="primary" size="md" onClick={handleGenerate} disabled={!name.trim() || !role.trim() || isGenerating} className="w-full">
                    {isGenerating ? "AI が育成プラン生成中..." : "3 ヶ月学習プランを生成"}
                  </Button>
                </div>
              </div>
              <div className="flex h-full flex-col bg-white/40 backdrop-blur-sm min-h-0">
                <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200/40 flex items-center justify-between">
                  <h3 className="font-display text-base">3 ヶ月育成プラン</h3>
                  <div className="flex gap-1.5">
                    {name && <Badge tone="orange" size="sm">{name}</Badge>}
                    {sectionCount > 0 && <Badge tone="success" size="sm">{sectionCount} / 5 セクション</Badge>}
                  </div>
                </div>
                {output && !isGenerating && (
                  <div className="flex-shrink-0 px-5 py-2 flex items-center justify-end gap-2 border-b border-stone-200/40">
                    <button onClick={handleCopy} className="text-[10px] font-bold text-stone-700 hover:text-stone-900 rounded-full bg-white/80 px-3 py-1 border border-stone-200">
                      {copied ? "✓ コピー済" : "全文コピー"}
                    </button>
                    <button onClick={handleExport} className="text-[10px] font-bold text-orange-700 hover:text-orange-900 rounded-full bg-orange-50 px-3 py-1 border border-orange-200">
                      .txt で保存
                    </button>
                  </div>
                )}
                {isGenerating && (
                  <div className="flex-shrink-0 px-5 py-2 bg-orange-50/80">
                    <div className="flex items-center gap-2 text-xs text-orange-700">
                      <div className="h-1.5 flex-1 bg-orange-200 rounded-full overflow-hidden"><div className="h-full bg-[#fb6103] animate-pulse" style={{ width: `${(sectionCount / 5) * 100 || 25}%` }} /></div>
                      <span className="font-bold">{sectionCount > 0 ? `${sectionCount}/5 セクション完了` : "プロフィール解析中..."}</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0 px-5 py-4 overflow-y-auto">
                  {errorMessage && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">{errorMessage}</div>}
                  {output ? <MarkdownRenderer>{output}</MarkdownRenderer> : <div className="rounded-xl neu-inset-sm p-8 text-center text-xs text-stone-400">プロフィールを入力して 「3 ヶ月学習プランを生成」 を押してください</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            <Card variant="raised" padding="md" className="flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">必要な AI スキル 7 つ</h3>
              <p className="mb-3 text-[10px] leading-relaxed text-stone-600">教員免許保持代表が設計</p>
              <ul className="space-y-2">
                {SEVEN_AI_SKILLS.map((s, i) => (
                  <li key={i} className="border-l-2 border-amber-300 pl-3">
                    <div className="font-bold text-xs text-stone-800">{i + 1}. {s.title}</div>
                    <div className="text-[10px] leading-relaxed text-stone-600">{s.desc}</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <h3 className="mb-2 font-display text-sm">出力プラン 5 構成</h3>
              <ul className="space-y-1 text-[10px] leading-relaxed text-stone-700">
                {PLAN_STRUCTURE.map((p, i) => <li key={i}>{i + 1}. {p}</li>)}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">このデモの仕組み</div>
              <p className="text-[10px] leading-relaxed text-stone-700">{demo.description}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-stone-500">※ 本番では社員の過去レポート・評価・OKR を学習させ、精度向上。</p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
