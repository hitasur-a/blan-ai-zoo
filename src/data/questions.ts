// BLAN AI 動物園 - 5 問の設問データ
// Q1-Q3: 動物軸を判定 (業務領域)
// Q4-Q5: 装飾語軸を判定 (AI への姿勢)
// Q5 に「その他」= 個別相談ポイント を含む

import type { Question } from "@/lib/types";

export const QUESTIONS: Question[] = [
  {
    id: "Q1",
    axis: "animal",
    number: 1,
    prompt: "御社で 社員が 「時間使ってる」 と感じる業務は?",
    choices: [
      {
        id: "Q1-1",
        label: "同じような書類作り・データ入力",
        animalWeights: { cow: 3 },
      },
      {
        id: "Q1-2",
        label: "ベテランに聞き回って答えを探す",
        animalWeights: { lion: 2, mammoth: 2 },
      },
      {
        id: "Q1-3",
        label: "契約書・見積書のチェック確認",
        animalWeights: { owl: 3 },
      },
      {
        id: "Q1-4",
        label: "新規顧客の開拓・販促",
        animalWeights: { rabbit: 3 },
      },
    ],
  },
  {
    id: "Q2",
    axis: "animal",
    number: 2,
    prompt: "ベテランが引退したら 一番困ることは?",
    choices: [
      {
        id: "Q2-1",
        label: "判断基準が分からなくなる",
        animalWeights: { lion: 3, mammoth: 1 },
      },
      {
        id: "Q2-2",
        label: "過去の経緯・情報が辿れなくなる",
        animalWeights: { lion: 1, mammoth: 3 },
      },
      {
        id: "Q2-3",
        label: "専門知識のチェック能力が落ちる",
        animalWeights: { owl: 3 },
      },
      {
        id: "Q2-4",
        label: "営業の人脈が途絶える",
        animalWeights: { rabbit: 3 },
      },
    ],
  },
  {
    id: "Q3",
    axis: "animal",
    number: 3,
    prompt: "もし急に 1 人辞めたら、御社で一番困る人は?",
    choices: [
      {
        id: "Q3-1",
        label: "30 年級ベテランの熟練者",
        animalWeights: { lion: 3 },
      },
      {
        id: "Q3-2",
        label: "専門資格 (法務・会計) を持つ人",
        animalWeights: { owl: 3 },
      },
      {
        id: "Q3-3",
        label: "ルーティンを淡々と回す人",
        animalWeights: { cow: 3 },
      },
      {
        id: "Q3-4",
        label: "顧客の主担当者",
        animalWeights: { rabbit: 3 },
      },
      {
        id: "Q3-5",
        label: "情報整理・記録が得意な人",
        animalWeights: { mammoth: 3 },
      },
    ],
  },
  {
    id: "Q4",
    axis: "decorator",
    number: 4,
    prompt: "AI 導入を考える時、御社の姿勢は?",
    choices: [
      {
        id: "Q4-1",
        label: "現場のベテランの意見を聞いて 慎重に進める",
        decoratorWeights: { ohdoh: 3 },
      },
      {
        id: "Q4-2",
        label: "とにかく目の前の作業を 減らしたい",
        decoratorWeights: { hatarakimono: 3 },
      },
      {
        id: "Q4-3",
        label: "リスクを潰してから 導入したい",
        decoratorWeights: { kenja: 3 },
      },
      {
        id: "Q4-4",
        label: "データと事例を集めてから 判断する",
        decoratorWeights: { monoshiri: 3 },
      },
      {
        id: "Q4-5",
        label: "まず試して、ダメなら別を探す",
        decoratorWeights: { kakeru: 3 },
      },
    ],
  },
  {
    id: "Q5",
    axis: "decorator",
    number: 5,
    prompt: "経営の判断で 何を一番大切にしてる?",
    choices: [
      {
        id: "Q5-1",
        label: "経験と勘",
        decoratorWeights: { ohdoh: 3 },
      },
      {
        id: "Q5-2",
        label: "効率と速さ",
        decoratorWeights: { hatarakimono: 3 },
      },
      {
        id: "Q5-3",
        label: "慎重さと確実性",
        decoratorWeights: { kenja: 3 },
      },
      {
        id: "Q5-4",
        label: "データと情報の厚み",
        decoratorWeights: { monoshiri: 3 },
      },
      {
        id: "Q5-5",
        label: "機動力と挑戦",
        decoratorWeights: { kakeru: 3 },
      },
      {
        id: "Q5-6",
        label: "その他 (経営判断・新規事業・資金繰り など)",
        isConsultTrigger: true,
      },
    ],
  },
];
