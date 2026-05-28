// BLAN AI 動物園 - 8 デモのメタデータ
// 6 シミュレーション (①-⑥) + 不動産業向け 2 デモ (A. B.)

import type { DemoKey, AnimalKey } from "@/lib/types";

export interface Demo {
  key: DemoKey;
  number: string; // 表示用番号 (①, ②, A, B 等)
  name: string;
  oneLineSummary: string;
  description: string;
  担当動物: AnimalKey;
  カテゴリ: "シミュレーション" | "デモ"; // 内部分類
}

export const DEMOS: Record<DemoKey, Demo> = {
  "senpai-wanko": {
    key: "senpai-wanko",
    number: "①",
    name: "暗黙知のAI化 「先輩わんこ」",
    oneLineSummary: "ベテランの判断基準を AI に学習させ、新人がいつでも 「先輩」 に質問できる",
    description: "属人化解消の仕組み。ベテランの熟練判断を AI に学習させ、新人がチャットで質問するとベテラン口調で答えるシステム",
    担当動物: "lion",
    カテゴリ: "シミュレーション",
  },
  "contract-risk": {
    key: "contract-risk",
    number: "②",
    name: "契約書リスクチェック補助",
    oneLineSummary: "契約書 PDF から不利な条項を 30 秒で網羅",
    description: "専門資格者の確認業務を大幅短縮。買い手目線で見落としやすいリスク条項を網羅リスト化",
    担当動物: "owl",
    カテゴリ: "シミュレーション",
  },
  "public-diff": {
    key: "public-diff",
    number: "③",
    name: "公的情報の差分検知",
    oneLineSummary: "法改正・補助金・公的統計の変化を自動監視",
    description: "気づかなかった機会を逃さない独自検知システム。公開資料の更新を毎週チェックし、差分があれば通知",
    担当動物: "mammoth",
    カテゴリ: "シミュレーション",
  },
  hojolog: {
    key: "hojolog",
    number: "④",
    name: "HojoLog 補助金プロジェクト管理",
    oneLineSummary: "補助金の採択後〜実績報告を一元管理",
    description: "証憑・期限の抜け漏れ防止。ISO 監査等にも応用可。経費 11 種 × 証憑 11 種で証憑コンプリート判定を自動化",
    担当動物: "mammoth",
    カテゴリ: "シミュレーション",
  },
  "shipping-flow": {
    key: "shipping-flow",
    number: "⑤",
    name: "出荷業務の AI 一気通貫",
    oneLineSummary: "バラバラの顧客名簿を整理 → 各社配送 CSV へ変換 → 送付状文面まで同時生成",
    description: "月 10 時間カット。顧客名簿の正規化から、配送業者別 CSV 出力、送付状の文面までを一気通貫で自動化",
    担当動物: "cow",
    カテゴリ: "シミュレーション",
  },
  "skill-growth": {
    key: "skill-growth",
    number: "⑥",
    name: "個別社員 AI スキル成長プラン",
    oneLineSummary: "社員ごとに必要な AI スキル 7 つと 3 ヶ月学習プランを AI が生成",
    description: "教員免許保持の代表が設計。社員一人ひとりの強み・弱みに合わせてカスタム育成プランを AI が生成",
    担当動物: "lion",
    カテゴリ: "シミュレーション",
  },
  "property-copy": {
    key: "property-copy",
    number: "A",
    name: "物件広告コピー量産",
    oneLineSummary: "物件情報から Suumo / HOMES / SNS 媒体別のキャッチコピーを数秒で生成",
    description: "NG 表現 (「最高」「閑静」「駅至近」等) を排除し、貴社の言い回しに寄せる",
    担当動物: "rabbit",
    カテゴリ: "デモ",
  },
  "explanation-risk": {
    key: "explanation-risk",
    number: "B",
    name: "重要事項説明書リスクチェック補助",
    oneLineSummary: "重説 PDF から買主・借主目線で見落としやすいリスク条項を 30 秒で網羅リスト化",
    description: "宅建士の最終確認の 「下書き」 として業務時間を大幅短縮",
    担当動物: "owl",
    カテゴリ: "デモ",
  },
  // セミナー専用デモ (DEMO_KEYS には登録しない = 来場者一覧から非表示。/demos/living-manual に直 URL でアクセス)
  "living-manual": {
    key: "living-manual",
    number: "セ",
    name: "BLAN式 生きるマニュアル",
    oneLineSummary: "ベテランの違和感と新人の気づきが対話で交差し、マニュアルが育つ瞬間を体験",
    description: "セミナー専用デモ。題材を選び、新人の困りごとから初版マニュアルを生成 → ベテランからの違和感を反映して v2/v3 へ更新 → 履歴は追記ログに別ブロックで残す、二層構造のナラティブ共創",
    担当動物: "lion",
    カテゴリ: "シミュレーション",
  },
};

export const DEMO_KEYS: DemoKey[] = [
  "senpai-wanko",
  "contract-risk",
  "public-diff",
  "hojolog",
  "shipping-flow",
  "skill-growth",
  "property-copy",
  "explanation-risk",
];
