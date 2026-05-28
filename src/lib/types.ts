// BLAN AI 動物園 - 型定義

// 5 動物 (業務領域・痛みグループ)
export type AnimalKey = "lion" | "cow" | "owl" | "mammoth" | "rabbit";

// 5 装飾語 (AI への姿勢・行動パターン)
export type DecoratorKey = "ohdoh" | "hatarakimono" | "kenja" | "monoshiri" | "kakeru";

// 「その他」= 個別相談ポイント (5タイプ外の関心)
export type DiagnosisFallback = "consult";

// AI 活用タイプ診断の結果
export interface DiagnosisResult {
  // メイン (最高得点)
  primaryAnimal: AnimalKey;
  primaryDecorator: DecoratorKey;
  // サブ (2 位、トップ + サブ表示用)
  subAnimal: AnimalKey | null;
  subDecorator: DecoratorKey | null;
  // 個別相談誘導 (Q5「その他」を選んでいる場合 true)
  needsConsult: boolean;
  // 内部スコア (動物軸 + 装飾語軸)
  animalScores: Record<AnimalKey, number>;
  decoratorScores: Record<DecoratorKey, number>;
  // 推薦デモ (動物軸で決定)
  recommendedDemos: DemoKey[];
}

// 8 デモ + セミナー専用 1 デモ
export type DemoKey =
  | "senpai-wanko" // ① 先輩わんこ
  | "contract-risk" // ② 契約書リスクチェック
  | "public-diff" // ③ 公的情報差分検知
  | "hojolog" // ④ HojoLog
  | "shipping-flow" // ⑤ 出荷業務 一気通貫
  | "skill-growth" // ⑥ AI スキル成長プラン
  | "property-copy" // A. 物件広告コピー量産
  | "explanation-risk" // B. 重説リスクチェック
  | "living-manual"; // セミナー専用: 生きるマニュアル (DEMO_KEYS には載せない=来場者一覧から非表示)

// 動物 → 担当デモのマッピング
export const ANIMAL_TO_DEMOS: Record<AnimalKey, DemoKey[]> = {
  lion: ["senpai-wanko", "skill-growth"],
  owl: ["contract-risk", "explanation-risk"],
  cow: ["shipping-flow", "skill-growth"],
  mammoth: ["public-diff", "hojolog"],
  rabbit: ["property-copy", "hojolog"],
};

// 設問の選択肢
export interface QuestionChoice {
  id: string;
  label: string;
  // 動物軸への重み (Q1-3 で使用)
  animalWeights?: Partial<Record<AnimalKey, number>>;
  // 装飾語軸への重み (Q4-5 で使用)
  decoratorWeights?: Partial<Record<DecoratorKey, number>>;
  // 個別相談ポイント (Q5 「その他」のみ true)
  isConsultTrigger?: boolean;
}

// 設問
export interface Question {
  id: string;
  axis: "animal" | "decorator"; // 動物軸 or 装飾語軸
  number: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  choices: QuestionChoice[];
}

// 体験ラダー (L1-L3 = 来場者リテラシー別)
export type LadderLevel = "L1" | "L2" | "L3";

// L1: 診断 → 動物タイプ結果 → 解説文 を見せる
// L2: L1 + 推薦デモ 1-2 個を実際に触る + スタッフ解説
// L3: L1 + L2 + 管理画面でライブ補正・プロンプト見せ + 内部ロジック説明
