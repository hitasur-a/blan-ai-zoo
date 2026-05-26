// BLAN AI 動物園 - 診断ロジック
// 5 問の選択肢から 動物軸 + 装飾語軸 のスコアを算出
// トップ + サブ (2位) を判定、推薦デモを出す

import type {
  AnimalKey,
  DecoratorKey,
  DiagnosisResult,
  Question,
  QuestionChoice,
} from "@/lib/types";
import { ANIMAL_KEYS } from "@/data/animals";
import { DECORATOR_KEYS } from "@/data/decorators";
import { ANIMAL_TO_DEMOS } from "@/lib/types";

// 1 回答 = { questionId: string, choiceId: string }
export interface Answer {
  questionId: string;
  choiceId: string;
}

/**
 * 5 問の回答から診断結果を算出
 *
 * @param answers ユーザーの回答 (5 件)
 * @param questions 設問データ
 * @returns DiagnosisResult (主+副 動物・装飾語、推薦デモ、相談誘導フラグ)
 */
export function diagnose(answers: Answer[], questions: Question[]): DiagnosisResult {
  // 軸別スコア初期化
  const animalScores: Record<AnimalKey, number> = {
    lion: 0,
    cow: 0,
    owl: 0,
    mammoth: 0,
    rabbit: 0,
  };
  const decoratorScores: Record<DecoratorKey, number> = {
    ohdoh: 0,
    hatarakimono: 0,
    kenja: 0,
    monoshiri: 0,
    kakeru: 0,
  };

  let needsConsult = false;

  // 各回答を集計
  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) continue;
    const choice: QuestionChoice | undefined = question.choices.find(
      (c) => c.id === answer.choiceId
    );
    if (!choice) continue;

    // 「その他」 = 個別相談誘導フラグ
    if (choice.isConsultTrigger) {
      needsConsult = true;
      continue;
    }

    // 動物軸への重み加算
    if (choice.animalWeights) {
      for (const [key, weight] of Object.entries(choice.animalWeights) as [AnimalKey, number][]) {
        animalScores[key] += weight;
      }
    }

    // 装飾語軸への重み加算
    if (choice.decoratorWeights) {
      for (const [key, weight] of Object.entries(choice.decoratorWeights) as [DecoratorKey, number][]) {
        decoratorScores[key] += weight;
      }
    }
  }

  // 動物軸: 最高得点 + 2位
  const animalRanked = ANIMAL_KEYS.slice().sort(
    (a, b) => animalScores[b] - animalScores[a]
  );
  const primaryAnimal = animalRanked[0];
  // 2位が 1位と僅差 (1点以内) なら sub に。差が大きければ sub なし
  const subAnimal: AnimalKey | null =
    animalScores[animalRanked[0]] - animalScores[animalRanked[1]] <= 1 && animalScores[animalRanked[1]] > 0
      ? animalRanked[1]
      : null;

  // 装飾語軸: 最高得点 + 2位
  const decoratorRanked = DECORATOR_KEYS.slice().sort(
    (a, b) => decoratorScores[b] - decoratorScores[a]
  );
  const primaryDecorator = decoratorRanked[0];
  const subDecorator: DecoratorKey | null =
    decoratorScores[decoratorRanked[0]] - decoratorScores[decoratorRanked[1]] <= 1 && decoratorScores[decoratorRanked[1]] > 0
      ? decoratorRanked[1]
      : null;

  // 推薦デモ = 動物軸 (主 + 副) の担当デモを統合
  const recommendedDemos = [
    ...ANIMAL_TO_DEMOS[primaryAnimal],
    ...(subAnimal ? ANIMAL_TO_DEMOS[subAnimal] : []),
  ];
  // 重複削除
  const uniqueRecommendedDemos = Array.from(new Set(recommendedDemos));

  return {
    primaryAnimal,
    primaryDecorator,
    subAnimal,
    subDecorator,
    needsConsult,
    animalScores,
    decoratorScores,
    recommendedDemos: uniqueRecommendedDemos,
  };
}
