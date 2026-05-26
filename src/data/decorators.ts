// BLAN AI 動物園 - 5 装飾語のマスタデータ
// 軸1 (AI への姿勢・行動パターン)
// 色は案B: 日本伝統色 (古代紫 / 山吹 / 藍 / 栗 / 緑青)
// 切替時は color 値だけ書き換えれば即反映

import type { DecoratorKey } from "@/lib/types";

export interface Decorator {
  key: DecoratorKey;
  name: string;
  AI姿勢: string;
  フレーバー文: string;
  /** 装飾語のアクセント色 (案B: 日本伝統色) */
  color: string;
  /** 同色の薄めバリエーション (10% 透過) - 背景帯用 */
  colorSoft: string;
  /** 色の由来説明 (結果画面で展開可能) */
  colorOrigin: string;
}

export const DECORATORS: Record<DecoratorKey, Decorator> = {
  ohdoh: {
    key: "ohdoh",
    name: "王道の",
    AI姿勢: "現場の経験値を尊重し、ベテランの判断を踏まえて慎重に進める",
    フレーバー文:
      "御社は 経験と勘 で経営判断を組み立てるスタイル。AI 導入も 「現場のベテランの納得感」 を最優先に、急がず一段ずつ積み上げるのが向いています",
    color: "#4D3B6E", // 古代紫 (こだいむらさき)
    colorSoft: "rgba(77, 59, 110, 0.1)",
    colorOrigin: "古代紫 — 高貴・伝統・神事の色",
  },
  hatarakimono: {
    key: "hatarakimono",
    name: "働き者の",
    AI姿勢: "とにかく目の前の作業を減らし、効率と速さを優先する",
    フレーバー文:
      "御社は 効率と速さ を一番大切にされるスタイル。AI 導入も 「すぐ作業時間が減る効果」 が見えるところから入ると、社内の納得感が早く醸成されます",
    color: "#D89500", // 山吹 (やまぶき)
    colorSoft: "rgba(216, 149, 0, 0.1)",
    colorOrigin: "山吹 — 勤勉・実りの色",
  },
  kenja: {
    key: "kenja",
    name: "賢者の",
    AI姿勢: "リスクを潰してから導入し、慎重さと確実性を重視する",
    フレーバー文:
      "御社は 慎重さと確実性 で意思決定するスタイル。AI 導入も 「リスクを潰してから本番」 のステップ運用が向いています。最初は小さく検証して、確信を持ってから広げるアプローチが効きます",
    color: "#1B5C8F", // 藍 (あい)
    colorSoft: "rgba(27, 92, 143, 0.1)",
    colorOrigin: "藍 — 深淵・知性の色",
  },
  monoshiri: {
    key: "monoshiri",
    name: "物知りな",
    AI姿勢: "データと事例を集めてから判断、情報の厚みを武器にする",
    フレーバー文:
      "御社は データと情報の厚み で意思決定するスタイル。AI 導入も 「自社の蓄積データを活かす」 アプローチが効きます。既に持っている情報資産を AI に学習させる方向で組み立てると強みが活きます",
    color: "#6B3F22", // 栗 (くり)
    colorSoft: "rgba(107, 63, 34, 0.1)",
    colorOrigin: "栗 — 古書・蓄積の色",
  },
  kakeru: {
    key: "kakeru",
    name: "駆ける",
    AI姿勢: "まず試して、ダメなら別を探す機動力と挑戦の姿勢",
    フレーバー文:
      "御社は 機動力と挑戦 で動くスタイル。AI 導入も 「とりあえず試して回す」 アプローチが向いています。完璧を待たずに走り出し、走りながら磨いていくスピード感が御社の強みと噛み合います",
    color: "#3FA66B", // 緑青 (ろくしょう)
    colorSoft: "rgba(63, 166, 107, 0.1)",
    colorOrigin: "緑青 — 若さ・機動の色",
  },
};

export const DECORATOR_KEYS: DecoratorKey[] = ["ohdoh", "hatarakimono", "kenja", "monoshiri", "kakeru"];
